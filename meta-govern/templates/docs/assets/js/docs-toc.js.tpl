/* docs-toc.js — Interactions de la documentation HTML ({{PROJECT_NAME}}).
   Sans dépendance, chargé en `defer`. Rôles :
     1. Scrollspy : surligne la section visible dans la TOC.
     2. Barre de progression de lecture.
     3. Bascule de thème auto → light → dark (persistée en localStorage).
     4. Bouton « haut de page » + bascule TOC mobile.
   Progressif : sans JS, la page reste lisible (light par défaut, dark auto).

   NB : l'anti-flash (application du thème AVANT le rendu) est géré par un petit
   script inline dans le <head> ; ici on ne fait que la bascule interactive. */
(function () {
  'use strict';

  // DOIT égaler THEME_STORAGE_KEY de .claude/scripts/docs-html/lib/docs-config.mjs
  // (le restore inline anti-flash de template.mjs lit la MÊME clé).
  var STORE_KEY = '{{THEME_STORAGE_KEY}}'; // 'auto' | 'light' | 'dark'
  var ICONS = { auto: '◐', light: '☀', dark: '☾' };
  var LABELS = { auto: 'Thème : auto', light: 'Thème : clair', dark: 'Thème : sombre' };

  function getTheme() {
    try { return localStorage.getItem(STORE_KEY) || 'auto'; } catch (e) { return 'auto'; }
  }
  function applyTheme(mode) {
    var root = document.documentElement;
    if (mode === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    var btn = document.querySelector('.docs-theme-toggle');
    if (btn) {
      btn.textContent = ICONS[mode];
      btn.setAttribute('aria-label', LABELS[mode]);
      btn.setAttribute('title', LABELS[mode]);
    }
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* Saut d'ancre fiable au chargement. `scroll-behavior: smooth` (sur <html>)
     casse le saut natif vers #hash lors d'une navigation inter-page sous
     Chromium : la page reste en haut. On rejoue le saut en scroll instantané
     une fois la mise en page stabilisée (utile pour les liens fil-d'Ariane
     « #type » qui pointent vers un groupe du hub). */
  function scrollToId(id) {
    var target = document.getElementById(id);
    if (!target) return false;
    var root = document.documentElement;
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    target.scrollIntoView();
    root.style.scrollBehavior = prev;
    return true;
  }
  function jumpToHash() {
    if (!window.location.hash || window.location.hash === '#') return;
    var id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (e) { id = window.location.hash.slice(1); }
    if (!document.getElementById(id)) return;
    // On reprend TEMPORAIREMENT la main sur la restauration de scroll : sinon
    // Chromium tente son propre saut natif (cassé par scroll-behavior:smooth sur
    // un hub long) APRÈS notre scroll et remet la page en haut. On rétablit la
    // valeur d'origine une fois le saut posé (pour ne pas casser le back/forward).
    var hist = window.history, prevRestore = null;
    try { if (hist && 'scrollRestoration' in hist) { prevRestore = hist.scrollRestoration; hist.scrollRestoration = 'manual'; } } catch (e) {}
    // Tentatives échelonnées : on gagne contre le reset natif quel que soit son timing.
    [0, 60, 160, 360].forEach(function (d) { setTimeout(function () { scrollToId(id); }, d); });
    window.addEventListener('load', function () {
      requestAnimationFrame(function () {
        scrollToId(id);
        setTimeout(function () { try { if (prevRestore != null) hist.scrollRestoration = prevRestore; } catch (e) {} }, 400);
      });
    });
  }

  /* ---- Tables larges : colonne 1 figée (CSS) + ouverture plein écran ---- */
  function headingBefore(node) {
    var n = node.previousElementSibling;
    while (n) {
      if (/^H[1-6]$/.test(n.tagName)) return n.textContent.replace(/^[#\s]+/, '').trim();
      n = n.previousElementSibling;
    }
    var p = node.parentElement;
    return p ? headingBefore(p) : '';
  }
  function openTableModal(wrap, title) {
    var modal = document.createElement('div');
    modal.className = 'tc-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Tableau agrandi' + (title ? ' — ' + title : ''));

    var panel = document.createElement('div'); panel.className = 'tc-modal__panel';
    var bar = document.createElement('div'); bar.className = 'tc-modal__bar';
    var ttl = document.createElement('span'); ttl.className = 'tc-modal__title'; ttl.textContent = title || 'Tableau';
    var close = document.createElement('button');
    close.type = 'button'; close.className = 'tc-modal__close';
    close.setAttribute('aria-label', 'Fermer (Échap)'); close.textContent = '✕';
    var body = document.createElement('div'); body.className = 'tc-modal__body';
    // Cloné dans un .docs-content pour hériter du style des tables (pastilles code,
    // zébrures, en-tête). Le mode plein écran enroule les cellules → tient en largeur.
    var dc = document.createElement('div'); dc.className = 'docs-content';
    dc.appendChild(wrap.cloneNode(true));
    body.appendChild(dc);
    bar.appendChild(ttl); bar.appendChild(close);
    panel.appendChild(bar); panel.appendChild(body);
    modal.appendChild(panel);

    var prevFocus = document.activeElement;
    var rootStyle = document.documentElement.style;
    var prevOverflow = rootStyle.overflow;
    function destroy() {
      rootStyle.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey, true);
      modal.remove();
      if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); destroy(); }
      else if (e.key === 'Tab') { e.preventDefault(); close.focus(); } // garde le focus dans le modal
    }
    close.addEventListener('click', destroy);
    modal.addEventListener('mousedown', function (e) { if (e.target === modal) destroy(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(modal);
    rootStyle.overflow = 'hidden';
    close.focus();
  }
  function setupWideTables() {
    var wraps = document.querySelectorAll('.docs-content .table-wrap');
    Array.prototype.forEach.call(wraps, function (wrap) {
      var table = wrap.querySelector('table');
      if (!table || wrap.closest('.table-block')) return;
      var block = document.createElement('div');
      block.className = 'table-block';
      wrap.parentNode.insertBefore(block, wrap);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'table-wrap__expand';
      var ico = document.createElement('span');
      ico.className = 'ico'; ico.setAttribute('aria-hidden', 'true'); ico.textContent = '⤢';
      btn.appendChild(ico);
      btn.appendChild(document.createTextNode(' Agrandir'));
      block.appendChild(btn);
      block.appendChild(wrap);
      var title = headingBefore(block);
      btn.setAttribute('aria-label', 'Agrandir le tableau en plein écran' + (title ? ' — ' + title : ''));
      function sync() { btn.style.display = (table.scrollWidth - wrap.clientWidth > 8) ? '' : 'none'; }
      sync();
      window.addEventListener('resize', sync);
      btn.addEventListener('click', function () { openTableModal(wrap, title); });
    });
  }

  ready(function () {
    jumpToHash();
    setupWideTables();

    /* ---- 3. Bascule de thème ---- */
    var themeBtn = document.querySelector('.docs-theme-toggle');
    applyTheme(getTheme());
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var order = ['auto', 'light', 'dark'];
        var next = order[(order.indexOf(getTheme()) + 1) % order.length];
        try { localStorage.setItem(STORE_KEY, next); } catch (e) {}
        applyTheme(next);
      });
    }

    /* ---- 1. Scrollspy ---- */
    var toc = document.querySelector('.docs-toc');
    var links = toc ? Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]')) : [];
    var idToLink = {};
    var targets = [];
    links.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      var el = document.getElementById(id);
      if (el) { idToLink[id] = a; targets.push(el); }
    });
    var current = null;
    function setActive(id) {
      if (current === id) return;
      current = id;
      links.forEach(function (a) { a.classList.remove('is-active'); });
      if (idToLink[id]) idToLink[id].classList.add('is-active');
    }
    if ('IntersectionObserver' in window && targets.length) {
      var visible = new Set();
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) visible.add(en.target.id);
            else visible.delete(en.target.id);
          });
          for (var i = 0; i < targets.length; i++) {
            if (visible.has(targets[i].id)) { setActive(targets[i].id); break; }
          }
        },
        { rootMargin: '0px 0px -72% 0px', threshold: 0 }
      );
      targets.forEach(function (t) { io.observe(t); });
    }

    /* ---- 2. Barre de progression + 4. haut de page ---- */
    var bar = document.querySelector('.docs-progress');
    var topBtn = document.querySelector('.docs-top');
    function onScroll() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      if (bar) bar.style.width = (pct * 100).toFixed(2) + '%';
      if (topBtn) {
        if (window.scrollY > 600) topBtn.classList.add('is-visible');
        else topBtn.classList.remove('is-visible');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (topBtn) topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    /* ---- TOC mobile ---- */
    var toggle = document.querySelector('.docs-toc-toggle');
    if (toggle && toc) {
      toggle.addEventListener('click', function () { toc.classList.toggle('is-open'); });
      links.forEach(function (a) {
        a.addEventListener('click', function () {
          if (window.matchMedia('(max-width: 60rem)').matches) toc.classList.remove('is-open');
        });
      });
    }
  });
})();
