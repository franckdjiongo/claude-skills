"""Regression tests for hidden shell diagnostics, without private transcripts."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'analyze_session.py'
spec = importlib.util.spec_from_file_location('analyze_session', SCRIPT)
analyzer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analyzer)


def result(content, is_error=False):
    return {'type': 'user', 'message': {'content': [{
        'type': 'tool_result', 'content': content, 'is_error': is_error,
    }]}}


def codex_events(output):
    return [
        {'type': 'session_meta', 'timestamp': '2026-10-02T12:00:00Z',
         'payload': {'id': 'synthetic-session', 'originator': 'codex'}},
        {'type': 'response_item', 'timestamp': '2026-10-02T12:00:01Z',
         'payload': {'type': 'function_call', 'name': 'exec_command',
                     'call_id': 'call-1', 'arguments': json.dumps({'cmd': 'missing | cat'})}},
        {'type': 'response_item', 'timestamp': '2026-10-02T12:00:02Z',
         'payload': {'type': 'function_call_output', 'call_id': 'call-1', 'output': output}},
    ]


class MaskedShellErrors(unittest.TestCase):
    def test_supported_shell_diagnostics(self):
        for text in (
            'zsh:1: no matches found: --include=*.ts',
            '(eval):1: no matches found: *.ts',
            'zsh: command not found: timeout',
            '(eval): command not found: timeout',
            'bash: line 1: timeout: command not found',
            'sh: line 2: timeout: command not found',
        ):
            with self.subTest(diagnostic=text):
                patterns = analyzer.detect_retries_and_failures([result(text)])
                self.assertEqual(patterns['masked_shell_errors'], 1)
                self.assertEqual(patterns['tool_errors'], 0)
                self.assertEqual(patterns['bash_exit_nonzero'], 0)

    def test_one_count_per_result_not_per_diagnostic(self):
        patterns = analyzer.detect_retries_and_failures([result(
            'zsh:1: no matches found: *.ts\nzsh: command not found: timeout')])
        self.assertEqual(patterns['masked_shell_errors'], 1)

    def test_errors_already_reported_are_excluded(self):
        for text, flagged in (
            ('zsh: command not found: timeout', True),
            ('zsh: command not found: timeout\nExit code: 1', False),
            ('zsh: command not found: timeout\nExit code: 127', False),
            ('Process exited with code 2\nzsh:1: no matches found: *.ts', False),
        ):
            with self.subTest(flagged=flagged, diagnostic=text):
                patterns = analyzer.detect_retries_and_failures([result(text, flagged)])
                self.assertEqual(patterns['masked_shell_errors'], 0)

    def test_prose_and_source_hits_are_excluded(self):
        for text in (
            'The command not found message indicates a missing command.',
            'src/example.ts:10:zsh: command not found: timeout',
            'assert "zsh: command not found: timeout" in text',
            'zsh: command not foundry: this is prose',
        ):
            with self.subTest(text=text):
                self.assertEqual(analyzer.detect_retries_and_failures(
                    [result(text)])['masked_shell_errors'], 0)

    def test_separate_text_blocks_keep_line_boundaries(self):
        blocks = [{'type': 'text', 'text': 'ordinary output'},
                  {'type': 'text', 'text': 'zsh: command not found: timeout'}]
        self.assertEqual(analyzer.detect_retries_and_failures(
            [result(blocks)])['masked_shell_errors'], 1)

    def test_codex_native_and_json_wrapped_outputs(self):
        diagnostic = 'zsh: command not found: timeout'
        for output in (
            'Process exited with code 0\n' + diagnostic,
            json.dumps({'output': diagnostic, 'metadata': {'exit_code': 0}}),
        ):
            with self.subTest(wrapped=output.startswith('{')):
                report = analyzer.analyze_codex(codex_events(output), Path('synthetic.jsonl'))
                self.assertEqual(report['failure_patterns']['masked_shell_errors'], 1)
                self.assertEqual(report['failure_patterns']['tool_errors'], 0)
                self.assertEqual(report['failure_patterns']['bash_exit_nonzero'], 0)
                self.assertIn('masked_shell_errors: **1**', analyzer.render_markdown(report))

    def test_wrapped_exit_codes_exclude_every_explicit_nonzero(self):
        diagnostic = 'zsh: command not found: timeout'
        for fields in (
            {'exit_code': 127},
            {'metadata': {'exit_code': 127}},
            {'exit_code': 127, 'metadata': {'exit_code': 0}},
            {'exit_code': 0, 'metadata': {'exit_code': 127}},
            {'exit_code': True, 'metadata': {'exit_code': 127}},
            {'exit_code': 127, 'metadata': {'exit_code': True}},
        ):
            with self.subTest(fields=fields):
                wrapped = json.dumps({'output': diagnostic, **fields})
                self.assertFalse(analyzer._has_masked_shell_error(wrapped))
                self.assertEqual(analyzer.detect_retries_and_failures(
                    [result(wrapped)])['masked_shell_errors'], 0)

    def test_wrapped_boolean_exit_codes_are_not_numeric_failures(self):
        diagnostic = 'zsh: command not found: timeout'
        for fields in (
            {'exit_code': True},
            {'exit_code': False},
            {'metadata': {'exit_code': True}},
            {'metadata': {'exit_code': False}},
            {'exit_code': True, 'metadata': {'exit_code': 0}},
            {'exit_code': 0, 'metadata': {'exit_code': True}},
        ):
            with self.subTest(fields=fields):
                wrapped = json.dumps({'output': diagnostic, **fields})
                self.assertTrue(analyzer._has_masked_shell_error(wrapped))

    def test_claude_json_and_markdown_rendering(self):
        events = [result('zsh:1: no matches found: *.ts')]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'synthetic.jsonl'
            path.write_text('\n'.join(json.dumps(event) for event in events))
            report = analyzer.analyze(path)
        self.assertEqual(report['failure_patterns']['masked_shell_errors'], 1)
        self.assertIn('masked_shell_errors: **1**', analyzer.render_markdown(report))


if __name__ == '__main__':
    unittest.main()
