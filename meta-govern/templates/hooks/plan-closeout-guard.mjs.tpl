#!/usr/bin/env node
/**
 * plan-closeout-guard — Hook PreToolUse sur `Write | Edit | MultiEdit`.
 *
 * Discipline de close-out des plans ({{DOCS_ROOT}}/plans/*.html) : une tâche
 * passe `data-status="done"` seulement quand TOUTES ses cases détaillées sont
 * cochées, ou explicitement marquées `PENDING-MANUAL: <raison>`. Ce hook
 * simule l'édition entrante et BLOQUE si elle INTRODUIT une section
 * `plan-task` à la fois `done` et porteuse de cases non cochées sans marqueur
 * — le « done » prématuré est refusé avant d'atterrir (PreToolUse, pas
 * PostToolUse : après coup l'edit fautif serait déjà dans le fichier).
 *
 * Diff-scopé : les sections déjà en violation AVANT l'édition ne bloquent
 * jamais une édition sans rapport. Fail-open : toute erreur => allow.
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

function relToProjectRoot(filePath) {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return path.relative(path.resolve(root), path.resolve(filePath)).replace(/\\/g, '/');
}

function isPlanHtml(filePath) {
  if (!filePath) return false;
  const rel = relToProjectRoot(filePath);
  return rel.startsWith(DOCS_ROOT + '/plans/') && /\.html$/i.test(rel);
}

// Simule le contenu résultant de l'édition. Retourne null si non simulable
// (=> allow, fail-open).
function simulate(toolName, toolInput, original) {
  if (toolName === 'Write') return String(toolInput.content ?? '');
  if (original == null) return null;
  const applyOne = (content, { old_string, new_string, replace_all }) => {
    if (typeof old_string !== 'string' || typeof new_string !== 'string') return null;
    if (!content.includes(old_string)) return content;
    return replace_all
      ? content.split(old_string).join(new_string)
      : content.replace(old_string, new_string);
  };
  if (toolName === 'Edit') return applyOne(original, toolInput);
  if (toolName === 'MultiEdit' && Array.isArray(toolInput.edits)) {
    let c = original;
    for (const e of toolInput.edits) {
      c = applyOne(c, e ?? {});
      if (c == null) return null;
    }
    return c;
  }
  return null;
}

// Ids des tâches `done` dont la section contient >=1 case non cochée et aucun
// marqueur PENDING-MANUAL.
function violatingTaskIds(content) {
  const ids = new Set();
  const sections = content.split(/<section\b[^>]*class="[^"]*plan-task[^"]*"[^>]*>/);
  for (let i = 1; i < sections.length; i++) {
    const body = sections[i].split('</section>')[0];
    const h3 = body.match(/<h3\b[^>]*id="(task-[^"]+)"[^>]*>/);
    if (!h3 || !/data-status="done"/.test(h3[0])) continue;
    if (body.includes('PENDING-MANUAL')) continue;
    const inputs = body.match(/<input\b[^>]*task-list-item-checkbox[^>]*>/g) || [];
    if (inputs.some((tag) => !/\bchecked\b/.test(tag))) ids.add(h3[1]);
  }
  return ids;
}

try {
  const payload = readJsonStdin();
  const toolName = payload?.tool_name ?? '';
  const toolInput = payload?.tool_input ?? {};

  if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) allow();
  if (!isPlanHtml(toolInput.file_path)) allow();

  let original = null;
  try {
    original = fs.readFileSync(toolInput.file_path, 'utf8');
  } catch {
    original = null; // nouveau fichier : Write le fournit en entier
  }
  const next = simulate(toolName, toolInput, original);
  if (next == null) allow();

  const before = original == null ? new Set() : violatingTaskIds(original);
  const fresh = [...violatingTaskIds(next)].filter((id) => !before.has(id));
  if (fresh.length === 0) allow();

  deny(
    `plan-closeout-guard: ${fresh.join(', ')} passe data-status="done" avec des cases détaillées non cochées.\n` +
      `Close-out complet requis : ① case pipeline ② data-status ③ TOUTES les cases détaillées cochées ` +
      `(ou marquées "PENDING-MANUAL: <raison>" dans la section) ④ commit.\n` +
      `Coche les cases réellement satisfaites ou pose le marqueur PENDING-MANUAL, puis rejoue l'édition.`
  );
} catch {
  allow();
}
