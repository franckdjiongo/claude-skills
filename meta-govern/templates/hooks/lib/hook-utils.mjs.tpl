// Template: templates/hooks/lib/hook-utils.mjs.tpl
// Variables used:
//   {{PACKAGE_MANAGER}} — bun, npm, pnpm
//   {{VALIDATE_COMMAND}} — full validate command (e.g., `bun run validate`, `npm run validate`)
//
// Shared utilities for Claude Code hooks. Apple Silicon-safe: explicit PATH,
// no shell-profile dependencies. All hooks in .claude/hooks/*.mjs import this.

import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

export const PATH_PREFIX =
  '/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin';
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ''}`;

export const VALIDATE_COMMAND = '{{VALIDATE_COMMAND}}';

// Completion-style phrasing in the last assistant message. EN markers keep their
// ASCII \b boundaries; the FR markers use \p{L} lookarounds (the `u` flag) so that
// accented letters count as word chars at the edges. « fait » is left out on
// purpose — it collides with « en fait » / « ça fait ». The EN set is unchanged
// (additive), and only strong FR completion markers are added.
export const COMPLETION_REGEX =
  /\b(done|completed|finished|implemented|updated|set up|ready for review|ready to commit|review checklist|what changed|verification|verified|you can review|no commit)\b|(?<![\p{L}])(terminée?|complétée?|finie?|implémentée?|validée?|prête?|livrée?|c['’]est bon|tu peux (?:relire|vérifier|committer)|à relire)(?![\p{L}])/iu;

// Only the FULL validate gate satisfies the Stop-hook completion check — not a
// partial `test`/`lint`/`build`/`quality:check`, and not `validate:fast` (the
// `(?!:)` rejects the `:fast` subset, which skips size-guard + tests).
export const VALIDATE_BASH_REGEX =
  /\b(bun|npm|pnpm|yarn)(?:\.cmd)?(?: run)? validate\b(?!:)/i;

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|css|html|vue|svelte)$/;
const EXCLUDED_DIRS = ['node_modules/', 'dist/', 'build/', '.next/', '.turbo/', 'coverage/'];

export const projectDir = () => process.env.CLAUDE_PROJECT_DIR || process.cwd();

export function tmpDir() {
  const dir = path.join(projectDir(), '.claude', 'tmp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Sentinelle « batch en vol » — contrat producteur↔consommateur partagé :
// agent-dispatch-preflight la pose/rafraîchit à chaque dispatch écrivant,
// enforce-workflow la lit (fraîcheur par mtime-TTL). Nom et chemin vivent ici
// pour qu'aucun hook ne reconstruise le littéral indépendamment.
export const BATCH_SENTINEL_NAME = '.batch-in-flight';
export const batchSentinelPath = () => path.join(tmpDir(), BATCH_SENTINEL_NAME);

export function readJson(filePath, fallback = null) {
  try { return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : fallback; }
  catch { return fallback; }
}

export function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

export async function readJsonStdin() {
  try { const raw = fs.readFileSync(0, 'utf8'); return raw.trim() ? JSON.parse(raw) : {}; }
  catch { return {}; }
}

export const writeJsonStdout = (payload) => process.stdout.write(`${JSON.stringify(payload)}\n`);

export function git(args) {
  try {
    return execSync(`git ${args}`, {
      cwd: projectDir(),
      env: { ...process.env, PATH: `${PATH_PREFIX}:${process.env.PATH || ''}` },
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch { return ''; }
}

export const getCurrentBranch = () =>
  git('branch --show-current') || git('rev-parse --abbrev-ref HEAD') || 'unknown';

export function isFeatureFile(filePath) {
  if (!filePath) return false;
  const rel = path.relative(projectDir(), path.resolve(filePath));
  if (rel.startsWith('..') || rel.startsWith('.claude/') || rel.startsWith('docs/')) return false;
  if (EXCLUDED_DIRS.some((d) => rel.startsWith(d))) return false;
  if (rel === 'package.json' || /\.config\.(ts|js|mjs)$/.test(rel)) return true;
  return SOURCE_EXT.test(rel);
}

export const isValidateBash = (cmd) => typeof cmd === 'string' && VALIDATE_BASH_REGEX.test(cmd);

const DEFAULT_WF_STATE = {
  lastEdit: 0, lastEditPath: '', lastValidate: 0, lastValidateCommand: '',
  lastUiEdit: 0, lastUiEditPath: '',
};

export function reduceWorkflowState(prev = {}, event = {}) {
  const next = { ...DEFAULT_WF_STATE, ...prev };
  const ts = event.timestamp ?? Date.now();
  if (event.type === 'edit' && isFeatureFile(event.filePath ?? '')) {
    next.lastEdit = ts;
    next.lastEditPath = event.filePath ?? '';
    if (event.isUi) { next.lastUiEdit = ts; next.lastUiEditPath = event.filePath ?? ''; }
  }
  if (event.type === 'validate' && isValidateBash(event.command ?? '')) {
    next.lastValidate = ts;
    next.lastValidateCommand = event.command ?? '';
  }
  return next;
}

export function shouldBlockOnStop(state = {}, lastAssistantMessage = '') {
  // MG_HEADLESS_RUN is read at call time (not module load) so the gate follows
  // the env of the process that invokes the hook. An autonomous run has no
  // legitimate progress without a validate, so under headless the gate applies
  // regardless of the message wording; interactive sessions still key off the
  // completion phrasing. The editAt > validateAt condition below holds either way.
  const headless = process.env.MG_HEADLESS_RUN === '1';
  if (!headless && !COMPLETION_REGEX.test(lastAssistantMessage || '')) return null;
  const editAt = state.lastEdit || 0;
  const validateAt = state.lastValidate || 0;
  if (editAt === 0 || validateAt >= editAt) return null;
  return { reason: `Run \`${VALIDATE_COMMAND}\` before ending session. Last edit (${state.lastEditPath || 'feature file'}) is newer than the last validate run.` };
}

export function extractGitStatusPath(line = '') {
  const n = line.replace(/^\s*[A-Z?]{1,2}\s+/, '').trim();
  if (!n) return '';
  return n.includes(' -> ') ? (n.split(' -> ').at(-1)?.trim() ?? '') : n;
}

// docs/ is HTML-first (the block-docs-markdown hook blocks new .md), so the
// walker reads BOTH .html and any legacy .md.
function walkDocs(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDocs(full, visit);
    else if (entry.isFile() && (entry.name.endsWith('.html') || entry.name.endsWith('.md'))) visit(full);
  }
}

// Task progress for a plan doc. HTML plans use markdown-it-task-lists markup
// (`<input class="task-list-item-checkbox" [checked] ...>`); .md plans use the
// `- [ ]` / `- [x]` task-list syntax.
function planProgress(file, content) {
  if (file.endsWith('.html')) {
    const boxes = content.match(/<input[^>]*\btask-list-item-checkbox\b[^>]*>/g) || [];
    const total = boxes.length;
    const done = boxes.filter((b) => /\bchecked\b/.test(b)).length;
    return { total, done, hasPipeline: /pipeline-task-list|PIPELINE TASK LIST/i.test(content) };
  }
  const total = (content.match(/^- \[[ x]\]/gm) || []).length;
  const done = (content.match(/^- \[x\]/gm) || []).length;
  return { total, done, hasPipeline: /PIPELINE TASK LIST/i.test(content) };
}

export function findActivePlans() {
  const plansDir = path.join(projectDir(), 'docs', 'plans');
  if (!fs.existsSync(plansDir)) return [];
  const out = [];
  walkDocs(plansDir, (full) => {
    try {
      const c = fs.readFileSync(full, 'utf8');
      const { total, done, hasPipeline } = planProgress(full, c);
      if (total > 0 && done < total) {
        out.push({
          file: path.relative(projectDir(), full),
          doneTasks: done,
          totalTasks: total,
          hasPipeline,
        });
      }
    } catch {}
  });
  return out;
}

export function findLatestSpec() {
  const specsDir = path.join(projectDir(), 'docs', 'specs');
  if (!fs.existsSync(specsDir)) return null;
  let best = null;
  walkDocs(specsDir, (full) => {
    const mtime = fs.statSync(full).mtimeMs;
    if (!best || mtime > best.mtime) best = { file: path.relative(projectDir(), full), mtime };
  });
  return best ? best.file : null;
}

const HANDOFF_RESUME = [
  '## Resume instructions',
  '',
  '1. Read `CLAUDE.md` (router, invariants, routing table).',
  '2. Read source-of-truth docs referenced from `CLAUDE.md`.',
  '3. If an active plan is listed above, read its Pipeline Task List before continuing.',
  '4. Re-read the relevant `.claude/rules/*.md` for the paths you are about to touch.',
].join('\n');

const HANDOFF_DISCIPLINE = (cmd) => [
  '## Discipline rules (lost on compaction)',
  '',
  `- Run \`${cmd}\` before claiming any task done.`,
  '- Reviews dispatched via `spec-reviewer` or `code-quality-reviewer` subagents must run **foreground only** (`run_in_background: false`).',
  '- Dispatch != done: read the result, verify PASS, only then mark `[x]` in the plan.',
  '- Every finding has an explicit disposition: fixed (commit ref) OR deferred (`docs/backlog-deferred.html`).',
  '- Source-of-truth docs are append-only via the delta protocol.',
].join('\n');

export function buildHandoffMarkdown({
  branch, modifiedFiles = [], activePlans = [], latestDesign = null,
  triggerReason = 'Compaction triggered', generatedAt = new Date().toISOString(),
}) {
  const files = modifiedFiles.length ? modifiedFiles.map((f) => `  - \`${f}\``).join('\n') : '  - (none)';
  const plans = activePlans.length
    ? activePlans.map((p) => `- \`${p.file}\` — ${p.doneTasks}/${p.totalTasks} tasks done`).join('\n')
    : '- (no plan with unchecked tasks)';
  const design = latestDesign ? `- \`${latestDesign}\`` : '- (none)';
  return [
    '# HANDOFF.md', '',
    `> Auto-generated by precompact-handoff hook at ${generatedAt}.`,
    `> Trigger: ${triggerReason}.`,
    '> If you are reading this after a context reset, follow the resume instructions below.',
    '', '## Snapshot', '',
    `- Branch: \`${branch}\``,
    `- Modified files (${modifiedFiles.length}):`, files,
    '', '## Active plans', '', plans,
    '', '## Latest design', '', design,
    '', HANDOFF_RESUME,
    '', HANDOFF_DISCIPLINE(VALIDATE_COMMAND), '',
  ].join('\n');
}

export function writeLastHookOutput(name, payload) {
  const file = path.join(tmpDir(), 'last-hook-output.json');
  writeJson(file, { hook: name, at: new Date().toISOString(), payload });
  return file;
}
