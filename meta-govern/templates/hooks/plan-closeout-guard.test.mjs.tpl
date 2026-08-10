// Template: templates/hooks/plan-closeout-guard.test.mjs.tpl
// (aucune variable de template autre que {{DOCS_ROOT}})
//
// Rendu en `.claude/hooks/plan-closeout-guard.test.mjs` (frère du hook).
// Modelé sur block-docs-markdown.test.mjs.tpl (forme la plus proche : un garde
// PreToolUse sur Write/Edit). Installé seulement si le projet a vitest.
//
// Prouve le contrat PreToolUse du garde `plan-closeout-guard` :
//   POSITIF — un Write d'un plan `{{DOCS_ROOT}}/plans/*.html` qui introduit une
//             section `plan-task` à la fois `data-status="done"` ET porteuse
//             d'une case détaillée non cochée SANS marqueur PENDING-MANUAL
//             dans son propre `<li>` est DENY ;
//   NÉGATIF — la même section mais avec la case cochée passe (allow, aucun stdout).
// Runner : vitest. Le hook ne touche aucun fichier d'état — seul le fichier cible
// (inexistant sur disque, sous un nom de fixture dédié) est lu, jamais écrit.

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { PATH_PREFIX } from './lib/hook-utils.mjs';
import { runHook, projectRoot } from './lib/hook-test-util.mjs';

// Durcissement PATH macOS (Apple Silicon) — sinon le détecteur d'audit
// macos-hardening émet un finding HIGH sur ce test.
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ''}`;

// Le hook ancre la résolution sur CLAUDE_PROJECT_DIR ; on le fixe sur la racine
// du projet rendu pour que les chemins ci-dessous tombent bien sous {{DOCS_ROOT}}/plans/.
const env = { CLAUDE_PROJECT_DIR: projectRoot };

// Fixture volontairement absente du disque : le hook lit le fichier cible via
// fs.readFileSync et retombe sur `original = null` (nouveau fichier) en cas
// d'ENOENT — donc "avant" est toujours vide et la violation introduite par
// Write est nécessairement "fraîche".
const FIXTURE_PATH = path.join(projectRoot, '{{DOCS_ROOT}}', 'plans', '__hook-test-fixture__.html');

const planHtml = (checkboxAttrs) => `<!doctype html>
<html><body>
<section class="plan-task" data-mode="standard">
<h3 id="task-1" data-status="done">Task 1 : fixture</h3>
<ul>
<li class="task-list-item"><label><input class="task-list-item-checkbox" disabled="" ${checkboxAttrs} type="checkbox"> Item détaillé</label></li>
</ul>
</section>
</body></html>
`;

const writeEvent = (content) => ({
  tool_name: 'Write',
  tool_input: { file_path: FIXTURE_PATH, content },
});

describe('plan-closeout-guard', () => {
  it('DENY : Task passe data-status="done" avec une case détaillée non cochée et sans PENDING-MANUAL', () => {
    const res = runHook('plan-closeout-guard.mjs', writeEvent(planHtml('')), { env });
    expect(res.exitCode).toBe(0);
    const out = res.stdoutJson?.hookSpecificOutput;
    expect(out?.hookEventName).toBe('PreToolUse');
    expect(out?.permissionDecision).toBe('deny');
    expect(out?.permissionDecisionReason).toContain('task-1');
  });

  it('ALLOW : Task "done" avec la case détaillée cochée passe (aucun stdout)', () => {
    const res = runHook('plan-closeout-guard.mjs', writeEvent(planHtml('checked=""')), { env });
    expect(res.exitCode).toBe(0);
    expect(res.stdout.trim()).toBe('');
    expect(res.stdoutJson).toBeNull();
  });

  // Réfutation adversariale : le contrat documenté est que PENDING-MANUAL a une
  // portée PAR CASE (`<li>`), pas par section. Les deux tests ci-dessus ne le
  // prouvent pas : le premier n'a AUCUN PENDING-MANUAL dans le body (donc
  // `!body.includes('PENDING-MANUAL')` donne le même verdict que la vraie
  // fonction) et le second ne passe même pas par isUncheckedBoxViolation (la
  // case est cochée, la boucle `continue` avant l'appel). Un réfuteur qui
  // remplacerait tout le corps de `isUncheckedBoxViolation` par
  // `return !body.includes('PENDING-MANUAL');` laisserait les deux tests
  // précédents VERTS.
  //
  // Ce cas construit DEUX `<li>` dans la MÊME section : le premier non coché
  // SANS son propre marqueur (violation attendue), le second portant
  // PENDING-MANUAL dans SON `<li>`. Sous la vraie implémentation (portée par
  // case), le premier reste une violation → DENY. Sous la mutation (portée
  // par section, via `body.includes`), la présence du marqueur QUELQUE PART
  // dans le body neutralise aussi le premier `<li>` → ALLOW à tort.
  it('DENY : deux <li> dans la même section, un seul portant PENDING-MANUAL — l’autre <li> non coché reste une violation (portée PAR CASE, pas par section)', () => {
    const html = `<!doctype html>
<html><body>
<section class="plan-task" data-mode="standard">
<h3 id="task-1" data-status="done">Task 1 : fixture</h3>
<ul>
<li class="task-list-item"><label><input class="task-list-item-checkbox" disabled="" type="checkbox"> Item sans marqueur, non coché</label></li>
<li class="task-list-item"><label><input class="task-list-item-checkbox" disabled="" type="checkbox"> Item — PENDING-MANUAL: raison documentée</label></li>
</ul>
</section>
</body></html>
`;
    const res = runHook('plan-closeout-guard.mjs', writeEvent(html), { env });
    expect(res.exitCode).toBe(0);
    const out = res.stdoutJson?.hookSpecificOutput;
    expect(out?.hookEventName).toBe('PreToolUse');
    expect(out?.permissionDecision).toBe('deny');
    expect(out?.permissionDecisionReason).toContain('task-1');
  });
});
