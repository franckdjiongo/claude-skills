#!/usr/bin/env node
/**
 * Risk-weighted commit sampler for {{PROJECT_NAME}}.
 *
 * Ranks the commits on `base..HEAD` by a risk score and prints the top-N as
 * markdown to stdout. The score rewards commits that touch high-risk paths and
 * large diffs, so a HUMAN reviewer reads the riskiest commits first on a long
 * branch. This is a SAMPLER, not a gate: it decides nothing, blocks nothing, and
 * writes only to stdout. Nobody's "done" depends on it.
 *
 *   score(commit) = Σ(tier weight of each touched file) × TIER_SCALE + diff lines
 *
 * Tiers come from `.claude/risk-tiers.json` (critique / standard / bas globs).
 * tierOf(path) is a pure function: first match in precedence critique -> bas ->
 * standard wins, default standard.
 *
 * Usage:
 *   node .claude/scripts/sample-review.mjs [--base <ref>] [--top <N>]
 *   base default: origin/main -> main -> origin/master -> master (first that resolves).
 *   top default:  5.
 *
 * Fail-soft: any git failure, a missing tiers file, or a parse error degrades to
 * a short markdown note and exit 0 — a sampler that can't sample is never a
 * blocker. All git runs via execFileSync with an args array (no shell).
 *
 * Exit codes: always 0 (informational).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PATH_PREFIX =
  '/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin';
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ''}`;

// Tier -> per-file weight. TIER_SCALE lifts the tier signal above raw diff size
// so one touched `critique` file still outranks a large but low-risk churn.
const TIER_WEIGHT = { critique: 5, standard: 2, bas: 1 };
const TIER_SCALE = 20;
const DEFAULT_TIERS = {
  critique: ['**/repositories/**', 'src/domain/**', '**/security/**', '.claude/hooks/**'],
  standard: ['src/**'],
  bas: ['**/assets/**', '**/*.css'],
};
// Precedence: the riskiest matching tier wins, so an overlap (a `.css` under
// `src/**`) resolves to `bas`, and `src/domain/**` beats the broad `src/**`.
const TIER_PRECEDENCE = ['critique', 'bas', 'standard'];

const GIT_ENV = { ...process.env, PATH: `${PATH_PREFIX}:${process.env.PATH || ''}` };

function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      env: GIT_ENV,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

// Repo root: harness anchor -> git toplevel -> cwd. Every read resolves against it.
const ROOT =
  process.env.CLAUDE_PROJECT_DIR ||
  (git(['rev-parse', '--show-toplevel'], process.cwd()) || '').trim() ||
  process.cwd();

// Compile a glob into a RegExp. `**` spans separators, `*` stops at one, `?` is a
// single non-separator char. Everything else is matched literally.
function globToRegExp(glob) {
  let re = '^';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++; // consume the slash after `**/`
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`${re}$`);
}

// Pure: classify a repo-relative path into a tier. Precedence critique -> bas ->
// standard; unmatched paths fall to standard (unknown code is treated as normal
// risk, never silently exempted). Extra keys in the tiers file (e.g. `_doc`) are
// ignored because only TIER_PRECEDENCE keys are consulted.
export function tierOf(relPath, tiers = DEFAULT_TIERS) {
  const p = String(relPath || '').split('\\').join('/');
  for (const tier of TIER_PRECEDENCE) {
    const globs = Array.isArray(tiers[tier]) ? tiers[tier] : [];
    if (globs.some((g) => globToRegExp(g).test(p))) return tier;
  }
  return 'standard';
}

function loadTiers() {
  try {
    const raw = readFileSync(path.join(ROOT, '.claude', 'risk-tiers.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : DEFAULT_TIERS;
  } catch {
    return DEFAULT_TIERS;
  }
}

function resolveBase(argBase) {
  if (argBase) return argBase;
  for (const ref of ['origin/main', 'main', 'origin/master', 'master']) {
    if (git(['rev-parse', '--verify', '--quiet', ref], ROOT) !== null) return ref;
  }
  return null;
}

// Files + added/deleted line totals for one commit, via numstat (binary files
// report `-` and count as 0 lines but still contribute their tier weight).
function commitStat(sha) {
  const out = git(['show', '--numstat', '--format=', '--no-renames', sha], ROOT);
  if (!out) return { files: [], diffLines: 0 };
  const files = [];
  let diffLines = 0;
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const added = Number(parts[0]) || 0;
    const deleted = Number(parts[1]) || 0;
    files.push(parts.slice(2).join('\t'));
    diffLines += added + deleted;
  }
  return { files, diffLines };
}

function scoreCommit(sha, tiers) {
  const { files, diffLines } = commitStat(sha);
  const counts = { critique: 0, standard: 0, bas: 0 };
  let tierWeight = 0;
  for (const f of files) {
    const t = tierOf(f, tiers);
    counts[t] += 1;
    tierWeight += TIER_WEIGHT[t] || TIER_WEIGHT.standard;
  }
  return {
    sha,
    shortSha: sha.slice(0, 8),
    subject: (git(['show', '-s', '--format=%s', sha], ROOT) || '').trim(),
    files: files.length,
    diffLines,
    counts,
    score: tierWeight * TIER_SCALE + diffLines,
  };
}

function note(lines) {
  process.stdout.write(`## Risk-weighted commit sample\n\n${lines.join('\n')}\n`);
}

function main() {
  const argv = process.argv.slice(2);
  const baseIdx = argv.indexOf('--base');
  const topIdx = argv.indexOf('--top');
  const argBase = baseIdx !== -1 ? String(argv[baseIdx + 1] || '') : '';
  const top = Math.max(1, Number(topIdx !== -1 ? argv[topIdx + 1] : 5) || 5);

  const base = resolveBase(argBase);
  if (!base) {
    note(['_No base ref (origin/main | main | origin/master | master) resolved — nothing to sample._']);
    return;
  }

  const log = git(['log', '--format=%H', `${base}..HEAD`], ROOT);
  const shas = (log || '').split('\n').map((s) => s.trim()).filter(Boolean);
  if (shas.length === 0) {
    note([`_No commits on \`${base}..HEAD\`._`]);
    return;
  }

  const tiers = loadTiers();
  const ranked = shas
    .map((sha) => scoreCommit(sha, tiers))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);

  const lines = [
    `Ranked ${shas.length} commit(s) on \`${base}..HEAD\` by touched-path risk × diff size.`,
    'Read the top entries first — this ranks attention, it verifies nothing.',
    '',
    '| Score | Commit | Files (crit/std/bas) | Diff | Subject |',
    '|------:|--------|----------------------|-----:|---------|',
  ];
  for (const c of ranked) {
    const mix = `${c.files} (${c.counts.critique}/${c.counts.standard}/${c.counts.bas})`;
    const subject = c.subject.replace(/\|/g, '\\|').slice(0, 72);
    lines.push(`| ${c.score} | \`${c.shortSha}\` | ${mix} | ${c.diffLines} | ${subject} |`);
  }
  note(lines);
}

// Run only when invoked directly — importing this module (e.g. from a test that
// exercises tierOf) must not fire the sampler or exit the process.
const isEntry = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntry) {
  try {
    main();
  } catch (err) {
    process.stdout.write(
      `## Risk-weighted commit sample\n\n_Sampler skipped (${err.message})._\n`,
    );
  }
  process.exit(0);
}
