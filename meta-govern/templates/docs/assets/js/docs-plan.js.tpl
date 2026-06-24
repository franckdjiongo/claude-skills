/* docs-plan.js — Comportement live des documents de type « plan ».
 *
 * Chargé automatiquement par template.mjs (renderPage) quand o.type === 'plan',
 * en <script defer> classique (IIFE, AUCUN import/export ESM, aucun bundler).
 * NE JAMAIS éditer docs-toc.js : ce sibling porte tout le comportement plan.
 *
 * Contrat de données partagé (identique côté CSS + scripts Node) :
 *  - Une tâche = <h3 id="task-N">. Statut = attribut data-status ∈
 *    {todo,in-progress,done,cancelled,blocked}. Absent ⇒ DÉRIVÉ des cases.
 *  - Les étapes d'une tâche = <input class="task-list-item-checkbox"> dans le
 *    <ul class="contains-task-list"> qui suit le <h3>, jusqu'au prochain
 *    <h3>/<h2>. « cochée » = l'input a l'attribut checked.
 *  - Dérivation (data-status absent) : 0 cochée ⇒ todo ; quelques-unes ⇒
 *    in-progress ; toutes (et ≥1) ⇒ done.
 *  - Pipeline Task List = section ouverte par <h2 id="pipeline-task-list"> ;
 *    SES cases pilotent la barre du haut (distinctes des étapes par tâche).
 *  - Barre live = <div class="plan-progress"> insérée juste APRÈS
 *    <header class="docs-header"> (repli : avant le premier <h2>).
 *  - Entrées TOC des tâches = <li class="lvl-3"><a href="#task-N">. On pose
 *    data-toc-status="<statut>" sur le <li> pour la coloration CSS.
 *  - Horodatage optionnel : data-done-at="YYYY-MM-DD" sur le <h3>.
 *
 * Deux couches : la barre du haut dérive de la Pipeline Task List ; les
 * couleurs TOC dérivent des étapes par tâche. Pas de 3e source de vérité.
 */
(function () {
  'use strict';

  var STATUSES = ['todo', 'in-progress', 'done', 'cancelled', 'blocked'];
  var LABELS = {
    todo: 'À faire',
    'in-progress': 'En cours',
    done: 'Terminé',
    cancelled: 'Annulé',
    blocked: 'Bloqué',
  };

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /** Crée un élément avec une classe (jamais via innerHTML). */
  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  /** Crée un élément + classe + texte (textContent, jamais innerHTML). */
  function textEl(tag, className, text) {
    var node = el(tag, className);
    node.textContent = text;
    return node;
  }

  /** Cases à cocher d'étape entre un <h3> et le prochain <h3>/<h2>. */
  function stepCheckboxes(h3) {
    var boxes = [];
    var node = h3.nextElementSibling;
    while (node && node.tagName !== 'H3' && node.tagName !== 'H2') {
      if (node.matches && node.matches('input.task-list-item-checkbox')) {
        boxes.push(node);
      }
      var nested = node.querySelectorAll
        ? node.querySelectorAll('input.task-list-item-checkbox')
        : [];
      for (var i = 0; i < nested.length; i++) boxes.push(nested[i]);
      node = node.nextElementSibling;
    }
    return boxes;
  }

  function isChecked(input) {
    return input.hasAttribute('checked') || input.checked === true;
  }

  /** Statut effectif d'une tâche : data-status sinon dérivé des étapes. */
  function taskStatus(h3) {
    var declared = h3.getAttribute('data-status');
    if (declared && STATUSES.indexOf(declared) !== -1) return declared;
    var boxes = stepCheckboxes(h3);
    if (!boxes.length) return 'todo';
    var done = 0;
    for (var i = 0; i < boxes.length; i++) if (isChecked(boxes[i])) done++;
    if (done === 0) return 'todo';
    if (done === boxes.length) return 'done';
    return 'in-progress';
  }

  /** Index des entrées TOC par cible (#task-N → <li>). */
  function tocIndex() {
    var map = {};
    var links = document.querySelectorAll('aside.docs-toc a[href^="#"]');
    for (var i = 0; i < links.length; i++) {
      var id = links[i].getAttribute('href').slice(1);
      var li = links[i].closest('li');
      if (id && li) map[id] = li;
    }
    return map;
  }

  /** Décore chaque tâche : badge inline, horodatage, couleur TOC. */
  function decorateTasks() {
    var heads = document.querySelectorAll('h3[id^="task-"]');
    var toc = tocIndex();
    for (var i = 0; i < heads.length; i++) {
      var h3 = heads[i];
      var status = taskStatus(h3);

      if (!h3.querySelector('.plan-status')) {
        var badge = document.createElement('span');
        badge.className = 'plan-status';
        badge.setAttribute('data-status', status);
        badge.textContent = LABELS[status] || status;
        h3.appendChild(badge);
      }

      var doneAt = h3.getAttribute('data-done-at');
      if (doneAt && !h3.querySelector('.plan-done-at')) {
        var stamp = document.createElement('span');
        stamp.className = 'plan-done-at';
        stamp.textContent = doneAt;
        h3.appendChild(stamp);
      }

      var li = toc[h3.id];
      if (li) li.setAttribute('data-toc-status', status);
    }
    rollupGroups();
  }

  /** Statut agrégé d'un groupe TOC à partir de ses tâches enfants.
   *  Permet de lire l'avancement d'un GROUPE (« Groupe 2 : 2/3 ») directement
   *  dans le sommaire, sans déplier. Posé sur le <li class="toc-group">. */
  function rollupGroups() {
    var groups = document.querySelectorAll('aside.docs-toc li.toc-group');
    for (var g = 0; g < groups.length; g++) {
      var taskLinks = groups[g].querySelectorAll('a[href^="#task-"]');
      if (!taskLinks.length) continue;
      var counts = { todo: 0, 'in-progress': 0, done: 0, cancelled: 0, blocked: 0 };
      var total = 0;
      for (var i = 0; i < taskLinks.length; i++) {
        var taskLi = taskLinks[i].closest('li');
        var st = taskLi && taskLi.getAttribute('data-toc-status');
        if (!st || counts[st] === undefined) st = 'todo';
        counts[st]++;
        total++;
      }
      var agg;
      if (counts.blocked) agg = 'blocked';
      else if (counts.cancelled === total) agg = 'cancelled';
      else if (counts.done + counts.cancelled === total) agg = 'done';
      else if (counts.done || counts['in-progress']) agg = 'in-progress';
      else agg = 'todo';
      groups[g].setAttribute('data-toc-status', agg);
    }
  }

  /** Cases à cocher de la section « Pipeline Task List ». */
  function pipelineCheckboxes() {
    // Accepte les deux ancres historiques : `pipeline-task-list` (contrat) et
    // `pipeline` (émis par d'anciens rendus d'execute-plan). Sans ce repli, la
    // barre du haut retombait silencieusement sur le décompte par tâche.
    var head =
      document.getElementById('pipeline-task-list') || document.getElementById('pipeline');
    if (!head) return [];
    var boxes = [];
    var node = head.nextElementSibling;
    while (node && node.tagName !== 'H2') {
      var found = node.querySelectorAll
        ? node.querySelectorAll('input.task-list-item-checkbox')
        : [];
      for (var i = 0; i < found.length; i++) boxes.push(found[i]);
      if (node.matches && node.matches('input.task-list-item-checkbox')) {
        boxes.push(node);
      }
      node = node.nextElementSibling;
    }
    return boxes;
  }

  /** Segments de repli : une tâche = un segment (quand aucune Pipeline Task List). */
  function taskSegments() {
    var heads = document.querySelectorAll('h3[id^="task-"]');
    var segs = [];
    for (var i = 0; i < heads.length; i++) {
      var status = taskStatus(heads[i]);
      // Une tâche compte comme « faite » si done ; annulée = résolue mais non
      // comptée dans le %, on conserve son statut pour la couleur du segment.
      segs.push({ done: status === 'done', status: status });
    }
    return segs;
  }

  /** Insère / met à jour la barre de progression live (couche pipeline).
   *  Source primaire : cases de la Pipeline Task List (vue orchestrateur).
   *  Repli (plans legacy sans pipeline) : statut par tâche (vue sous-agents),
   *  pour que la barre « voir live l'avancement » apparaisse sur TOUS les plans. */
  function renderProgress() {
    var pipeBoxes = pipelineCheckboxes();
    var segs, label;
    if (pipeBoxes.length) {
      segs = [];
      for (var p = 0; p < pipeBoxes.length; p++) {
        segs.push({ done: isChecked(pipeBoxes[p]), status: null });
      }
      label = 'Avancement du pipeline';
    } else {
      segs = taskSegments();
      if (!segs.length) return;
      label = 'Avancement des tâches';
    }
    var done = 0;
    for (var i = 0; i < segs.length; i++) if (segs[i].done) done++;
    var pct = Math.round((done / segs.length) * 100);

    var bar = document.querySelector('.plan-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'plan-progress';
      var header = document.querySelector('header.docs-header');
      if (header && header.parentNode) {
        header.parentNode.insertBefore(bar, header.nextSibling);
      } else {
        var firstH2 = document.querySelector('.docs-content h2, h2');
        if (firstH2 && firstH2.parentNode) {
          firstH2.parentNode.insertBefore(bar, firstH2);
        } else {
          document.body.appendChild(bar);
        }
      }
    }

    // Construction via API DOM (textContent/setAttribute) — pas d'innerHTML :
    // les valeurs sont déjà numériques/booléennes, mais on reste sans HTML
    // injecté pour éliminer toute surface XSS et satisfaire le garde-fou.
    while (bar.firstChild) bar.removeChild(bar.firstChild);

    var head = el('div', 'plan-progress__head');
    head.appendChild(textEl('span', 'plan-progress__label', label));
    var pctEl = textEl('span', 'plan-progress__pct',
      done + ' / ' + segs.length + ' · ' + pct + '%');
    pctEl.setAttribute('data-empty', done === 0 ? 'true' : 'false');
    head.appendChild(pctEl);
    bar.appendChild(head);

    var track = el('div', 'plan-progress__track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(pct));
    track.setAttribute('aria-label', label);
    for (var j = 0; j < segs.length; j++) {
      var seg = el('span', 'plan-progress__seg');
      seg.setAttribute('data-done', segs[j].done ? 'true' : 'false');
      // En mode repli, exposer le statut par tâche pour une coloration plus fine
      // (annulé/bloqué) si docs-plan.css le stylise ; sinon ignoré sans risque.
      if (segs[j].status) seg.setAttribute('data-status', segs[j].status);
      track.appendChild(seg);
    }
    bar.appendChild(track);
  }

  ready(function () {
    try {
      decorateTasks();
      renderProgress();
    } catch (e) {
      /* Dégradation silencieuse : un plan reste lisible sans enrichissement. */
      if (window.console && console.warn) console.warn('docs-plan:', e);
    }
  });
})();
