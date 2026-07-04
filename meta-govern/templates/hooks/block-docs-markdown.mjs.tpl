#!/usr/bin/env node
/**
 * block-docs-markdown — Hook PreToolUse sur `Write | Edit | MultiEdit`.
 *
 * Invariant de la doctrine HTML : le dossier docs ({{DOCS_ROOT}}/) est 100 % HTML,
 * plus aucun `.md`. Ce hook BLOQUE toute création/édition de fichier .md situé
 * sous {{DOCS_ROOT}}/ et oriente l'agent vers le bon outil :
 *   - nouveau doc → `node .claude/scripts/docs-html/scaffold.mjs <type> <chemin.html> "<Titre>"`
 *   - types & paramètres → `.claude/scripts/docs-html/lib/docs-config.mjs`
 *   - conventions canoniques → `{{DOCS_ROOT}}/docs-map.json`
 *
 * Les `.md` HORS de {{DOCS_ROOT}}/ (rules .claude/, README racine, CLAUDE.md…)
 * passent : seul le dossier docs est verrouillé en HTML.
 *
 * Contrat JSON (PreToolUse moderne) :
 *   allow -> exit 0, pas de stdout
 *   deny  -> exit 0 + { hookSpecificOutput: { hookEventName, permissionDecision:'deny', permissionDecisionReason } }
 */
import fs from 'node:fs';
import path from 'node:path';

// Durcissement PATH macOS (Apple Silicon): les apps GUI ne voient pas /opt/homebrew/bin.
const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

const DOCS_ROOT = '{{DOCS_ROOT}}';
// Liste des types par défaut (miroir de DOC_TYPES dans lib/docs-config.mjs —
// la liste à jour vit là-bas si le projet l'a personnalisée).
const TYPE_IDS = 'spec plan qa audit lexique synthese architecture adr playbook backlog generic';

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

// Canonicalise un chemin (résout les symlinks, ex. /tmp → /private/tmp sous
// macOS) ; pour un chemin pas encore créé, résout son ancêtre existant le
// plus profond puis ré-attache le suffixe.
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
function relToProjectRoot(filePath) {
  // Anchor on CLAUDE_PROJECT_DIR (the harness's stable project root), not the
  // hook's cwd — the cwd is not guaranteed to be the repo root, and resolving
  // an absolute docs/*.md path against a subdir would let it escape the block.
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return path.relative(canonical(root), canonical(filePath)).replace(/\\/g, '/');
}

function isDocsMarkdown(filePath) {
  if (!filePath) return false;
  const rel = relToProjectRoot(filePath);
  return rel.startsWith(DOCS_ROOT + '/') && /\.md$/i.test(rel);
}

const payload = readJsonStdin();
const toolName = payload?.tool_name ?? '';
const toolInput = payload?.tool_input ?? {};

if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) allow();
if (!isDocsMarkdown(toolInput.file_path)) allow();

const rel = relToProjectRoot(toolInput.file_path);
const target = rel.replace(/\.md$/i, '.html');
deny(
  `block-docs-markdown: le dossier ${DOCS_ROOT}/ est 100 % HTML — plus aucun fichier .md n'y est autorisé.\n` +
    `Fichier refusé : ${rel}\n\n` +
    `Crée plutôt un document HTML :\n` +
    `  node .claude/scripts/docs-html/scaffold.mjs <type> ${target} "<Titre>"\n` +
    `  (types : ${TYPE_IDS}\n` +
    `   — liste à jour dans .claude/scripts/docs-html/lib/docs-config.mjs)\n\n` +
    `Convention canonique : ${DOCS_ROOT}/docs-map.json (conventions).`
);
