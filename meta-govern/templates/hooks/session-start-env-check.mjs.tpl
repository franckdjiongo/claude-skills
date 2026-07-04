#!/usr/bin/env node
// Template: templates/hooks/session-start-env-check.mjs.tpl
// Variables used:
//   {{PACKAGE_MANAGER}} — bun, npm, pnpm (added to required tools when known)
//
// SessionStart hook. Verifies required tools (node, git, {{PACKAGE_MANAGER}})
// and optional tools (bun, rg, fd, jq) are on PATH. 24h cache via
// .claude/tmp/last-env-check.json: skips if recent run succeeded. If any
// blocking-required tool is missing, returns additionalContext warning.
// Otherwise exits silently.

import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  readJsonStdin,
  writeJsonStdout,
  readJson,
  writeJson,
  tmpDir,
  PATH_PREFIX,
  writeLastHookOutput,
} from './lib/hook-utils.mjs';

const CACHE_PATH = path.join(tmpDir(), 'last-env-check.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const REQUIRED = ['node', 'git', '{{PACKAGE_MANAGER}}'].filter(Boolean);
const OPTIONAL = ['bun', 'rg', 'fd', 'jq'];

function which(bin) {
  try {
    const out = execSync(`command -v ${bin}`, {
      env: { ...process.env, PATH: `${PATH_PREFIX}:${process.env.PATH || ''}` },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

async function main() {
  await readJsonStdin();

  const cached = readJson(CACHE_PATH, null);
  if (cached && cached.checkedAt && Date.now() - cached.checkedAt < CACHE_TTL_MS && cached.ok) {
    process.exit(0);
  }

  const required = REQUIRED.map((bin) => ({ bin, path: which(bin) }));
  const optional = OPTIONAL.map((bin) => ({ bin, path: which(bin) }));
  const missingRequired = required.filter((t) => !t.path);

  const result = {
    checkedAt: Date.now(),
    ok: missingRequired.length === 0,
    required,
    optional,
  };
  writeJson(CACHE_PATH, result);
  writeLastHookOutput('session-start-env-check', result);

  if (missingRequired.length === 0) process.exit(0);

  const lines = [
    'ENVIRONMENT WARNING — required tool(s) not found on PATH.',
    `Missing: ${missingRequired.map((t) => t.bin).join(', ')}`,
    '',
    'Hooks prepend PATH:',
    `  ${PATH_PREFIX}`,
    '',
    'Install the missing tool(s) and re-open the session, or update the PATH_PREFIX in `.claude/hooks/lib/hook-utils.mjs`.',
  ];
  const missingOptional = optional.filter((t) => !t.path).map((t) => t.bin);
  if (missingOptional.length > 0) {
    lines.push('', `Optional tools also missing (non-blocking): ${missingOptional.join(', ')}.`);
  }

  writeJsonStdout({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: lines.join('\n') },
  });
  process.exit(0);
}

main().catch(() => process.exit(0));
