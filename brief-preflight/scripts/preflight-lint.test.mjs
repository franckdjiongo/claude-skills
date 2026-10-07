// Tests des règles dures du lint (A1-A5, G) : node --test brief-preflight/scripts/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LINT = fileURLToPath(new URL('./preflight-lint.mjs', import.meta.url));
const REGLES = `<p>Budget total : 400 lignes</p><p>Chips : autorisés</p><p>Fiche d'intention : .chantier/intention.md</p><p>Doublures de test : aucune</p>`;
const REGLES_EN = `<p>Total budget: 400 lines</p><p>Chips: allowed</p><p>Intent sheet: .chantier/intent.md</p><p>Test doubles: none</p>`;

function plan(regles = REGLES, extra = '', lots = '') {
  const sections = ['s-intention', 's-contexte', 's-approbation', 's-verif']
    .map((id) => `<section id="${id}"><p>ok</p></section>`)
    .join('');
  const nice = `<section id="s-nice"><ul>${'<li>x</li>'.repeat(5)}</ul></section>`;
  return `<!doctype html><html><body><nav><a href="#lot-1">Lot 1</a></nav>${sections}${nice}
<section id="s-lots">
<div class="lot" id="lot-1"><p><strong>Agent</strong> sonnet</p><pre class="cmd">npm test</pre>
<code class="commit-msg">chantier(x): lot 1 — fin</code><div class="done">ok</div>
</div>${lots}</section>${regles}${extra}</body></html>`;
}

function lint(html, ...flags) {
  const dir = mkdtempSync(join(tmpdir(), 'preflight-'));
  try {
    const file = join(dir, 'plan.html');
    writeFileSync(file, html);
    const r = spawnSync('node', [LINT, file, dir, ...flags], { encoding: 'utf8' });
    const out = r.stdout;
    const [errs, warns] = ['ERREURS', 'AVERTISSEMENTS'].map((label) => {
      const m = out.match(new RegExp(`${label} \\(\\d+\\) :\\n([\\s\\S]*?)(?:\\n\\n|$)`));
      return m ? m[1] : '';
    });
    return { code: r.status, errs, warns };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('plan minimal valide : PASS', () => {
  const r = lint(plan());
  assert.equal(r.code, 0, r.errs);
});

test('apostrophe typographique acceptée pour la fiche', () => {
  const r = lint(plan(REGLES.replace("d'intention", 'd’intention')));
  assert.equal(r.code, 0, r.errs);
});

for (const phrase of ["jusqu'à convergence", 'Jusqu’au critère de convergence', 'y compris les MINEURS']) {
  test(`a. clause « ${phrase} » : FAIL, même sous --legacy`, () => {
    for (const flags of [[], ['--legacy']]) {
      const r = lint(plan(REGLES, `<p>Corrige tout ${phrase}.</p>`), ...flags);
      assert.equal(r.code, 1);
      assert.match(r.errs, /Clause de revue sans fin/);
    }
  });
}

test('a. clause cachée dans un commentaire HTML : ignorée', () => {
  assert.equal(lint(plan(REGLES, "<!-- jusqu'à convergence -->")).code, 0);
});

const MANQUES = [
  ['b', 'Budget total', REGLES.replace('Budget total : 400 lignes', 'Budget total : à définir'), /Budget total absent/],
  ['c', 'Chips', REGLES.replace('Chips : autorisés', 'Chips : peut-être'), /Chips absent/],
  ['d', "Fiche d'intention", REGLES.replace('.chantier/intention.md', ''), /Fiche d'intention absente/],
];

for (const [id, nom, regles, re] of MANQUES) {
  test(`${id}. ${nom} manquant : FAIL, avertissement sous --legacy`, () => {
    const r = lint(plan(regles));
    assert.equal(r.code, 1);
    assert.match(r.errs, re);
    const l = lint(plan(regles), '--legacy');
    assert.equal(l.code, 0, l.errs);
    assert.match(l.warns, re);
  });
}

test('c. « Chips : interdits » accepté', () => {
  assert.equal(lint(plan(REGLES.replace('autorisés', 'interdits'))).code, 0);
});

test('plan EN valide : PASS, libellés EN acceptés', () => {
  const r = lint(plan(REGLES_EN, '<p>As written, nothing else.</p>'));
  assert.equal(r.code, 0, r.errs);
});

test('« Doublures de test : règle standard » accepté, ligne absente refusée', () => {
  assert.equal(lint(plan(REGLES.replace('aucune', 'règle standard'))).code, 0);
  const r = lint(plan(REGLES.replace('<p>Doublures de test : aucune</p>', '')));
  assert.equal(r.code, 1);
  assert.match(r.errs, /Doublures de test absent/);
  assert.equal(lint(plan(REGLES_EN.replace('none', 'standard rule'))).code, 0);
});

for (const phrase of ['until convergence', 'until clean', 'including minors', 'minor ones included']) {
  test(`a. clause EN « ${phrase} » : FAIL, même sous --legacy`, () => {
    for (const flags of [[], ['--legacy']]) {
      const r = lint(plan(REGLES_EN, `<p>Fix everything ${phrase}.</p>`), ...flags);
      assert.equal(r.code, 1);
      assert.match(r.errs, /Clause de revue sans fin/);
    }
  });
}

test('phrase interdite EN : FAIL', () => {
  const r = lint(plan(REGLES_EN, '<p>As discussed, do it.</p>'));
  assert.equal(r.code, 1);
  assert.match(r.errs, /Phrase interdite/);
});

test('« undefined » dans le texte visible : FAIL', () => {
  const r = lint(plan(REGLES, '<p>Lot undefined</p>'));
  assert.equal(r.code, 1);
  assert.match(r.errs, /undefined/);
});

test('étiquettes de lot dupliquées : FAIL', () => {
  const dup = (n) => `<div class="lot" id="lot-${n}"><span class="ln">LOT 1</span><p><strong>Agent</strong> a</p><pre class="cmd">x</pre><div class="done">ok</div>\n  </div>`;
  const r = lint(plan(REGLES, '', dup(2)).replace('<div class="lot" id="lot-1">', '<div class="lot" id="lot-1"><span class="ln">LOT 1</span>').replace('</nav>', '<a href="#lot-2">2</a></nav>'));
  assert.equal(r.code, 1);
  assert.match(r.errs, /Étiquette « lot 1 »/);
});

test('section vide : FAIL', () => {
  const r = lint(plan().replace('<section id="s-verif"><p>ok</p>', '<section id="s-verif"><h2>Vérif</h2>'));
  assert.equal(r.code, 1);
  assert.match(r.errs, /Section vide/);
});

test('flotte : « Dépend de » obligatoire, aucun/none accepté', () => {
  const flotte = (dep) => `<section id="s-flotte"><span class="flotte-nom">v</span><code class="plage-ids">aucun compteur global</code>
<ul class="flotte-freres"><li>b</li></ul>${dep}</section><a href="#s-flotte">f</a>`;
  assert.equal(lint(plan(REGLES, flotte(''))).code, 1);
  assert.equal(lint(plan(REGLES, flotte('<p>Dépend de : aucun</p>'))).code, 0);
  assert.equal(lint(plan(REGLES_EN, flotte('<p>Depends on: none</p>'))).code, 0);
});

test('chemin absolu sous le dépôt cible introuvable : FAIL ; npm run inconnu : FAIL', () => {
  const dir = mkdtempSync(join(tmpdir(), 'preflight-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{"scripts":{"test":"x"}}');
    const file = join(dir, 'plan.html');
    writeFileSync(file, plan(REGLES, `<p><code>${dir}/src/absent.mjs</code> ${'.'.repeat(300)} <code>${dir}/src/neuf.mjs</code> (new) <code>npm run nope</code> <code>npm run test</code></p>`));
    const r = spawnSync('node', [LINT, file, dir], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /introuvable sur disque : .*absent\.mjs/);
    assert.doesNotMatch(r.stdout, /neuf\.mjs/);
    assert.match(r.stdout, /npm run nope/);
    assert.doesNotMatch(r.stdout, /npm run test/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fiche d\'intention existante : « Validée par : <nom> » exigé, avertissement sous --legacy', () => {
  const dir = mkdtempSync(join(tmpdir(), 'preflight-'));
  try {
    const file = join(dir, 'plan.html');
    writeFileSync(file, plan());
    const run = (...flags) => spawnSync('node', [LINT, file, dir, ...flags], { encoding: 'utf8' });
    mkdirSync(join(dir, '.chantier'));
    const sheet = (line) => writeFileSync(join(dir, '.chantier', 'intention.md'), `# Intention\n\n${line}\n`);
    for (const line of ['**Validée par :** EN ATTENTE', 'Validée par :', 'Approved by: PENDING', 'Validée par : <nom>', 'aucune ligne de validation']) {
      sheet(line);
      const r = run();
      assert.equal(r.status, 1, line);
      assert.match(r.stdout, /non validée/);
      const l = run('--legacy');
      assert.equal(l.status, 0, line);
      assert.match(l.stdout, /non validée/);
    }
    for (const line of ['Validée par : Franck, 2026-10-06', '**Approved by:** Franck Djiongo']) {
      sheet(line);
      const r = run();
      assert.equal(r.status, 0, r.stdout);
      assert.doesNotMatch(r.stdout, /non validée/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
