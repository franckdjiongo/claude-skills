/* docs-hub.js — Recherche + filtrage client du hub (docs/index.html).
 *
 * Chargé en <script defer> par make-index.mjs (extraJs) — IIFE, AUCUN import,
 * 100 % client. NE JAMAIS éditer docs-toc.js (sibling sur toutes les pages).
 *
 * Contrat de données (émis par make-index.mjs) :
 *  - Chaque carte = <a class="hub-card"> avec data-type, data-context,
 *    data-search (titre + chemin en minuscules).
 *  - Barre = <div class="hub-toolbar"> contenant <input class="hub-search">,
 *    deux <div class="hub-facets" data-facet="type|context"> de
 *    <button class="hub-chip" data-value aria-pressed>, et un
 *    <p class="hub-result-count" aria-live="polite">.
 *  - Sections = <section class="hub-section">. Masquée si 0 carte visible.
 *
 * Combinaison : une carte est visible si elle matche la recherche ET (aucun
 * type actif OU son data-type est actif) ET (aucun contexte actif OU son
 * data-context est actif). Chips multi-sélection ; aucune active = « toutes ».
 */
(function () {
  'use strict';

  var toolbar = document.querySelector('.hub-toolbar');
  if (!toolbar) return;

  var search = toolbar.querySelector('.hub-search');
  var resultCount = toolbar.querySelector('.hub-result-count');
  var typeChips = toArray(toolbar.querySelectorAll('.hub-facets[data-facet="type"] .hub-chip'));
  var ctxChips = toArray(toolbar.querySelectorAll('.hub-facets[data-facet="context"] .hub-chip'));
  var cards = toArray(document.querySelectorAll('.hub-card'));
  var sections = toArray(document.querySelectorAll('.hub-section'));
  var total = cards.length;

  // État vide injecté après la dernière section.
  var empty = document.createElement('p');
  empty.className = 'hub-empty';
  empty.hidden = true;
  empty.innerHTML = 'Aucun document ne correspond. <strong>Effacez la recherche</strong> ou retirez des filtres.';
  var lastSection = sections[sections.length - 1];
  if (lastSection && lastSection.parentNode) {
    lastSection.parentNode.insertBefore(empty, lastSection.nextSibling);
  }

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList);
  }

  // Valeurs des chips actifs d'une rangée (aria-pressed=true).
  function activeValues(chips) {
    var out = [];
    for (var i = 0; i < chips.length; i++) {
      if (chips[i].getAttribute('aria-pressed') === 'true') {
        out.push(chips[i].getAttribute('data-value'));
      }
    }
    return out;
  }

  function apply() {
    var query = (search.value || '').trim().toLowerCase();
    var activeTypes = activeValues(typeChips);
    var activeCtx = activeValues(ctxChips);
    var visible = 0;

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var matchSearch = !query || (card.getAttribute('data-search') || '').indexOf(query) !== -1;
      var matchType = !activeTypes.length || activeTypes.indexOf(card.getAttribute('data-type')) !== -1;
      var matchCtx = !activeCtx.length || activeCtx.indexOf(card.getAttribute('data-context')) !== -1;
      var show = matchSearch && matchType && matchCtx;
      card.classList.toggle('is-filtered', !show);
      if (show) visible++;
    }

    // Masque les sections sans carte visible.
    for (var s = 0; s < sections.length; s++) {
      var sec = sections[s];
      var anyVisible = sec.querySelector('.hub-card:not(.is-filtered)');
      sec.classList.toggle('is-filtered', !anyVisible);
    }

    empty.hidden = visible !== 0;

    if (resultCount) {
      var filtering = query || activeTypes.length || activeCtx.length;
      resultCount.textContent = filtering
        ? visible + ' / ' + total + ' documents'
        : total + ' documents';
    }
  }

  // Toggle d'un chip (multi-sélection au sein de sa rangée).
  function bindChips(chips) {
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', function () {
        var pressed = this.getAttribute('aria-pressed') === 'true';
        this.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        this.classList.toggle('is-active', !pressed);
        apply();
      });
    }
  }
  bindChips(typeChips);
  bindChips(ctxChips);

  if (search) {
    search.addEventListener('input', apply);
    // Échap vide la recherche quand le champ est focus.
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && search.value) {
        search.value = '';
        apply();
      }
    });
  }

  // Condensation au défilement : une fois la barre épinglée (sticky collé en
  // haut), les rangées de facettes occupent ~36% du viewport. On marque alors
  // .is-pinned ; le CSS replie les facettes (recherche + compteur restent
  // visibles) et les ré-affiche au survol/focus. Seuil = position d'origine.
  var restTop = 0;
  (function measureRest() {
    var prev = window.scrollY;
    if (prev === 0) restTop = toolbar.getBoundingClientRect().top + window.scrollY;
  })();
  function syncPinned() {
    if (!restTop) restTop = toolbar.getBoundingClientRect().top + window.scrollY;
    toolbar.classList.toggle('is-pinned', window.scrollY > restTop + 4);
  }
  window.addEventListener('scroll', syncPinned, { passive: true });
  syncPinned();

  // « / » place le focus sur la recherche (sauf si déjà dans un champ).
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    var tag = el && el.tagName ? el.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || (el && el.isContentEditable)) return;
    if (!search) return;
    e.preventDefault();
    search.focus();
    search.select();
  });

  apply();
})();
