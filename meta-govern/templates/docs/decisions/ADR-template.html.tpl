<!DOCTYPE html>
<!--
  meta-govern — gabarit decisions/ADR-template.html.tpl
  (rendu vers docs/decisions/ADR-NNNN-<slug>.html).
  Variables : ADR_NUMBER, ADR_TITLE, STATUS, DATE, PROJECT_NAME, LANG,
  THEME_STORAGE_KEY, META_GOVERN_VERSION.
-->
<html lang="{{LANG}}" data-doc-type="adr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ADR-{{ADR_NUMBER}} — {{ADR_TITLE}}</title>
  <meta name="doc-type" content="adr">
  <meta name="doc-type-label" content="Décision (ADR)">
  <meta name="doc-title" content="ADR-{{ADR_NUMBER}} — {{ADR_TITLE}}">
  <meta name="doc-source" content="docs/decisions/ADR-{{ADR_NUMBER}}.html">
  <meta name="generator" content="meta-govern v{{META_GOVERN_VERSION}}">
  <meta name="description" content="Décision d'architecture — contexte, décision, conséquences">
  <link rel="stylesheet" href="../assets/css/docs-theme.css">
  <style>:root{--doc-accent:#7C3AED;--doc-glyph:"◈";}</style>
  <script>(function(){try{var t=localStorage.getItem('{{THEME_STORAGE_KEY}}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body data-doc-type="adr">
  <div class="docs-progress" aria-hidden="true"></div>
  <div class="docs-controls">
    <a class="docs-iconbtn docs-home" href="../index.html" aria-label="Accueil — index de la documentation" title="Accueil de la documentation">⌂</a>
    <button class="docs-iconbtn docs-theme-toggle" type="button" aria-label="Basculer le thème">◐</button>
    <button class="docs-iconbtn docs-top" type="button" aria-label="Revenir en haut">↑</button>
  </div>
  <div class="docs-shell">
    <aside class="docs-toc" id="docs-toc">
      <p class="docs-toc__label">Sur cette page</p>
      <nav aria-label="Sommaire du document"><ul>
        <li class="lvl-2"><a href="#contexte">Contexte</a></li>
        <li class="lvl-2"><a href="#decision">Décision</a></li>
        <li class="lvl-2"><a href="#consequences">Conséquences</a></li>
        <li class="lvl-3"><a href="#consequences-positives">Positives</a></li>
        <li class="lvl-3"><a href="#consequences-negatives">Négatives</a></li>
        <li class="lvl-3"><a href="#compromis-acceptes">Neutres / compromis acceptés</a></li>
        <li class="lvl-2"><a href="#alternatives-considerees">Alternatives considérées</a></li>
        <li class="lvl-2"><a href="#references">Références</a></li>
        <li class="lvl-2"><a href="#discipline-adr">Discipline ADR</a></li>
      </ul></nav>
    </aside>
    <div class="docs-main">
      <button class="docs-toc-toggle" type="button" aria-controls="docs-toc">☰ Sommaire</button>
      <article class="docs-article">
        <header class="docs-header">
          <nav class="docs-breadcrumb" aria-label="Fil d'Ariane"><a href="../index.html">docs</a><span class="sep">›</span><a href="../index.html#adr">decisions</a><span class="sep">›</span><span aria-current="page">ADR-{{ADR_NUMBER}}</span></nav>
          <span class="docs-badge"><span class="ico" aria-hidden="true">◈</span>Décision (ADR)</span>
          <h1 class="docs-title">ADR-{{ADR_NUMBER}} — {{ADR_TITLE}}</h1>
          <p class="docs-blurb">Décision d'architecture — contexte, décision, conséquences</p>
          <div class="docs-meta">
            <span><b>Type</b> · Décision (ADR)</span>
            <span><b>Source</b> · <code>docs/decisions/ADR-{{ADR_NUMBER}}.html</code></span>
            <span><b>Projet</b> · {{PROJECT_NAME}}</span>
            <span>Créé par meta-govern — nouveaux docs via <code>node .claude/scripts/docs-html/scaffold.mjs</code></span>
          </div>
        </header>
        <div class="docs-content">
          <ul>
            <li><strong>Statut :</strong> {{STATUS}} <em>(proposed | accepted | deprecated | superseded by ADR-XXXX)</em></li>
            <li><strong>Date :</strong> {{DATE}}</li>
            <li><strong>Décideurs :</strong> &lt;qui a participé&gt;</li>
          </ul>

          <h2 id="contexte"><a class="header-anchor" href="#contexte" aria-hidden="true">#</a> Contexte</h2>
          <p>&lt;2-4 phrases : quelle est la situation, quelles forces sont en jeu, pourquoi une décision doit être prise maintenant&gt;</p>

          <h2 id="decision"><a class="header-anchor" href="#decision" aria-hidden="true">#</a> Décision</h2>
          <p>&lt;la décision, en 1-3 phrases. La formuler ainsi : « Nous allons &lt;faire X&gt;. » Être spécifique.&gt;</p>

          <h2 id="consequences"><a class="header-anchor" href="#consequences" aria-hidden="true">#</a> Conséquences</h2>
          <h3 id="consequences-positives"><a class="header-anchor" href="#consequences-positives" aria-hidden="true">#</a> Positives</h3>
          <ul>
            <li>&lt;ce qui devient plus facile / plus sûr / plus rapide&gt;</li>
          </ul>
          <h3 id="consequences-negatives"><a class="header-anchor" href="#consequences-negatives" aria-hidden="true">#</a> Négatives</h3>
          <ul>
            <li>&lt;ce qui devient plus difficile / plus contraint&gt;</li>
          </ul>
          <h3 id="compromis-acceptes"><a class="header-anchor" href="#compromis-acceptes" aria-hidden="true">#</a> Neutres / compromis acceptés</h3>
          <ul>
            <li>&lt;ce que nous acceptons explicitement&gt;</li>
          </ul>

          <h2 id="alternatives-considerees"><a class="header-anchor" href="#alternatives-considerees" aria-hidden="true">#</a> Alternatives considérées</h2>
          <ul>
            <li><strong>&lt;Alternative A&gt;</strong> — rejetée parce que &lt;raison&gt;.</li>
            <li><strong>&lt;Alternative B&gt;</strong> — rejetée parce que &lt;raison&gt;.</li>
          </ul>

          <h2 id="references"><a class="header-anchor" href="#references" aria-hidden="true">#</a> Références</h2>
          <ul>
            <li>&lt;liens vers specs, issues, ADRs antérieurs, docs externes&gt;</li>
          </ul>

          <h2 id="discipline-adr"><a class="header-anchor" href="#discipline-adr" aria-hidden="true">#</a> Discipline ADR</h2>
          <ul>
            <li>Bref. Si un ADR dépasse ce que ce gabarit permet de remplir, il couvre trop de choses.</li>
            <li>Une décision par ADR. Les décisions composées donnent N ADRs.</li>
            <li>Les changements de statut sont en ajout seul — pour déprécier, ajouter une ligne « Superseded by ADR-XXXX » et créer le nouveau. Ne pas réécrire l'historique.</li>
            <li>Numérotés en ordre chronologique. Ne pas renuméroter.</li>
          </ul>
        </div>
      </article>
      <footer class="docs-footer">
        <span class="brand">{{PROJECT_NAME}} — Documentation</span>
        <span>Décision (ADR) · <code>docs/decisions/ADR-{{ADR_NUMBER}}.html</code></span>
      </footer>
    </div>
  </div>
  <script src="../assets/js/docs-toc.js" defer></script>
</body>
</html>
