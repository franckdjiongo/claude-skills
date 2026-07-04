#!/usr/bin/env node
/**
 * Quality-checks orchestrator for {{PROJECT_NAME}}.
 *
 * Usage:
 *   {{PACKAGE_MANAGER}} run quality:check                    # full scope, fail at HIGH
 *   {{PACKAGE_MANAGER}} run quality:check -- --scope staged  # only staged files
 *   {{PACKAGE_MANAGER}} run quality:check -- --json          # machine-readable
 *   {{PACKAGE_MANAGER}} run quality:check -- --check ts-any  # one check at a time
 *
 * Options:
 *   --scope full|staged|changed     Files to check (default: full).
 *                                   - full:    walk the whole repo (gitignore-aware)
 *                                   - staged:  `git diff --cached`
 *                                   - changed: `git diff origin/main...HEAD` (or master)
 *   --fail-level critical|high|medium|all
 *                                   Min severity that triggers exit 1 (default: high).
 *                                   CRITICAL always triggers exit 2 regardless.
 *   --json                          Emit JSON only (no human report).
 *   --check <id>                    Run only the named check (repeatable).
 *   --help                          Show usage.
 *
 * Exit codes:
 *   0 — clean (or only findings below the fail-level threshold)
 *   1 — findings at fail-level (or above)
 *   2 — CRITICAL findings present, OR script error
 */

// macOS hardening: PATH_PREFIX is re-exported here so any future subprocess
// invocation in this file can rely on `process.env.PATH` being well-formed,
// even when run from a husky hook or a non-login shell.
export const PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

import { allChecks } from './checks.mjs';
import {
  walkRepo,
  stagedFiles,
  changedFiles,
  setContentMode,
  exitCodeFor,
  projectDir,
  severityRank,
  SEVERITY_ORDER,
} from './lib.mjs';
import { formatHuman, formatFindingJson } from './format.mjs';

const VALID_SCOPES = new Set(['full', 'staged', 'changed', 'all']);
const VALID_FAIL_LEVELS = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'ALL']);

function parseArgs(argv) {
  const args = {
    scope: 'full',
    failLevel: 'HIGH',
    json: false,
    only: new Set(),
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--scope') {
      args.scope = String(argv[++i] || '').toLowerCase();
    } else if (a === '--fail-level') {
      args.failLevel = String(argv[++i] || '').toUpperCase();
    } else if (a === '--json') {
      args.json = true;
    } else if (a === '--check') {
      args.only.add(String(argv[++i] || ''));
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    } else if (a.startsWith('--')) {
      process.stderr.write(`Unknown flag: ${a}\n`);
      process.exit(2);
    }
  }
  if (args.scope === 'all') args.scope = 'full';
  if (args.failLevel === 'ALL') args.failLevel = 'LOW';
  if (!VALID_SCOPES.has(args.scope)) {
    process.stderr.write(`Invalid --scope: ${args.scope} (use full|staged|changed)\n`);
    process.exit(2);
  }
  if (!VALID_FAIL_LEVELS.has(args.failLevel)) {
    process.stderr.write(
      `Invalid --fail-level: ${args.failLevel} (use critical|high|medium|all)\n`,
    );
    process.exit(2);
  }
  return args;
}

function helpText() {
  return `Usage: {{PACKAGE_MANAGER}} run quality:check [-- options]

Options:
  --scope full|staged|changed     Files to check (default: full)
  --fail-level critical|high|medium|all
                                  Severity that triggers exit 1 (default: high)
  --json                          Emit JSON only
  --check <id>                    Run only the named check (repeatable)
  --help                          Show this help

Exit codes:
  0 = clean
  1 = findings at fail-level or above
  2 = CRITICAL findings present, or script error

Available checks:
${allChecks.map((c) => `  - ${c.id}`).join('\n')}
`;
}

function resolveFiles(scope) {
  switch (scope) {
    case 'staged':
      return stagedFiles();
    case 'changed':
      return changedFiles();
    case 'full':
    default:
      return walkRepo(projectDir());
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(helpText());
    process.exit(0);
  }

  // Staged scope must read the INDEXED content, not the working tree.
  if (args.scope === 'staged') setContentMode('index');

  const files = resolveFiles(args.scope);

  if ((args.scope === 'staged' || args.scope === 'changed') && files.length === 0) {
    if (args.json) {
      process.stdout.write(
        JSON.stringify({ scope: args.scope, findings: [], fileCount: 0 }) + '\n',
      );
    } else {
      process.stdout.write(`No ${args.scope} source files. Skipping quality gate.\n`);
    }
    process.exit(0);
  }

  const checksToRun =
    args.only.size > 0 ? allChecks.filter((c) => args.only.has(c.id)) : allChecks;

  if (args.only.size > 0 && checksToRun.length === 0) {
    process.stderr.write(
      `No matching checks for: ${[...args.only].join(', ')}\n` +
        `Available: ${allChecks.map((c) => c.id).join(', ')}\n`,
    );
    process.exit(2);
  }

  const findings = [];
  for (const check of checksToRun) {
    try {
      const result = check.run(files) || [];
      findings.push(...result);
    } catch (err) {
      findings.push({
        id: 'INTERNAL',
        severity: 'HIGH',
        file: `(check: ${check.id})`,
        line: null,
        message: `Check crashed: ${err.message}`,
      });
    }
  }

  // Sort: severity DESC (CRITICAL first), then file ASC, then line ASC.
  findings.sort((a, b) => {
    const sa = severityRank(a.severity);
    const sb = severityRank(b.severity);
    if (sa !== sb) return sa - sb;
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return (a.line || 0) - (b.line || 0);
  });

  if (args.json) {
    process.stdout.write(
      JSON.stringify(
        {
          scope: args.scope,
          failLevel: args.failLevel,
          checksRun: checksToRun.map((c) => c.id),
          fileCount: files.length,
          findings: findings.map(formatFindingJson),
          severityCounts: SEVERITY_ORDER.reduce((acc, sev) => {
            acc[sev] = findings.filter((f) => f.severity === sev).length;
            return acc;
          }, {}),
        },
        null,
        2,
      ) + '\n',
    );
  } else {
    process.stdout.write(formatHuman(findings, args.scope));
  }

  process.exit(exitCodeFor(findings, args.failLevel));
}

try {
  main();
} catch (err) {
  process.stderr.write(`quality-checks crashed: ${err.stack || err.message}\n`);
  process.exit(2);
}
