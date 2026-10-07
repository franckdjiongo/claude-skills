# cross-review

One Node script (no dependencies, Node 20+) that starts a fresh read-only reviewer from the OTHER model family on the diff `base...HEAD` and writes `review.json` itself. Source: audit 2026-10-04, section 10, V3 and Q6.

```
node scripts/cross-review/cross-review.mjs --repo <path> --base <ref> --direction <claude-reviews-codex|codex-reviews-claude> [--out review.json] [--model <name>] [--max-diff-bytes 200000] [--timeout-ms 600000]
node scripts/cross-review/cross-review.mjs <path> <ref> <direction>
```

| direction | reviewer process |
|---|---|
| `claude-reviews-codex` | `claude -p "<prompt>" --tools Read --strict-mcp-config --permission-mode manual --setting-sources '' --disallowedTools mcp__capture-unique__brain_search --json-schema <schema>` (the audited flags plus `--json-schema`) |
| `codex-reviews-claude` | `codex exec --sandbox read-only --ephemeral --ignore-rules --color never --cd <repo> --output-schema <file> --output-last-message <file> -` (prompt on stdin; flags checked against `codex exec --help`, codex-cli 0.160.0) |

The reviewer process writes nothing. The script computes the diff, embeds it in the prompt (truncated at `--max-diff-bytes`; the reviewer can `Read` the rest), validates the answer, and writes `review.json` atomically. An empty diff skips the reviewer and writes a clean review.

## review.json

```json
{
  "schema": "cross.review/1",
  "head": "<full sha of HEAD>",
  "base": "<full sha of merge-base(base, HEAD)>",
  "reviewer": "claude | codex (suffixed :<model> when --model is given)",
  "findings": [{ "file": "src/a.ts", "line": 12, "severity": "blocker|major|minor|nit", "claim": "...", "proof": "..." }]
}
```

`line` is the line in the HEAD version, 0 when not applicable. `blocker` and `major` are blocking.

## Exit codes

| code | meaning |
|---|---|
| 0 | review written, no blocking finding |
| 1 | review written, at least one `blocker` or `major` finding |
| 2 | usage or config error, or the reviewer failed or returned invalid JSON (no `review.json` is written, so a failed review can never read as a clean one) |

There is no retry: a failed reviewer run is reported once.

## Tests

```
node --test scripts/cross-review/cross-review.test.mjs     # or: bun test scripts
```

Tests stub the reviewer runner. They make no billed call. The Codex direction has not been run against the real CLI yet.
