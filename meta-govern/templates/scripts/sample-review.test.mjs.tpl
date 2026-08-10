// Template: templates/scripts/sample-review.test.mjs.tpl
// (aucune variable de template — le rendu est une copie littérale)
//
// Rendu en `.claude/scripts/sample-review.test.mjs` (frère du sampler).
// Couvre `tierOf`, la SEULE fonction pure exportée par sample-review.mjs — le
// `isEntry` guard du script existe justement pour que cet import n'exécute pas
// le sampler (pas de git réel requis). risk-tiers.json.tpl affirme que tierOf
// est "covered by sample-review's tests" ; ce fichier est cette preuve.
// Runner : vitest (glob par défaut, aucun vitest.config requis — `.claude/scripts/**/*.test.mjs`
// est déjà sous le include standard `**/*.{test,spec}.?(c|m)[jt]s?(x)`).

import { describe, it, expect } from 'vitest';
import { tierOf } from './sample-review.mjs';

// Jeu de tiers minimal et déterministe, indépendant de risk-tiers.json — la
// précédence (critique -> bas -> standard) est ce qu'on prouve ici, pas le
// contenu réel des globs du projet.
const TIERS = {
  critique: ['src/domain/**', '.claude/hooks/**'],
  standard: ['src/**'],
  bas: ['**/assets/**', '**/*.css'],
};

describe('sample-review — tierOf (fonction pure)', () => {
  it('classe un chemin critique', () => {
    expect(tierOf('src/domain/budget.ts', TIERS)).toBe('critique');
    expect(tierOf('.claude/hooks/enforce-workflow.mjs', TIERS)).toBe('critique');
  });

  it('classe un chemin standard non spécifique', () => {
    expect(tierOf('src/react-app/App.tsx', TIERS)).toBe('standard');
  });

  it('classe un chemin bas (assets / css)', () => {
    expect(tierOf('src/react-app/assets/logo.png', TIERS)).toBe('bas');
    expect(tierOf('src/react-app/components/Button.css', TIERS)).toBe('bas');
  });

  it('précédence : bas bat standard sur un chevauchement (.css sous src/**)', () => {
    // `src/foo/bar.css` matche à la fois `src/**` (standard) et `**/*.css` (bas) —
    // TIER_PRECEDENCE = ['critique', 'bas', 'standard'] doit renvoyer 'bas'.
    expect(tierOf('src/foo/bar.css', TIERS)).toBe('bas');
  });

  it('précédence : critique bat standard sur un chevauchement (src/domain sous src/**)', () => {
    expect(tierOf('src/domain/repositories/x.ts', TIERS)).toBe('critique');
  });

  it('défaut : un chemin non matché retombe sur standard (jamais silencieusement exempté)', () => {
    expect(tierOf('scripts/unrelated.sh', TIERS)).toBe('standard');
    expect(tierOf('', TIERS)).toBe('standard');
  });

  it('normalise les séparateurs Windows avant de matcher', () => {
    expect(tierOf('src\\domain\\budget.ts', TIERS)).toBe('critique');
  });

  it('sans second argument, retombe sur les DEFAULT_TIERS internes du script', () => {
    // DEFAULT_TIERS du script inclut déjà 'src/domain/**' en critique et
    // '.claude/hooks/**' — on ne fige pas leur contenu exact ici (ça vit dans
    // sample-review.mjs), seulement le fait qu'un appel sans tiers ne crashe pas
    // et renvoie une des trois clés connues.
    expect(['critique', 'standard', 'bas']).toContain(tierOf('src/domain/x.ts'));
  });
});
