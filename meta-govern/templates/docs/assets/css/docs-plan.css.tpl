/* docs-plan.css — Styles spécifiques aux documents de type « plan ».
 *
 * Chargé automatiquement par template.mjs (renderPage) quand o.type === 'plan',
 * en complément de docs-theme.css. NE JAMAIS éditer docs-theme.css : ce fichier
 * sibling porte tout l'habillage plan (barre de progression live + couleurs de
 * statut des tâches dans la TOC + badges de statut inline).
 *
 * Contrat de données partagé (voir docs-plan.js) :
 *   - statut d'une tâche ∈ {todo, in-progress, done, cancelled, blocked}
 *   - docs-plan.js pose data-toc-status sur le <li> TOC correspondant
 *   - docs-plan.js insère <div class="plan-progress"> après .docs-header
 *
 * Les couleurs réutilisent les tokens :root de docs-theme.css avec repli :
 *   --doc-accent (accent du type), --ok/--success, --warn, --danger/--error,
 *   --muted, --border, --bg-soft. Repli codé en dur si le token est absent.
 */

:root {
  /* Tokens de statut plan — dérivés des tokens du thème avec repli sûr. */
  --plan-todo: var(--muted, #8a8f98);
  --plan-in-progress: var(--doc-accent, var(--accent, #2f6feb));
  --plan-done: var(--ok, var(--success, #1f9d55));
  --plan-cancelled: var(--danger, var(--error, #d23f3f));
  --plan-blocked: var(--warn, #d98e00);
  --plan-track: var(--bg-soft, rgba(127, 127, 127, 0.16));
  --plan-track-border: var(--border, rgba(127, 127, 127, 0.28));
}

/* ───────────────────────── Barre de progression live ───────────────────── */
/* Insérée par docs-plan.js immédiatement après <header class="docs-header">,
 * donc enfant direct de .docs-article (HORS du padding de .docs-content) → on
 * réintroduit ici une marge horizontale qui s'aligne sur ce padding, sinon la
 * barre collerait aux bords de la carte. Reflète le % de tâches/pipeline + un
 * segment par item, et reste COLLÉE en haut au défilement (un plan est long).
 *
 * Sticky : un ancêtre overflow:hidden piège position:sticky ; .docs-article
 * (thème partagé) en porte un pour clipper l'en-tête. docs-plan.css n'étant
 * chargé QUE sur les plans, on libère l'overflow ici et on re-clippe les coins
 * de l'en-tête localement (clip-path) — aucun impact sur les autres docs. */
.docs-article { overflow: visible; }
.docs-header {
  border-top-left-radius: var(--r-lg);
  border-top-right-radius: var(--r-lg);
  clip-path: inset(0 round var(--r-lg) var(--r-lg) 0 0);
}

.plan-progress {
  position: sticky;
  top: 0.75rem;
  z-index: 25;
  /* Aligne la barre sur le padding horizontal de .docs-content (clamp) tout en
     restant un enfant de .docs-article. */
  margin: 1.4rem clamp(1.5rem, 4vw, 3.25rem) 2rem;
  padding: 0.95rem 1.15rem 1.05rem;
  border: 1px solid var(--plan-track-border);
  border-radius: var(--r-md);
  background:
    radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--plan-in-progress) 12%, transparent), transparent 60%),
    color-mix(in srgb, var(--surface) 86%, transparent);
  -webkit-backdrop-filter: blur(12px) saturate(1.5);
  backdrop-filter: blur(12px) saturate(1.5);
  box-shadow: var(--shadow-md);
}
/* Liseré d'accent en haut de la barre — rappelle l'accent de type du plan. */
.plan-progress::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  border-radius: var(--r-md) var(--r-md) 0 0;
  background: linear-gradient(90deg, var(--plan-in-progress), color-mix(in srgb, var(--plan-in-progress) 25%, transparent) 80%, transparent);
}

.plan-progress__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
  font-size: 0.82rem;
}

.plan-progress__label {
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: var(--ink-soft);
}

.plan-progress__pct {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--plan-done);
}

.plan-progress__pct[data-empty="true"] {
  color: var(--ink-muted);
}

/* Piste segmentée : un segment par item. Fond creusé (inset) pour la profondeur. */
.plan-progress__track {
  display: flex;
  gap: 3px;
  height: 10px;
  padding: 2px;
  border-radius: 999px;
  background: var(--surface-sunken);
  box-shadow: inset 0 1px 2px var(--hairline);
  overflow: hidden;
}

.plan-progress__seg {
  flex: 1 1 0;
  min-width: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--plan-todo) 30%, transparent);
  transition: background 0.25s ease, box-shadow 0.25s ease;
}

.plan-progress__seg[data-done="true"] {
  background: linear-gradient(180deg, color-mix(in srgb, var(--plan-done) 92%, #fff), var(--plan-done));
  box-shadow: 0 0 8px -1px color-mix(in srgb, var(--plan-done) 55%, transparent);
}
/* Coloration fine des segments par statut (mode repli par tâche). */
.plan-progress__seg[data-status="in-progress"] { background: color-mix(in srgb, var(--plan-in-progress) 55%, transparent); }
.plan-progress__seg[data-status="blocked"] { background: color-mix(in srgb, var(--plan-blocked) 60%, transparent); }
.plan-progress__seg[data-status="cancelled"] { background: color-mix(in srgb, var(--plan-cancelled) 45%, transparent); }

/* Repli si color-mix n'est pas supporté : segment grisé visible quand même. */
@supports not (background: color-mix(in srgb, red 50%, blue)) {
  .plan-progress { background: var(--surface); }
  .plan-progress__seg { background: var(--plan-track-border); }
  .plan-progress__seg[data-done="true"] { background: var(--plan-done); }
}

/* Sur petit écran, la barre sticky reprend toute la largeur. Le bouton
   « Sommaire » (.docs-toc-toggle) est lui aussi sticky top:0 (z-40, ~3rem de
   haut + marge) ; on épingle la barre EN DESSOUS pour que son en-tête
   (« Avancement … N/N ») ne se masque pas derrière le bouton. */
@media (max-width: 60rem) {
  .plan-progress { margin-left: 0; margin-right: 0; top: 4rem; }
}
@media (prefers-reduced-motion: reduce) {
  .plan-progress { -webkit-backdrop-filter: none; backdrop-filter: none; }
}

/* ───────────────────────── Statuts de tâche dans la TOC ─────────────────── */
/* docs-plan.js pose data-toc-status sur les <li class="lvl-3"> des tâches. */

/* La pastille de statut vit dans la gouttière À GAUCHE du bord (border-left du
   thème), pas collée au texte. On élargit le padding et on centre le rond dans
   cette gouttière ; le bord gauche prend la couleur du statut → lecture claire. */
.docs-toc li[data-toc-status] > a {
  position: relative;
  padding-left: 1.5em;
}

.docs-toc li[data-toc-status] > a::before {
  content: "";
  position: absolute;
  left: 0.55em;
  top: 50%;
  width: 7px;
  height: 7px;
  margin-top: -3.5px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 18%, transparent);
}

.docs-toc li[data-toc-status="todo"] > a {
  color: var(--plan-todo);
}
.docs-toc li[data-toc-status="in-progress"] > a {
  color: var(--plan-in-progress);
  border-left-color: var(--plan-in-progress);
  font-weight: 600;
}
.docs-toc li[data-toc-status="done"] > a {
  color: var(--plan-done);
  border-left-color: var(--plan-done);
}
/* Pastille « done » remplie d'une coche pleine plutôt qu'un simple point. */
.docs-toc li[data-toc-status="done"] > a::before {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--plan-done) 20%, transparent);
}
.docs-toc li[data-toc-status="blocked"] > a {
  color: var(--plan-blocked);
  border-left-color: var(--plan-blocked);
}
.docs-toc li[data-toc-status="cancelled"] > a {
  color: var(--plan-cancelled);
  border-left-color: var(--plan-cancelled);
  text-decoration: line-through;
  opacity: 0.78;
}

/* ───────────────────────── Badge de statut inline ──────────────────────── */
/* docs-plan.js peut injecter un badge sur le <h3 id="task-N"> reflétant son
 * statut effectif (attribut data-status ou dérivé des cases à cocher). */

.plan-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  margin-left: 0.6em;
  padding: 0.1em 0.6em;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 0.62em;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  vertical-align: middle;
  white-space: nowrap;
}

.plan-status::before {
  content: "";
  width: 0.55em;
  height: 0.55em;
  border-radius: 50%;
  background: currentColor;
}

.plan-status[data-status="todo"] {
  color: var(--plan-todo);
}
.plan-status[data-status="in-progress"] {
  color: var(--plan-in-progress);
}
.plan-status[data-status="done"] {
  color: var(--plan-done);
}
.plan-status[data-status="blocked"] {
  color: var(--plan-blocked);
}
.plan-status[data-status="cancelled"] {
  color: var(--plan-cancelled);
}

h3[data-status="cancelled"] {
  text-decoration: line-through;
  opacity: 0.7;
}

/* Horodatage de complétion (data-done-at) rendu discret après le titre. */
.plan-done-at {
  margin-left: 0.5em;
  font-size: 0.6em;
  font-weight: 500;
  color: var(--plan-todo);
  letter-spacing: 0.02em;
  vertical-align: middle;
}

@media (prefers-reduced-motion: reduce) {
  .plan-progress__seg {
    transition: none;
  }
}

/* ════════════════════════ Stratégie d'exécution + Pipeline ════════════════
 * Composants premium partagés par la section « Stratégie d'exécution » et la
 * « Pipeline Task List » que `execute-plan` injecte. Avant ceci, la stratégie
 * était dumpée dans un <pre> ASCII et la pipeline était une suite de listes à
 * cases indifférenciées (« tout a la même couleur, impossible de distinguer les
 * tâches »). Ici : cartes de groupe sectionnées, badge de MODE par groupe, badge
 * de TYPE D'ÉTAPE + cible (agent/skill) par item, liseré d'accent par type.
 *
 * Contrat préservé : chaque item pipeline reste un
 *   <li class="task-list-item"><label><input class="task-list-item-checkbox">…</label></li>
 * → check-step.mjs (scan regex input→</label>) et docs-plan.js (cases du
 * #pipeline-task-list) continuent de fonctionner sans changement.
 *
 * Palette de MODE (groupe) et de TYPE D'ÉTAPE (item). Saturée en light, éclaircie
 * en dark (un bloc d'override par thème). Les variantes soft/tint sont calculées
 * par color-mix sur la teinte de base. */
:root {
  --mode-delta: #7c4dff;
  --mode-batch: #0d9488;
  --mode-rigorous: #dc2626;
  --mode-standard: #2563eb;
  --mode-final: #b45309;
  --mode-midflight: #64748b;

  --step-implement: #2563eb;
  --step-review: #7c3aed;
  --step-spec: #4f46e5;
  --step-gate: #15803d;
  --step-audit: #0d9488;
  --step-state: #db2777;
  --step-commit: #64748b;
  --step-delta: #7c4dff;
  --step-tracer: #b45309;
  --step-validate: #15803d;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --mode-delta: #a78bfa;
    --mode-batch: #2dd4bf;
    --mode-rigorous: #f87171;
    --mode-standard: #60a5fa;
    --mode-final: #fbbf24;
    --mode-midflight: #94a3b8;
    --step-implement: #60a5fa;
    --step-review: #a78bfa;
    --step-spec: #818cf8;
    --step-gate: #4ade80;
    --step-audit: #2dd4bf;
    --step-state: #f472b6;
    --step-commit: #94a3b8;
    --step-delta: #a78bfa;
    --step-tracer: #fbbf24;
    --step-validate: #4ade80;
  }
}
:root[data-theme="dark"] {
  --mode-delta: #a78bfa;
  --mode-batch: #2dd4bf;
  --mode-rigorous: #f87171;
  --mode-standard: #60a5fa;
  --mode-final: #fbbf24;
  --mode-midflight: #94a3b8;
  --step-implement: #60a5fa;
  --step-review: #a78bfa;
  --step-spec: #818cf8;
  --step-gate: #4ade80;
  --step-audit: #2dd4bf;
  --step-state: #f472b6;
  --step-commit: #94a3b8;
  --step-delta: #a78bfa;
  --step-tracer: #fbbf24;
  --step-validate: #4ade80;
}

/* La barre de progression est sticky (top:0.75rem, ~5.5rem de haut). Sans marge
   de défilement, un saut d'ancre (#pipe-g4, #task-N, clic TOC) cale la cible
   SOUS la barre. On dégage l'espace pour toutes les ancres d'un plan. */
.docs-content :is(h2, h3),
.plan-group,
.plan-pipe-group { scroll-margin-top: 6.25rem; }

/* ── Badge de MODE (pastille colorée, small-caps, point d'accent) ────────── */
.plan-mode {
  --c: var(--mode-standard);
  display: inline-flex;
  align-items: center;
  gap: 0.42em;
  flex: 0 0 auto;
  padding: 0.2em 0.7em;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: color-mix(in srgb, var(--c) 78%, var(--ink-strong));
  background: color-mix(in srgb, var(--c) 13%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--c) 34%, transparent);
}
.plan-mode::before {
  content: "";
  width: 0.5em;
  height: 0.5em;
  border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 22%, transparent);
}
.plan-mode[data-mode="delta"] { --c: var(--mode-delta); }
.plan-mode[data-mode="batch"] { --c: var(--mode-batch); }
.plan-mode[data-mode="rigorous"] { --c: var(--mode-rigorous); }
.plan-mode[data-mode="standard"] { --c: var(--mode-standard); }
.plan-mode[data-mode="final"] { --c: var(--mode-final); }
.plan-mode[data-mode="midflight"] { --c: var(--mode-midflight); }

/* ── Préambule de la stratégie (décisions de branche/base) ───────────────── */
.plan-preamble {
  margin: 1.4rem 0 1.6rem;
  padding: 0.95rem 1.2rem;
  border: 1px solid var(--border);
  border-left: 3px solid var(--mode-standard);
  border-radius: var(--r-sm) var(--r-md) var(--r-md) var(--r-sm);
  background: linear-gradient(180deg, color-mix(in srgb, var(--mode-standard) 6%, var(--surface)), var(--surface));
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--ink-soft);
}
.plan-preamble strong { color: var(--ink-strong); }

/* ── Carte de groupe (commune stratégie + pipeline) ──────────────────────── */
.plan-group,
.plan-pipe-group {
  --c: var(--mode-standard);
  position: relative;
  margin: 0.95rem 0;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.plan-group[data-mode="delta"], .plan-pipe-group[data-mode="delta"] { --c: var(--mode-delta); }
.plan-group[data-mode="batch"], .plan-pipe-group[data-mode="batch"] { --c: var(--mode-batch); }
.plan-group[data-mode="rigorous"], .plan-pipe-group[data-mode="rigorous"] { --c: var(--mode-rigorous); }
.plan-group[data-mode="standard"], .plan-pipe-group[data-mode="standard"] { --c: var(--mode-standard); }
.plan-group[data-mode="final"], .plan-pipe-group[data-mode="final"] { --c: var(--mode-final); }
.plan-group[data-mode="midflight"], .plan-pipe-group[data-mode="midflight"] { --c: var(--mode-midflight); }

/* Liseré d'accent vertical à gauche, dans la couleur du mode. */
.plan-group::before,
.plan-pipe-group::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 35%, transparent));
}

.plan-group__head,
.plan-pipe-group__head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
  padding: 0.7rem 1rem 0.7rem 1.2rem;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 9%, var(--surface)), color-mix(in srgb, var(--c) 2%, var(--surface)) 70%, var(--surface));
  border-bottom: 1px solid var(--border);
}
.plan-group__title,
.plan-pipe-group__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: var(--ink-strong);
}
.plan-group__tasks,
.plan-pipe-group__count {
  margin-left: auto;
  flex: 0 0 auto;
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ink-muted);
  padding: 0.12em 0.6em;
  border-radius: 999px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
}

/* ── Corps de carte STRATÉGIE : liste de définitions clé → valeur ─────────── */
.plan-group__body {
  margin: 0;
  padding: 0.35rem 1.1rem 0.7rem 1.2rem;
}
.plan-group__body > div {
  display: grid;
  grid-template-columns: 7.5rem 1fr;
  gap: 0.2rem 1rem;
  padding: 0.45rem 0;
  border-top: 1px dashed var(--hairline);
}
.plan-group__body > div:first-child { border-top: 0; }
.plan-group__body dt {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-muted);
  padding-top: 0.12em;
}
.plan-group__body dd {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}
/* Le code en valeur peut casser sur un écran étroit (un long message de commit
   ou un nom de fichier ne doit jamais pousser une barre de défilement horizontale).
   overflow-wrap:anywhere ne coupe QUE si nécessaire → les courts identifiants
   (RA-ST-37, gg_*) restent intacts. */
.plan-group__body dd code,
.plan-step-text code { overflow-wrap: anywhere; }
.plan-flow { font-variant-numeric: tabular-nums; }
.plan-flow .arrow { color: var(--c); font-weight: 700; padding: 0 0.15em; }
@media (max-width: 38rem) {
  .plan-group__body > div { grid-template-columns: 1fr; gap: 0.1rem; }
}

/* ── Corps de carte PIPELINE : items à cocher différenciés par type ──────── */
/* Marge horizontale SYMÉTRIQUE et généreuse. Sans le qualifieur `.docs-content`,
   la règle de thème `.docs-content ul.contains-task-list { padding-left }`
   l'emporte (spécificité) et déséquilibre les côtés ; on monte en spécificité
   pour piloter les deux bords → les items ne collent plus au bord droit de la
   carte de groupe et respirent identiquement à gauche et à droite. */
.docs-content .plan-pipe-group .plan-pipe-list.contains-task-list {
  margin: 0;
  padding: 0.55rem 0.95rem 0.8rem;
  list-style: none;
}
.plan-pipe-list .task-list-item {
  --c: var(--step-implement);
  position: relative;
  display: block;
  margin: 0.32rem 0;
  padding: 0;
  border: 1px solid var(--border);
  border-left: 3px solid var(--c);
  border-radius: var(--r-sm);
  background: var(--surface-2);
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.plan-pipe-list .task-list-item:hover {
  background: color-mix(in srgb, var(--c) 6%, var(--surface-2));
  box-shadow: var(--shadow-xs);
}
.plan-pipe-list .task-list-item > label {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
  flex-wrap: wrap;
  padding: 0.55rem 0.9rem 0.55rem 0.7rem;
  cursor: default;
}
/* La cible (agent/skill) est poussée à droite mais garde un retrait du bord. */
.plan-pipe-list .task-list-item > label .plan-step-via { margin-left: auto; }
.plan-pipe-list .task-list-item input.task-list-item-checkbox {
  flex: 0 0 auto;
  margin-right: 0.1rem;
}
/* Accent par type d'étape. */
.plan-pipe-list .task-list-item[data-step="implement"] { --c: var(--step-implement); }
.plan-pipe-list .task-list-item[data-step="review"] { --c: var(--step-review); }
.plan-pipe-list .task-list-item[data-step="spec"] { --c: var(--step-spec); }
.plan-pipe-list .task-list-item[data-step="gate"] { --c: var(--step-gate); }
.plan-pipe-list .task-list-item[data-step="audit"] { --c: var(--step-audit); }
.plan-pipe-list .task-list-item[data-step="state-machine"] { --c: var(--step-state); }
.plan-pipe-list .task-list-item[data-step="commit"] { --c: var(--step-commit); }
.plan-pipe-list .task-list-item[data-step="delta"] { --c: var(--step-delta); }
.plan-pipe-list .task-list-item[data-step="tracer"] { --c: var(--step-tracer); }
.plan-pipe-list .task-list-item[data-step="validate"] { --c: var(--step-validate); }

/* Item terminé : teinte verte douce + liseré « done » (état réel des cases). */
.plan-pipe-list .task-list-item:has(input:checked) {
  border-left-color: var(--plan-done);
  background: color-mix(in srgb, var(--plan-done) 8%, var(--surface-2));
}
.plan-pipe-list .task-list-item:has(input:checked) .plan-step-text {
  color: var(--ink-muted);
}

/* Badge de TYPE D'ÉTAPE : pastille pleine, largeur min pour aligner la colonne. */
.plan-step-badge {
  --c: var(--step-implement);
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 5.6rem;
  padding: 0.18em 0.5em;
  border-radius: 5px;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #fff;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 88%, #fff), var(--c));
  box-shadow: 0 1px 2px color-mix(in srgb, var(--c) 45%, transparent);
  white-space: nowrap;
  transform: translateY(0.05em);
}
.plan-step-badge[data-step="implement"] { --c: var(--step-implement); }
.plan-step-badge[data-step="review"] { --c: var(--step-review); }
.plan-step-badge[data-step="spec"] { --c: var(--step-spec); }
.plan-step-badge[data-step="gate"] { --c: var(--step-gate); }
.plan-step-badge[data-step="audit"] { --c: var(--step-audit); }
.plan-step-badge[data-step="state-machine"] { --c: var(--step-state); }
.plan-step-badge[data-step="commit"] { --c: var(--step-commit); }
.plan-step-badge[data-step="delta"] { --c: var(--step-delta); }
.plan-step-badge[data-step="tracer"] { --c: var(--step-tracer); }
.plan-step-badge[data-step="validate"] { --c: var(--step-validate); }

.plan-step-text {
  flex: 1 1 13rem;
  min-width: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ink);
  overflow-wrap: anywhere;
}
.plan-step-id { font-weight: 700; color: var(--ink-strong); }

/* Cible d'exécution (agent/skill/cmd/orchestrateur) : pastille mono, préfixée
   par son type en micro-capitales. */
.plan-step-via {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: baseline;
  gap: 0.4em;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--ink-soft);
  padding: 0.12em 0.6em;
  border-radius: 999px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  white-space: nowrap;
}
.plan-step-via::before {
  content: attr(data-via);
  font-family: var(--font-sans);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-muted);
}
/* Marqueur FOREGROUND : ne jamais backgrounder l'étape. */
.plan-step-fg {
  flex: 0 0 auto;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--plan-blocked);
  padding: 0.1em 0.42em;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--plan-blocked) 45%, transparent);
  background: color-mix(in srgb, var(--plan-blocked) 12%, var(--surface));
  white-space: nowrap;
}

/* ── Groupe TOC : libellé de groupe + tâches imbriquées (lvl-4) ───────────── */
/* Répond à « je veux voir dans le TOC que le Groupe 2 contient 2-3 tâches ». */
.docs-toc nav .toc-group { margin-top: 0.55rem; }
.docs-toc nav .toc-group > a {
  --c: var(--mode-standard);
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  padding: 0.34rem 0.6rem 0.34rem 0.7rem;
  margin-top: 0.15rem;
  border-left: 2px solid color-mix(in srgb, var(--c) 55%, transparent);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
  background: color-mix(in srgb, var(--c) 7%, transparent);
}
.docs-toc nav .toc-group[data-mode="delta"] > a { --c: var(--mode-delta); }
.docs-toc nav .toc-group[data-mode="batch"] > a { --c: var(--mode-batch); }
.docs-toc nav .toc-group[data-mode="rigorous"] > a { --c: var(--mode-rigorous); }
.docs-toc nav .toc-group[data-mode="standard"] > a { --c: var(--mode-standard); }
.docs-toc nav .toc-group[data-mode="final"] > a { --c: var(--mode-final); }
.docs-toc nav .toc-group[data-mode="midflight"] > a { --c: var(--mode-midflight); }
.docs-toc nav .toc-group__tag {
  flex: 0 0 auto;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--c) 72%, var(--ink-strong));
}
.docs-toc nav .toc-group__name {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}
.docs-toc nav .toc-group > a:hover { background: color-mix(in srgb, var(--c) 14%, transparent); }
/* Le groupe encode déjà son statut par la couleur du liseré gauche ; on retire
   la pastille ronde héritée des entrées de tâche (elle serrait le tag « GROUPE N »). */
.docs-toc nav .toc-group > a { padding-left: 0.75rem; }
.docs-toc nav .toc-group[data-toc-status] > a::before { display: none; }
.docs-toc nav .toc-group[data-toc-status="done"] > a,
.docs-toc nav .toc-group[data-toc-status="in-progress"] > a { border-left-width: 3px; }
.docs-toc nav .lvl-4 a { padding-left: 2.5rem; font-size: 0.79rem; }
.docs-toc nav .lvl-4 a::after {
  content: "";
  position: absolute;
  left: 1.55rem;
  top: 0.95em;
  width: 0.7rem;
  height: 1px;
  background: var(--border-strong);
}
/* Roll-up de statut du groupe (posé par docs-plan.js) : la pastille hérite de la
   couleur de statut, comme une tâche. */
.docs-toc nav .toc-group[data-toc-status="done"] > a .toc-group__tag { color: var(--plan-done); }
.docs-toc nav .toc-group[data-toc-status="in-progress"] > a .toc-group__tag { color: var(--plan-in-progress); }
.docs-toc nav .toc-group[data-toc-status="done"] > a { border-left-color: var(--plan-done); }
.docs-toc nav .toc-group[data-toc-status="in-progress"] > a { border-left-color: var(--plan-in-progress); }

/* ════════════════════════ Carte de TÂCHE détaillée ════════════════════════
 * Chaque tâche de la section « Tâches » (`<h3 id="task-N">` + son corps) est
 * enveloppée dans une `<section class="plan-task" data-mode="…">` par le
 * générateur (project-writing-plan). Sans ça, les 13 tâches formaient un mur de
 * texte indifférencié ("on n'a pas eu de design pour chaque tâche", 2026-05-31).
 * La carte donne : liseré gauche dans la couleur du MODE de son groupe (Task 6/7/8
 * partagent le bleu standard, Task 5 le rouge rigorous, etc.), un en-tête teinté
 * pleine largeur, et un corps aéré — cohérent avec les cartes stratégie/pipeline.
 *
 * Contrat préservé : docs-plan.js décore toujours `h3[id^="task-"]` (badge de
 * statut) et check-step.mjs le cible toujours — la `<section>` ne change rien à
 * la traversée (le <h3> reste le 1er enfant, ses frères = le corps de la tâche). */
.plan-task {
  --c: var(--mode-standard);
  position: relative;
  margin: 1.6rem 0;
  padding: 0 1.35rem 1.25rem;
  border: 1px solid var(--border);
  border-left: 4px solid var(--c);
  border-radius: var(--r-sm) var(--r-md) var(--r-md) var(--r-sm);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.plan-task[data-mode="delta"] { --c: var(--mode-delta); }
.plan-task[data-mode="batch"] { --c: var(--mode-batch); }
.plan-task[data-mode="rigorous"] { --c: var(--mode-rigorous); }
.plan-task[data-mode="standard"] { --c: var(--mode-standard); }
.plan-task[data-mode="final"] { --c: var(--mode-final); }

/* En-tête : le <h3> de la tâche devient une bande pleine largeur teintée du mode,
   séparée du corps par une hairline. Marges négatives = bleed jusqu'aux bords. */
.plan-task > h3[id^="task-"] {
  margin: 0 -1.35rem 1.2rem;
  padding: 0.85rem 1.35rem;
  font-size: 1.12rem;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 10%, var(--surface)), color-mix(in srgb, var(--c) 2%, var(--surface)) 72%, var(--surface));
  border-bottom: 1px solid var(--border);
  border-radius: 0 var(--r-md) 0 0;
  scroll-margin-top: 6.25rem;
}
/* Corps : resserre le rythme vertical des paragraphes/listes dans la carte. */
.plan-task > :is(p, ul, ol) { margin-top: 0.55rem; margin-bottom: 0.55rem; }
.plan-task > p > strong:first-child { color: var(--ink-strong); }
/* Les étapes (cases à cocher) de la tâche : léger fond creusé pour les détacher. */
.plan-task > ul.contains-task-list {
  margin: 0.7rem 0 0.2rem;
  padding: 0.55rem 0.85rem;
  background: var(--surface-sunken);
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
}
