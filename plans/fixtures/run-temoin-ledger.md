# RUN-TÉMOIN — ship-polished-ui Phase 2 exécutée en réel

Fixture : `plans/fixtures/run-temoin/index.html` (hero + 2 sections + 1 bouton avec hover/focus).
Servie via `python3 -m http.server 60060 --bind 127.0.0.1` (arrêtée en fin de run).
Rendu réel : Playwright 1.61.1 / Chromium (headless), deviceScaleFactor 2.
Screenshots : `plans/fixtures/run-temoin/shots/`. Aucun visuel inventé — tout cliché ci-dessous est un fichier réel sur disque.

## Matrice de scope (postée AVANT le premier screenshot — checklist §1)

Surfaces : `hero`, `section-primitives` (3 cards), `section-stats`, `footer`, `bouton` (interaction-reached : hover + focus).
Grille surfaces × viewports : **320 / 375 / 768 / 1280** (les 4 classes d'appareil rendues — sinon verdict INVALIDE, gate binaire §1b/§8).
Transverses : contraste palette, focus clavier, reduced-motion, overflow horizontal (scrollWidth/clientWidth), touch-target.

| Surface            | Viewport | État        | Interaction-reached |
|--------------------|----------|-------------|---------------------|
| hero               | 320/375/768/1280 | initial | non |
| section-primitives | 320/375/768/1280 | initial | non |
| section-stats      | 320/375/768/1280 | initial | non |
| footer             | 320/375/768/1280 | initial | non |
| bouton             | 375 / 1280 | hover, focus | oui |

---

## VERIFICATION LEDGER — run-temoin — 2026-07-04

| Surface          | Viewport | État        | Verdict     | Preuve                                                   |
|------------------|----------|-------------|-------------|----------------------------------------------------------|
| hero             | 320      | initial     | PASS        | vp-320-full.png · scrollW 320=clientW 320                 |
| section-primitives | 320    | initial     | PASS        | vp-320-full.png (3 cards empilées 1 col, pas d'overflow)  |
| section-stats    | 320      | initial     | PASS        | vp-320-full.png (3 stats k/l visibles, wrap propre)       |
| footer           | 320      | initial     | PASS        | vp-320-full.png (texte complet, non clippé)               |
| hero             | 375      | initial     | PASS        | vp-375-full.png · scrollW 375=clientW 375                 |
| section-primitives | 375    | initial     | PASS        | vp-375-full.png                                           |
| section-stats    | 375      | initial     | PASS        | vp-375-full.png                                           |
| footer           | 375      | initial     | PASS        | vp-375-full.png                                           |
| hero             | 768      | initial     | PASS        | vp-768-full.png · scrollW 768=clientW 768                 |
| section-primitives | 768    | initial     | PASS        | vp-768-full.png (cards passent en 1 col <720px @media)    |
| section-stats    | 768      | initial     | PASS        | vp-768-full.png                                           |
| footer           | 768      | initial     | PASS        | vp-768-full.png                                           |
| hero             | 1280     | initial     | PASS        | vp-1280-full.png · scrollW 1280=clientW 1280              |
| section-primitives | 1280   | initial     | PASS        | vp-1280-full.png (grille 3 colonnes)                      |
| section-stats    | 1280     | initial     | PASS        | vp-1280-full.png                                          |
| footer           | 1280     | initial     | PASS        | vp-1280-full.png                                          |
| bouton           | 375      | hover       | PASS        | btn-375-hover.png (lift + shadow accrue)                  |
| bouton           | 375      | focus       | PASS        | btn-375-focus.png (ring #0b3b2e visible, offset 3px)      |
| bouton           | 1280     | hover       | PASS        | btn-1280-hover.png                                        |
| bouton           | 1280     | focus       | PASS        | btn-1280-focus.png (ring visible)                         |
| contraste corps  | —        | palette     | PASS 16.43:1 | contrast-check.mjs — ink #14171f / paper #f7f5ef         |
| contraste muted  | —        | palette     | PASS 7.27:1  | contrast-check.mjs — #4a5163 / #f7f5ef                   |
| contraste bouton | —        | palette     | PASS 7.48:1  | contrast-check.mjs — #ffffff / accent #1f5f4f           |
| contraste eyebrow| —        | palette     | PASS 6.86:1  | contrast-check.mjs — accent #1f5f4f / #f7f5ef           |
| contraste card   | —        | palette     | PASS 7.93:1  | contrast-check.mjs — #4a5163 / surface #ffffff          |
| focus clavier    | —        | tab sweep   | PASS        | Tab → activeElement=.btn (qa.mjs) ; ring btn-*-focus.png |
| reduced-motion   | —        | OS activé   | PASS        | reduced-motion-1280.png (hero+3 cards+btn complets, transition none) |
| overflow horiz.  | —        | 4 viewports | PASS        | qa.mjs : scrollWidth=clientWidth à 320/375/768/1280      |
| touch-target btn | —        | 44px premium | PASS 168×49.6px | qa.mjs boundingBox (≥44 AAA / Apple HIG)             |

**Verdict global : VALIDE.** Les 4 classes d'appareil (320/375/768/1280) ont été rendues (gate binaire satisfait). Aucune cellule `not-evidenced` ; chaque PASS porte un cliché réel + valeur mesurée. Aucune réduction de scope.

### Preuves non-couvertes (honnêteté — hors périmètre du run-témoin)
- **LCP/CLS/INP** : non mesurés (fixture statique triviale, aucun budget perf demandé par le WP-04). Sur une vraie livraison ce serait `not-evidenced` → à mesurer (Lighthouse mobile), jamais un PASS déclaratif.
- **WebKit/Safari** : non exécuté ce run (pas de livraison client). Sur livraison : `npx playwright screenshot --browser=webkit` requis.

### Outils utilisés (correspondance §Phase 2)
- Rendu + screenshots + métriques box : **Playwright/Chromium** (fallback « dernier recours » du tableau outillage — Claude Preview/Chrome MCP non pilotés ici ; consigné comme l'exige la règle « every fallback actually used is recorded »).
- Contraste : **`scripts/contrast-check.mjs`** (WCAG 2.x, calculé, jamais estimé à l'œil).
- scrollWidth/clientWidth + touch-target + focus : script node `qa.mjs` via `page.evaluate` / `boundingBox`.
