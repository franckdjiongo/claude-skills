#!/usr/bin/env node
/**
 * bash-write-guard — Hook PreToolUse sur `Bash`.
 *
 * Angle mort couvert (leçon 1) : block-docs-markdown ne voit que
 * Write|Edit|MultiEdit. Une écriture par le shell (`cat > docs/x.md`,
 * `sed -i … src/app.ts`, `git add -A`) lui échappe. Ce guard lit la commande
 * Bash, détecte ses cibles d'écriture via la lib PURE ./lib/bash-write-detect,
 * puis applique la même doctrine HTML-first que block-docs-markdown, plus deux
 * garde-fous : chemins protégés du projet et `git add` massif refusés,
 * écritures sous src/** OBSERVÉES (shadow-log) — promues en refus seulement
 * quand BASH_WRITE_GUARD_ENFORCE=1.
 *
 * FAIL-OPEN STRUCTUREL (doctrine calquée sur agent-dispatch-preflight) : toute
 * lecture stdin, tout parse, toute op fs est en try/catch ; chaque branche sort
 * en exit 0. Un guard qui plante ne bloque jamais l'action. Le mode shadow
 * n'émet AUCUN permissionDecision — il journalise et laisse passer, pour
 * mesurer l'impact d'un futur enforce sans casser les sessions d'aujourd'hui.
 *
 * Contrat JSON (PreToolUse moderne) :
 *   allow  -> exit 0, pas de stdout
 *   deny   -> exit 0 + { hookSpecificOutput: { hookEventName, permissionDecision:'deny', permissionDecisionReason } }
 *   shadow -> exit 0, pas de stdout ; ligne JSONL dans .claude/tmp/bash-write-guard.log
 */
import fs from 'node:fs';
import path from 'node:path';
import { PATH_PREFIX, projectDir, tmpDir } from './lib/hook-utils.mjs';
import { detectWriteTargets } from './lib/bash-write-detect.mjs';

// Durcissement PATH macOS (Apple Silicon) : réaffirmé même si hook-utils l'a
// déjà posé à l'import — coût nul, garantie locale.
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ''}`;

const DOCS_ROOT = '{{DOCS_ROOT}}';

// Répertoires-bacs à sable : une écriture y est toujours légitime.
const ALLOW_PREFIXES = ['scratchpad/', '.claude/tmp/', 'coverage/', 'node_modules/'];

// Chemins protégés du projet : config du harnais et invariants racine que le
// shell n'a pas à réécrire (les modifier passe par l'outil dédié, pas Bash).
const PROTECTED_PATHS = new Set([
  'CLAUDE.md',
  '.claude/settings.json',
  '.claude/settings.local.json',
  '.gitignore',
]);

function readJsonStdin() {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function allow() {
  process.exit(0);
}
function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason ?? '',
      },
    })
  );
  process.exit(0);
}

// Canonicalise un chemin (résout les symlinks : /tmp → /private/tmp sous
// macOS) ; pour un chemin pas encore créé, résout l'ancêtre existant le plus
// profond puis ré-attache le suffixe. Copie de block-docs-markdown.
function canonical(p) {
  const abs = path.resolve(p);
  let cur = abs;
  let suffix = '';
  for (;;) {
    try {
      return path.join(fs.realpathSync(cur), suffix);
    } catch {
      const parent = path.dirname(cur);
      if (parent === cur) return abs;
      suffix = path.join(path.basename(cur), suffix);
      cur = parent;
    }
  }
}

// Normalise une cible telle qu'écrite (relative OU absolue) en chemin relatif
// à la racine projet. Les chemins relatifs sont ancrés sur CLAUDE_PROJECT_DIR
// (racine stable du harnais), pas sur le cwd du hook.
function relForTarget(rawPath) {
  const root = projectDir();
  const abs = path.isAbsolute(rawPath) ? rawPath : path.join(root, rawPath);
  return path.relative(canonical(root), canonical(abs)).replace(/\\/g, '/');
}

// Miroir de la règle block-docs-markdown : seul un .md SOUS {{DOCS_ROOT}}/ est
// refusé — tout .md hors docs (rules, README, CLAUDE.md…) reste autorisé.
function isDocsMarkdown(rel) {
  return rel.startsWith(DOCS_ROOT + '/') && /\.md$/i.test(rel);
}

const underAllowPrefix = (rel) => ALLOW_PREFIXES.some((p) => rel === p.slice(0, -1) || rel.startsWith(p));
const underSrc = (rel) => rel === 'src' || rel.startsWith('src/');

function appendShadowLog(entry) {
  try {
    const file = path.join(tmpDir(), 'bash-write-guard.log');
    fs.appendFileSync(file, JSON.stringify(entry) + '\n');
  } catch {
    // fail-soft : le shadow-log est une observation, jamais un point de blocage.
  }
}

const payload = readJsonStdin();
const toolName = payload?.tool_name ?? '';
const command = payload?.tool_input?.command ?? '';

if (toolName !== 'Bash' || typeof command !== 'string' || !command.trim()) allow();

let targets = [];
try {
  targets = detectWriteTargets(command);
} catch {
  // La lib est PURE, mais on reste fail-open par principe.
  allow();
}
if (targets.length === 0) allow();

const enforce = process.env.BASH_WRITE_GUARD_ENFORCE === '1';
const denials = [];
const shadows = [];

for (const { path: rawPath, vector } of targets) {
  // `git add -A`/`.` : cible massive non normalisable en fichier — refus direct.
  if (vector === 'git-add-all') {
    denials.push(`  git add ${rawPath} (${vector}) — stage sélectif attendu (pas d'ajout massif)`);
    continue;
  }
  let rel;
  try {
    rel = relForTarget(rawPath);
  } catch {
    continue; // cible non résoluble → on n'en fait rien (fail-open).
  }
  if (underAllowPrefix(rel)) continue; // bac à sable → laisser passer.
  if (isDocsMarkdown(rel)) {
    denials.push(`  ${rel} (${vector}) — ${DOCS_ROOT}/ est 100 % HTML, plus aucun .md`);
    continue;
  }
  if (PROTECTED_PATHS.has(rel)) {
    denials.push(`  ${rel} (${vector}) — chemin protégé du projet`);
    continue;
  }
  if (underSrc(rel)) {
    if (enforce) {
      denials.push(`  ${rel} (${vector}) — écriture src/** refusée (BASH_WRITE_GUARD_ENFORCE=1)`);
    } else {
      shadows.push({ ts: new Date().toISOString(), command, target: rel, vector, mode: 'shadow' });
    }
    continue;
  }
  // Toute autre cible : hors périmètre gouverné → laisser passer.
}

if (denials.length > 0) {
  deny(
    `bash-write-guard : écriture Bash refusée.\n` +
      denials.join('\n') +
      `\n\nPour un doc : node .claude/scripts/docs-html/scaffold.mjs <type> <chemin.html> "<Titre>".\n` +
      `Pour du code source : passe par l'outil Write/Edit (traçé par le workflow), pas par le shell.`
  );
}

for (const entry of shadows) appendShadowLog(entry);
allow();
