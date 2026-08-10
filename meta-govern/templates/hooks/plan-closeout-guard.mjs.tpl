#!/usr/bin/env node
/**
 * plan-closeout-guard — Hook PreToolUse sur `Write | Edit | MultiEdit`.
 *
 * Discipline de close-out des plans ({{DOCS_ROOT}}/plans/*.html) : une tâche
 * passe `data-status="done"` seulement quand TOUTES ses cases détaillées sont
 * cochées, ou explicitement marquées `PENDING-MANUAL: <raison>`. La portée du
 * marqueur est PAR CASE — il doit apparaître dans le même `<li>` que la case
 * qu'il exempte, pas seulement quelque part dans la section (une case non
 * cochée sans son propre marqueur reste une violation même si une AUTRE case
 * de la section porte PENDING-MANUAL). Ce hook simule l'édition entrante et
 * BLOQUE si elle INTRODUIT une section `plan-task` à la fois `done` et
 * porteuse d'une case non cochée sans marqueur dans son `<li>` — le « done »
 * prématuré est refusé avant d'atterrir (PreToolUse, pas PostToolUse : après
 * coup l'edit fautif serait déjà dans le fichier).
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

// Une case décochée est une violation SAUF si le marqueur PENDING-MANUAL
// apparaît dans le MÊME `<li class="task-list-item">…</li>` (portée par case,
// pas par section — cf. docstring "TOUTES ses cases … ou explicitement
// marquées"). Repli fail-closed : hors d'un `<li class="task-list-item">`
// reconnaissable, une case décochée compte toujours comme violation (aucune
// exemption sans structure claire à vérifier).
function isUncheckedBoxViolation(body, matchIndex, tag) {
  const liOpenTag = '<li class="task-list-item"';
  const liStart = body.lastIndexOf(liOpenTag, matchIndex);
  if (liStart === -1) return true;
  const liEnd = body.indexOf('</li>', matchIndex);
  if (liEnd === -1) return true;
  // Le `<li>` trouvé doit bien envelopper cette case (pas un `<li>` antérieur
  // dont le `</li>` est déjà passé) — sinon on ne peut pas garantir la portée.
  const liOpenTagEnd = body.indexOf('>', liStart);
  if (liOpenTagEnd === -1 || liOpenTagEnd > matchIndex) return true;
  const between = body.indexOf('</li>', liStart);
  if (between !== liEnd) return true;
  const liContent = body.slice(liStart, liEnd);
  return !liContent.includes('PENDING-MANUAL');
}

// Ids des tâches `done` dont la section contient >=1 case non cochée sans
// marqueur PENDING-MANUAL dans SON PROPRE `<li>` (portée par case).
function violatingTaskIds(content) {
  const ids = new Set();
  const sections = content.split(/<section\b[^>]*class="[^"]*plan-task[^"]*"[^>]*>/);
  for (let i = 1; i < sections.length; i++) {
    const body = sections[i].split('</section>')[0];
    const h3 = body.match(/<h3\b[^>]*id="(task-[^"]+)"[^>]*>/);
    if (!h3 || !/data-status="done"/.test(h3[0])) continue;
    const inputRe = /<input\b[^>]*task-list-item-checkbox[^>]*>/g;
    let m;
    while ((m = inputRe.exec(body)) !== null) {
      const tag = m[0];
      if (/\bchecked\b/.test(tag)) continue;
      if (isUncheckedBoxViolation(body, m.index, tag)) {
        ids.add(h3[1]);
        break;
      }
    }
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
      `(ou chacune marquée individuellement "PENDING-MANUAL: <raison>" dans son propre <li>) ④ commit.\n` +
      `Coche les cases réellement satisfaites ou pose le marqueur PENDING-MANUAL sur CHAQUE case restante, puis rejoue l'édition.`
  );
} catch {
  allow();
}
