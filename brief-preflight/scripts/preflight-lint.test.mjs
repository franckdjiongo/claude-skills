// Tests des règles dures du lint (A1-A5, G) : node --test brief-preflight/scripts/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LINT = fileURLToPath(new URL('./preflight-lint.mjs', import.meta.url));
const DOUBLURES = [
  'seulement parce que leurs doublures, fixtures ou mocks ne fournissent pas le nouveau membre',
  'uniquement par ajout du nouveau membre',
  'aucune valeur existante modifiée, aucun snapshot régénéré',
  'aucune assertion ajoutée, retirée ou modifiée',
  'aucun test sauté ni marqué en échec attendu',
  'aucun fichier de production touché hors liste',
  'avec son nombre de lignes ajoutées, dans le message de commit du lot et dans le rapport final',
  'le relecteur du lot vérifie ces fichiers',
  'en une seule passe par lot',
  "si elle reste rouge, quelle qu'en soit la cause, c'est un arrêt immédiat",
  'reste un arrêt et une question au hub',
  'peut être restreint, jamais élargi',
  'son absence signifie : aucune pré-autorisation',
].join('. ');

const REGLES = `<p>Budget total : 400 lignes</p><p>Chips : autorisés</p><p>Fiche d'intention : .chantier/intention.md</p>`;

function plan(regles = REGLES, extra = '') {
  const sections = ['s-intention', 's-contexte', 's-approbation', 's-verif', 's-convex']
    .map((id) => `<section id="${id}"><p>ok</p></section>`)
    .join('');
  const nice = `<section id="s-nice"><ul>${'<li>x</li>'.repeat(5)}</ul></section>`;
  return `<!doctype html><html><body><nav><a href="#lot-1">Lot 1</a></nav>${sections}${nice}
<section id="s-lots"><p class="classe-doublures">${DOUBLURES}</p>
<div class="lot" id="lot-1"><p><strong>Agent</strong> sonnet</p><pre class="cmd">npm test</pre>
<code class="commit-msg">chantier(x): lot 1 — fin</code><div class="done">ok</div>
</div></section>${regles}${extra}</body></html>`;
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
  ['c', 'Chips', REGLES.replace('Chips : autorisés', 'Chips : peut-être'), /chips absente/],
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
