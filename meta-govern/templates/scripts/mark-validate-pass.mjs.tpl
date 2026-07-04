#!/usr/bin/env node
// Success sentinel for `{{VALIDATE_COMMAND}}`. It is the FINAL `&&` step of the
// validate script, so it runs ONLY when quality + size-guard + docs guards + tests
// have all passed. track-workflow keys the Stop-gate's `lastValidate` off this
// file's mtime, so a FAILED validate — including one masked by an exit-0 wrapper
// like `{{VALIDATE_COMMAND}} || true` / `; cmd` — never advances the gate.
// (PostToolUse exposes no exit code, and fires only on exit 0, so command text
// alone cannot prove the gate passed.)
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.claude', 'tmp');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'last-validate-ok'), '');
