/* ==========================================================================
   docs-hub.css — Barre de recherche + facettes du hub (docs/index.html)
   Surcouche chargée UNIQUEMENT par make-index.mjs (extraCss). Réutilise les
   tokens :root de docs-theme.css → light/dark automatique via [data-theme].
   Tout le filtrage est client (docs-hub.js) ; ici c'est purement visuel.
   ========================================================================== */

/* --- Déblocage du sticky (hub uniquement) -------------------------------- *
 * .docs-article (thème partagé) porte overflow:hidden pour clipper le dégradé
 * d'en-tête sur ses coins arrondis. Or un ancêtre overflow:hidden PIÈGE
 * position:sticky → la barre défilait hors écran sur une page de 184 cartes.
 * docs-hub.css n'étant chargé QUE sur le hub, on libère l'overflow ici et on
 * re-clippe les coins de l'en-tête localement (clip-path), sans toucher au
 * thème ni aux autres docs. */
.docs-article { overflow: visible; }
.docs-header {
  border-top-left-radius: var(--r-lg);
  border-top-right-radius: var(--r-lg);
  clip-path: inset(0 round var(--r-lg) var(--r-lg) 0 0);
}

/* --- Barre collante ------------------------------------------------------ */
.hub-toolbar {
  position: sticky;
  top: 0.6rem;
  z-index: 30;
  margin: 0.4rem 0 1.8rem;
  padding: 0.85rem 0.95rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  -webkit-backdrop-filter: blur(10px) saturate(1.4);
  backdrop-filter: blur(10px) saturate(1.4);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm);
}

/* Épinglée (défilée) : on replie les facettes pour ne pas manger 1/3 de
   l'écran ; la recherche + le compteur restent visibles. Survol/focus rouvre
   les facettes pour filtrer sans remonter. prefers-reduced-motion respecté. */
.hub-toolbar__facets {
  display: contents;
}
.hub-toolbar.is-pinned .hub-facets {
  max-height: 0;
  margin: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  transition: max-height 0.22s ease, opacity 0.18s ease;
}
.hub-toolbar.is-pinned:hover .hub-facets,
.hub-toolbar.is-pinned:focus-within .hub-facets {
  max-height: 14rem;
  opacity: 1;
  pointer-events: auto;
}
.hub-facets {
  max-height: 14rem;
  transition: max-height 0.22s ease, opacity 0.18s ease;
}
@media (prefers-reduced-motion: reduce) {
  .hub-facets { transition: none; }
}

/* --- Champ de recherche -------------------------------------------------- */
.hub-search {
  width: 100%;
  padding: 0.62rem 0.9rem;
  font: inherit;
  font-size: 0.95rem;
  color: var(--ink-strong);
  background: var(--surface-sunken);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-md);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  -webkit-appearance: none;
  appearance: none;
}
.hub-search::placeholder { color: var(--ink-muted); }
.hub-search:focus-visible {
  outline: none;
  border-color: var(--doc-accent-line);
  background: var(--surface);
  box-shadow: var(--ring);
}

/* --- Rangées de facettes ------------------------------------------------- */
.hub-facets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
/* Libellé d'axe (« Type » / « Contexte ») : distingue les deux rangées de
   facettes, sinon les 4 chips de contexte se lisent comme des types de plus. */
.hub-facets__label {
  flex: 0 0 auto;
  width: 4.4rem;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-muted);
}
@media (max-width: 40rem) {
  /* En étroit, le libellé prend toute la largeur au-dessus de ses chips. */
  .hub-facets__label { width: 100%; margin-bottom: 0.1rem; }
}

/* --- Pastilles (chips) --------------------------------------------------- */
.hub-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;
  padding: 0.3rem 0.6rem;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1;
  color: var(--ink-soft);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  cursor: pointer;
  user-select: none;
  transition: color 0.14s, background 0.14s, border-color 0.14s, transform 0.14s;
}
.hub-chip:hover {
  color: var(--doc-accent-ink);
  border-color: var(--doc-accent-line);
  transform: translateY(-1px);
}
.hub-chip:focus-visible {
  outline: none;
  box-shadow: var(--ring);
}
.hub-chip__ico { font-size: 0.92em; line-height: 1; }
.hub-chip__count {
  padding: 0.04rem 0.4rem;
  border-radius: 999px;
  background: var(--surface-sunken);
  color: var(--ink-muted);
  font-size: 0.68rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  border: 1px solid var(--hairline);
}

/* État actif (les deux sélecteurs pour robustesse JS/CSS). */
.hub-chip.is-active,
.hub-chip[aria-pressed="true"] {
  color: #fff;
  background: var(--doc-accent);
  border-color: var(--doc-accent);
}
.hub-chip.is-active .hub-chip__ico,
.hub-chip[aria-pressed="true"] .hub-chip__ico { color: #fff !important; }
.hub-chip.is-active .hub-chip__count,
.hub-chip[aria-pressed="true"] .hub-chip__count {
  background: color-mix(in srgb, #000 22%, transparent);
  color: #fff;
  border-color: transparent;
}

/* --- Compteur de résultats ---------------------------------------------- */
.hub-result-count {
  margin: 0.1rem 0 0;
  font-size: 0.76rem;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

/* --- Filtrage : cartes & sections masquées ------------------------------- */
.docs-content a.hub-card.is-filtered { display: none; }
.hub-section.is-filtered { display: none; }

/* --- État vide (aucun résultat) ----------------------------------------- */
.hub-empty {
  margin: 1.5rem 0;
  padding: 2rem 1.25rem;
  text-align: center;
  color: var(--ink-soft);
  background: var(--surface-sunken);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-lg);
}
.hub-empty[hidden] { display: none; }
.hub-empty strong { color: var(--ink-strong); }

@media (max-width: 60rem) {
  .hub-toolbar { top: 0; }
}
@media print {
  .hub-toolbar { display: none !important; }
}
