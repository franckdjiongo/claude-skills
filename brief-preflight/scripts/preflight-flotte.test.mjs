// Disjonction des fichiers du lint de vague : node --test brief-preflight/scripts/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FLOTTE = fileURLToPath(new URL('./preflight-flotte.mjs', import.meta.url));

const plan = (slug, files, dep = 'aucun') => `<html><body><section id="s-flotte"><span class="flotte-nom">v</span>
<code class="plage-ids">aucun compteur global</code><ul class="flotte-freres"><li>autre</li></ul>
<p>Dépend de : ${dep}</p><p><strong>Fichiers touchés</strong> : ${files.map((f) => `<code>${f}</code>`).join(', ')}</p></section>
<code class="commit-msg">chantier(${slug}): lot 1 — x</code></body></html>`;

function vague(a, b) {
  const dir = mkdtempSync(join(tmpdir(), 'flotte-'));
  try {
    writeFileSync(join(dir, 'a-socle.html'), a);
    writeFileSync(join(dir, 'b-suite.html'), b);
    // HOME isolé : un run PASS écrit son journal sous ~/.claude.
    const r = spawnSync('node', [FLOTTE, dir], { encoding: 'utf8', env: { ...process.env, HOME: dir } });
    return { code: r.status, out: r.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('même fichier dans deux plans sans ordre : FAIL', () => {
  const r = vague(plan('socle', ['src/a.mjs', 'README.md']), plan('suite', ['src/b.mjs', 'README.md']));
  assert.equal(r.code, 1);
  assert.match(r.out, /FICHIERS communs à a-socle\.html et b-suite\.html : README\.md/);
});

test('même fichier avec « Dépend de » : PASS ; fichiers disjoints : PASS', () => {
  assert.equal(vague(plan('socle', ['README.md']), plan('suite', ['README.md'], 'socle')).code, 0);
  assert.equal(vague(plan('socle', ['src/a.mjs']), plan('suite', ['src/b.mjs'])).code, 0);
});
