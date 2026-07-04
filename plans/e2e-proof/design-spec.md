# DESIGN SPEC — HtmlShare landing publique — 2026-07-04

> Produite en Phase 1 de ship-polished-ui v2, APRÈS lecture de design-direction.md +
> motion-craft.md et chargement des contrats brand-fixed (design-intent.md,
> brand-package.md, brand-tokens.css). Chaque rubrique est une DÉCISION tracée aux
> règles A1-xx, pas un adjectif. La palette et la typo sont brand-fixed : je ne
> re-choisis rien, j'importe brand-tokens.css.

## Exploration 3 directions (requête ambitieuse — design-direction Part 3)

- **Direction A — « CLI-as-page » :** Space Grotesk sobre / near-black amber ember /
  éditorial 12-col à offsets asymétriques / signature = la ligne `htmlshare deploy`
  qui se résout en URL propre. Registre : la sortie d'un bon CLI rendue en page.
- **Direction B — « Gallery of artifacts » :** maximalisme éditorial / mur de cartes
  d'artefacts rendus / signature = hover qui « ouvre » un artefact. Rejetée : un mur
  de cartes trahit le réflexe template (A1-06/A1-13) et noie la promesse unique.
- **Direction C — « Terminal brutaliste » :** tout en IBM Plex Mono, grille visible,
  bordures 1px partout. Rejetée : mono partout tue la hiérarchie et l'ergonomie de
  lecture (A1-02) ; le mono doit rester un signal porteur, pas le corps.
- **→ Choisie : A** — parce que le design-intent fixe déjà l'archétype Developer/
  Technical (lignée Linear/Vercel/Raycast) et LE moment signature (deploy→URL) ; A
  est la seule qui met la promesse produit *littéralement* à l'écran sans accumuler
  d'effets. B et C ajoutent du bruit là où l'intent demande du calme + un seul ember.

## Les 8 rubriques

1. **Direction typographique :** Space Grotesk (display) + Inter (texte) + IBM Plex
   Mono (surfaces URL/commande) — parce que le produit rend des *artefacts techniques*
   et que sa valeur EST l'URL/HTML rendu : montrer la commande et l'URL en mono rend
   la promesse littérale au lieu de l'affirmer (design-intent typo ; A1-02). Inter est
   INTERDIT en display (règle de marque dure). Display >48px → tracking −0.03em,
   line-height 1.0–1.1 ; corps → 1.5–1.6, mesure 45–75ch ; labels caps → +0.08em.

2. **Palette nommée : « Ember-on-warm-dark »** — base `--brand-bg` #08070a + accent
   unique `--brand-accent` #e3a64b (ambre signature), encre crème #f3efe6 — dérivée de
   l'attribut marque « one warm ember of color » (icon-src.svg/og-src.svg).
   **brand-package présent : OUI → valeurs brand-fixed**, importées telles quelles de
   brand-tokens.css (aucun hex retapé). Règle amber rationné (A1-04) : ambre UNIQUEMENT
   sur le CTA primaire (1/région), le highlight de l'URL rendue, et ≤1 ember héro —
   total ≤4 sur la page. Jamais violet/lavande, jamais gradient violet→bleu, jamais
   glow néon. Light = paper chaud #faf6ee ; texte-accent light = #8a5a12 (l'ambre pur
   est décoratif/large only en light, 1.98:1 comme texte = fail interdit).

3. **Primitive de layout :** grille éditoriale 12 colonnes à offsets asymétriques (le
   contenu n'est jamais centré-symétrique par défaut), répétée sur : hero (titre
   décalé + chrome produit en contrepoids), section preuve (rangées séparées par
   hairline, pas de cartes), section « comment ça marche », rappel CTA, footer. UNE
   primitive partout (A1-07) ; interdit de mélanger 3+ styles de section/carte (A1-13 :
   séparation par whitespace → shift de luminosité → élévation légère → bordure en
   dernier recours).

4. **Signature moment :** le **reveal deploy→URL** — au chargement du héro, une ligne
   `htmlshare deploy synthese-reunion.html` se résout en `view.htmlshare.ca/aq7f2` qui
   se pose, l'ambre s'allumant sur le lien fini. Localisé : le chrome produit (faux
   cadre navigateur/terminal) dans le héro, contrepoids du titre. UNE région, UN
   moment (A1-01 / motion-craft §⑧). **Technologie : CSS + Web Animations API natives**
   — un resolve de texte/URL + états hover ne demandent RIEN au-dessus du plancher
   natif ; GSAP/Three.js/3D ici = slop tell, banni par le design-intent. Étage justifié :
   plancher CSS suffit, aucune montée d'étage.

5. **Références nommées (Match/Change) :**
   - *Linear* — MATCH : calme instrument-panel, rythme d'espacement, un seul accent
     rationné prouvant la retenue. CHANGE : ambre chaud au lieu de leurs gris/bleus
     froids ; contenu = promesse « HTML → lien ».
   - *Vercel* — MATCH : narratif « deploy → URL live », discipline near-monochrome des
     surfaces. CHANGE : chaleur (paper + ember) vs leur noir/blanc clinique.
   - *Raycast* — MATCH : traiter la surface que le produit REND (chrome URL/code) comme
     le visuel héro de première classe. CHANGE : registre mono IBM Plex + palette warm.
   → C'est le référent externe des checks Phase 2 (swap-brand + craft greenfield).

6. **Motion inventory** (motion-craft lu ; plancher CSS partout) :
   - **hover/press :** CTA amber (translateY −2px + surface légèrement plus claire,
     180ms expo-out) ; liens (soulignement qui grandit, 150ms) ; bouton copy-URL (état
     confirmé crisp « Copié »/« Copied ») ; toggle langue (fond token au survol). Jamais
     `linear`/`ease` par défaut.
   - **entrance héro :** titre en 2 lignes, stagger ≤80ms/ligne, opacity+rise 8px,
     500ms cubic-out ; le chrome produit apparaît puis joue le reveal deploy→URL.
   - **reveals scroll :** opacity + rise 8px, 400–700ms, à l'entrée de section, scroll
     NATIF exclusivement (pas de scroll-jacking, pas de pin/parallax). Défaut sous
     `@supports (animation-timeline: view())` avec état final visible par défaut.
   - **reduced-motion :** `prefers-reduced-motion: reduce` → deploy reveal montre l'URL
     finale STATIQUE (aucune keyframe), rises deviennent instantanés, rien n'auto-play ;
     layout complet et utilisable à zéro motion (WCAG 2.3.3, motion-craft §⑤).

7. **Stratégie média : AUCUN média lourd** (pas de photo/IA/vidéo/3D) — parce que le
   produit N'A PAS besoin d'imagerie : son visuel EST sa propre surface rendue (le
   chrome URL/commande en mono), traité comme héro (A1-14 : le média est décidé par le
   produit). Une vidéo d'ambiance sur une landing d'outil sobre serait une faute.
   → production : néant à router ; le seul « visuel » est du DOM réel (mono + tokens),
   ce qui sert aussi LCP (texte réel, pas image) et CLS (hauteur réservée). Grain SVG
   `feTurbulence` (fractalNoise, baseFreq 0.85) à 2–4% sur le fond pour la qualité
   « imprimée » (A1-05), inline, zéro requête. Règles perf motion-craft §⑨ : sans objet
   (pas de vidéo/image).

8. **Persona :** ingénieur frontend senior avec un passé de design d'imprimé et
   d'outillage CLI — produit des choix de type/espacement précis et une retenue
   d'accent qu'un « fais joli » ne produirait pas. **Seed d'art direction :** « sortie
   d'un CLI bien fait, rendue comme une page » — calme, sombre, mono-literate, un seul
   ember. **Données : RÉELLES du produit** (README + spec htmlshare) — la vraie promesse
   (fichier HTML autonome → URL propre ouvrable dans tout navigateur, pas de sign-up
   pour lire, une commande), les vrais domaines (view.htmlshare.ca / htmlshare.ca), le
   vrai slogan « Share HTML that just opens. ». Zéro lorem ipsum (A1-10). Bilingue FR+EN
   première classe, toggle langue non intrusif.

## Conformité contrats (rappel pour la Phase 2)

- Tous les `--brand-*` importés de brand-tokens.css (copie locale citée) ; zéro hex
  hors tokens.
- ≤4 usages d'ambre, zéro sur le corps de texte, zéro comme bordure/divider par défaut.
- Light : texte-accent = #8a5a12 (jamais #e3a64b comme texte de corps clair).
- ≥3 surfaces d'élévation en dark (base #08070a → panel intermédiaire → chrome #141117).
- Focus visible ≥3:1 sur chaque interactif ; AA partout, deux thèmes.
- Pas de scroll horizontal 375→1920.
- Un seul moment choréographié ; interdits visuels respectés (pas de 3 cartes icônes
  identiques, pas de rayon uniforme partout, pas de gradient banni).
