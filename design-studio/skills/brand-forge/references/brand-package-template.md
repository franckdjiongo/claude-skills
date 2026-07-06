# brand-package.md — Handoff Schema (verbatim, WP-15 / plan annex A4)

The final Handoff Build step (SKILL.md Step 6) writes `docs/branding/brand-package.md`
following this schema **exactly**. It is the contract consumed by design-forge BRIEF
and ship-polished-ui (which treat its palette/typo as **brand-fixed**). The `tokens:`
block is the **exact mirror** of `docs/branding/brand-tokens.css`.

## Schema (copy verbatim, fill the {…})

```
# Brand Package — {Nom retenu}
statut_verification: PASS|CONDITIONAL (+ réserve exacte du verifier si CONDITIONAL)
domaine: {domaine à enregistrer} (RDAP vérifié le {date})
tokens:            # miroir exact de brand-tokens.css
  --brand-bg / --brand-surface / --brand-ink / --brand-accent (+ variantes dark)
typographie:
  display: {nom + URL de chargement + licence}
  texte:   {nom + URL + licence}
voix: {3 adjectifs + 1 phrase d'exemple}
assets: public/brand/logo.svg · favicon.svg · og-image.png · {variantes dark}
slogans_valides: [{…}]
interdits_specifiques: {ce que cette marque ne fait jamais visuellement}
```

## Companion — brand-tokens.css

CSS custom properties, light + dark, mirroring the `tokens:` block above. Must parse
(the lead runs a simple read + a regex check that `--property:` declarations exist).

```css
:root {
  --brand-bg: {hex};
  --brand-surface: {hex};
  --brand-ink: {hex};
  --brand-accent: {hex};
  --brand-font-display: "{display family}", {fallback stack};
  --brand-font-text: "{text family}", {fallback stack};
  /* type scale, e.g. --brand-step-0 … --brand-step-4 */
}
:root[data-theme="dark"], .dark {
  --brand-bg: {hex-dark};
  --brand-surface: {hex-dark};
  --brand-ink: {hex-dark};
  --brand-accent: {hex-dark};
}
```

All text/background contrast pairs in these tokens must have been **calculated**
(not estimated) with `scripts/contrast-check.mjs` and pass WCAG AA before the package
is written — see visual-identity.md §Creative Gates.
