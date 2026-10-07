// Tests du contenu des checks de lot et du plafond de budget : node --test brief-preflight/scripts/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vagueReason, missingRefs, checkBudget, parseChecks } from './lot-checks.mjs';

const LINT = fileURLToPath(new URL('./preflight-lint.mjs', import.meta.url));
const REPO = fileURLToPath(new URL('./__fixtures__/repo', import.meta.url));
const OK = readFileSync(fileURLToPath(new URL('./__fixtures__/plan-ok.html', import.meta.url)), 'utf8');

function lint(html, ...flags) {
  const dir = mkdtempSync(join(tmpdir(), 'lotchecks-'));
  try {
    const file = join(dir, 'plan.html');
    writeFileSync(file, html);
    const r = spawnSync('node', [LINT, file, REPO, ...flags], { encoding: 'utf8' });
    return { code: r.status, out: r.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const swap = (from, to) => {
  assert.ok(OK.includes(from), `fixture sans « ${from} »`);
  return OK.replace(from, to);
};

test('fixture plan-ok : PASS', () => {
  const r = lint(OK);
  assert.equal(r.code, 0, r.out);
});

const FAIL_CASES = [
  ['commande consigne « run the tests »', swap('node scripts/check.mjs</code></li>\n        <li data-check="1.2"', 'run the tests</code></li>\n        <li data-check="1.2"'), /check « 1\.1 » : « run … » est une consigne/],
  ['phrase sans commande', swap('npm test</code>', 'ouvrir la page et regarder</code>'), /phrase, pas une commande/],
  ['commande vide', swap('npm test</code>', '</code>'), /commande vide/],
  ['placeholder', swap('npm test</code>', 'node &lt;fichier&gt;</code>'), /placeholder non rempli/],
  ['code retour masqué', swap('npm test</code>', 'npm test || true</code>'), /masque le code retour/],
  ['script de repo absent', swap('node scripts/check.mjs</code></li>\n        <li data-check="1.2"', 'node scripts/absent.mjs</code></li>\n        <li data-check="1.2"'), /« scripts\/absent\.mjs » introuvable/],
  ['fichier créé par un lot SUIVANT', swap('<code>scripts/new.mjs</code>, <code>scripts/new.test.mjs</code>', 'rien').replace('chantier(fixture)', 'x</p><p><strong>Fichiers touchés</strong> : scripts/new.test.mjs</p><p>chantier(fixture)'), /new\.test\.mjs » introuvable/],
  ['script npm absent', swap('npm test</code>', 'npm start</code>'), /script « start » absent/],
  ['identifiant dupliqué', swap('data-check="2.1"', 'data-check="1.1"'), /identifiant déjà utilisé/],
  ['identifiant absent', swap('<li data-check="2.2">', '<li>'), /pas d'identifiant/],
  ['deux commandes dans un check', swap('npm test</code>', 'npm test</code> <code>npm run build</code>'), /exactement une commande/],
  ['lot sans liste de checks', swap(/<ol class="list checks">[\s\S]*?<\/ol>/.exec(OK.slice(OK.indexOf('id="lot-2"')))[0], ''), /Lot 2 : aucun check/],
];
for (const [name, html, re] of FAIL_CASES) {
  test(`check invalide : ${name}`, () => {
    const r = lint(html);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, re);
  });
}

test('« (nouveau) » hors de la commande autorise un fichier à créer', () => {
  const from = '<code class="check-cmd">npm test</code>';
  const bad = swap(from, '<code class="check-cmd">node scripts/later.mjs</code>');
  assert.equal(lint(bad).code, 1);
  const r = lint(swap(from, `${from.replace('npm test', 'node scripts/later.mjs')} (nouveau)`));
  assert.equal(r.code, 0, r.out);
});

test('ancien lot en <pre class="cmd"> : FAIL, avertissement sous --legacy', () => {
  const html = swap(/<ol class="list checks">[\s\S]*?<\/ol>/.exec(OK.slice(OK.indexOf('id="lot-2"')))[0], '<pre class="cmd">npm test</pre>');
  const r = lint(html);
  assert.equal(r.code, 1);
  assert.match(r.out, /sans liste de checks/);
  const l = lint(html, '--legacy');
  assert.equal(l.code, 0, l.out);
  assert.match(l.out, /sans liste de checks/);
});

const BUDGETS = [
  ['un seul nombre', 'Budget total : 300 lignes', /deux nombres/],
  ['plafond > 1000', 'Budget total : 300 / 1500 lignes', /plafond 1500 > 1000/],
  ['cible > plafond', 'Budget total : 900 / 600 lignes', /cible 900/],
  ['cible nulle', 'Budget total : 0 / 600 lignes', /cible 0/],
];
for (const [name, line, re] of BUDGETS) {
  test(`budget invalide : ${name} (FAIL, avertissement sous --legacy)`, () => {
    const html = swap('Budget total : 300 / 600 lignes', line);
    const r = lint(html);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, re);
    const l = lint(html, '--legacy');
    assert.equal(l.code, 0, l.out);
    assert.match(l.out, re);
  });
}

test('budget valide : 1 000 accepté, séparateur de milliers lu, EN accepté', () => {
  assert.equal(lint(swap('300 / 600 lignes', '300 / 1 000 lignes')).code, 0);
  assert.equal(lint(swap('Budget total : 300 / 600 lignes', 'Total budget: cible 300 / plafond 1000 lines')).code, 0);
});

test('unités : vagueReason', () => {
  for (const ok of ['bun test scripts/x.test.mjs', 'FOO=1 node --test', 'git diff --quiet && bun run build', './check.sh', 'bun run convo read x', 'test -f a.txt']) {
    assert.equal(vagueReason(ok), null, ok);
  }
  for (const bad of ['run the tests', 'lancer les tests', 'Vérifie que tout passe', 'tests unitaires passent', 'bun test; true', '']) {
    assert.notEqual(vagueReason(bad), null, bad);
  }
});

test('unités : missingRefs suit cd, ignore redirections, globs, guillemets et chemins hors repo', () => {
  const o = { allowNew: false, scripts: { test: 'x' } };
  assert.deepEqual(missingRefs('cd scripts && node check.mjs', REPO, o), []);
  assert.deepEqual(missingRefs('node scripts/check.mjs > /tmp/out.json 2>&1', REPO, o), []);
  assert.deepEqual(missingRefs('grep -q "gone.mjs" scripts/check.mjs; ls src/*.ts', REPO, o), []);
  assert.deepEqual(missingRefs('node /opt/elsewhere/x.mjs', REPO, o), []);
  assert.equal(missingRefs('node gone.mjs && ./nope.sh', REPO, o).length, 2);
  assert.equal(missingRefs('node gone.mjs', REPO, { ...o, touched: 'gone.mjs' }).length, 0);
});

test('unités : faux positifs corrigés (HTML cité, outil inconnu, budget cité deux fois, npm après cd)', () => {
  assert.equal(vagueReason('grep -q "<section id=\\"s-x\\">" a.html'), null);
  assert.equal(vagueReason('docker compose up'), null);
  assert.equal(vagueReason('kubectl get pods'), null);
  assert.notEqual(vagueReason('ouvrir la page et regarder'), null);
  assert.notEqual(vagueReason('node <fichier>'), null);
  assert.deepEqual(checkBudget('Budget total : voir plus bas. Budget total : 300 / 600 lignes', /budget total\s*:/i), { cible: 300, plafond: 600, error: null });
  // après `cd`, `npm test` se juge sur le package.json du dossier courant (ici le fixture : script « test » présent, « start » absent)
  const root = join(REPO, '..');
  assert.deepEqual(missingRefs('cd repo && npm test', root, { scripts: {} }), []);
  assert.equal(missingRefs('cd repo && npm start', root, { scripts: { start: 'x' } }).length, 1);
});

test('unités : checkBudget et parseChecks', () => {
  const re = /budget total\s*:/i;
  assert.equal(checkBudget('rien', re).error, null);
  assert.deepEqual(checkBudget('Budget total : ~400 / 800 lignes', re), { cible: 400, plafond: 800, error: null });
  assert.equal(parseChecks('<div>sans liste</div>').present, false);
  assert.equal(parseChecks('<ol class="list checks"><li data-check="a"><code>x</code></li></ol>').items[0].id, 'a');
});
