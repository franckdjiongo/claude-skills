<!DOCTYPE html>
<!--
  meta-govern — gabarit spec.html.tpl (rendu au BOOTSTRAP vers docs/<slug>-spec.html).
  Variables : PROJECT_NAME, PROJECT_SLUG, PROJECT_DESCRIPTION, SPEC_DOC, LANG,
  THEME_STORAGE_KEY, META_GOVERN_VERSION, LANGUAGE_PRIMARY, LANGUAGE_SECONDARY.
  Conditionnel plat : IF_BILINGUAL (messages d'erreur bilingues).
-->
<html lang="{{LANG}}" data-doc-type="spec">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{PROJECT_NAME}} — Spécification</title>
  <meta name="doc-type" content="spec">
  <meta name="doc-type-label" content="Spécification">
  <meta name="doc-title" content="{{PROJECT_NAME}} — Spécification">
  <meta name="doc-source" content="{{SPEC_DOC}}">
  <meta name="generator" content="meta-govern v{{META_GOVERN_VERSION}}">
  <meta name="description" content="Spécification fonctionnelle — source de vérité des FUNC / RA / VAL">
  <link rel="stylesheet" href="assets/css/docs-theme.css">
  <style>:root{--doc-accent:#6D28D9;--doc-glyph:"◆";}</style>
  <script>(function(){try{var t=localStorage.getItem('{{THEME_STORAGE_KEY}}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body data-doc-type="spec">
  <div class="docs-progress" aria-hidden="true"></div>
  <div class="docs-controls">
    <a class="docs-iconbtn docs-home" href="index.html" aria-label="Accueil — index de la documentation" title="Accueil de la documentation">⌂</a>
    <button class="docs-iconbtn docs-theme-toggle" type="button" aria-label="Basculer le thème">◐</button>
    <button class="docs-iconbtn docs-top" type="button" aria-label="Revenir en haut">↑</button>
  </div>
  <div class="docs-shell">
    <aside class="docs-toc" id="docs-toc">
      <p class="docs-toc__label">Sur cette page</p>
      <nav aria-label="Sommaire du document"><ul>
        <li class="lvl-2"><a href="#vue-densemble">Vue d'ensemble</a></li>
        <li class="lvl-2"><a href="#conventions-du-document">Conventions de ce document</a></li>
        <li class="lvl-2"><a href="#personas">Personas</a></li>
        <li class="lvl-3"><a href="#persona-1">Persona 1</a></li>
        <li class="lvl-3"><a href="#persona-2">Persona 2</a></li>
        <li class="lvl-2"><a href="#fonctionnalites">Fonctionnalités (FUNC-XX)</a></li>
        <li class="lvl-3"><a href="#func-01">FUNC-01</a></li>
        <li class="lvl-3"><a href="#func-02">FUNC-02</a></li>
        <li class="lvl-2"><a href="#regles-daffaires">Règles d'affaires (RA-XX)</a></li>
        <li class="lvl-3"><a href="#ra-01">RA-01</a></li>
        <li class="lvl-3"><a href="#ra-02">RA-02</a></li>
        <li class="lvl-2"><a href="#validations">Validations (VAL-XX)</a></li>
        <li class="lvl-3"><a href="#val-01">VAL-01</a></li>
        <li class="lvl-3"><a href="#val-02">VAL-02</a></li>
        <li class="lvl-2"><a href="#machine-detats">Flux de statuts / machine d'états</a></li>
        <li class="lvl-2"><a href="#permissions-par-role">Permissions par rôle</a></li>
        <li class="lvl-2"><a href="#glossaire">Glossaire</a></li>
        <li class="lvl-2"><a href="#delta-source-de-verite">Delta des sources de vérité</a></li>
      </ul></nav>
    </aside>
    <div class="docs-main">
      <button class="docs-toc-toggle" type="button" aria-controls="docs-toc">☰ Sommaire</button>
      <article class="docs-article">
        <header class="docs-header">
          <nav class="docs-breadcrumb" aria-label="Fil d'Ariane"><a href="index.html">docs</a><span class="sep">›</span><span aria-current="page">{{PROJECT_SLUG}}-spec</span></nav>
          <span class="docs-badge"><span class="ico" aria-hidden="true">◆</span>Spécification</span>
          <h1 class="docs-title">{{PROJECT_NAME}} — Spécification</h1>
          <p class="docs-blurb">Spécification fonctionnelle — source de vérité des FUNC / RA / VAL</p>
          <div class="docs-meta">
            <span><b>Type</b> · Spécification</span>
            <span><b>Source</b> · <code>{{SPEC_DOC}}</code></span>
            <span><b>Projet</b> · {{PROJECT_NAME}}</span>
            <span>Créé par meta-govern — nouveaux docs via <code>node .claude/scripts/docs-html/scaffold.mjs</code></span>
          </div>
        </header>
        <div class="docs-content">
          <h2 id="vue-densemble"><a class="header-anchor" href="#vue-densemble" aria-hidden="true">#</a> Vue d'ensemble</h2>
          <p>{{PROJECT_DESCRIPTION}}</p>

          <h2 id="conventions-du-document"><a class="header-anchor" href="#conventions-du-document" aria-hidden="true">#</a> Conventions de ce document</h2>
          <p>Cette spécification fonctionnelle est <strong>LA source de vérité</strong> de ce que fait le produit. Chaque changement de code remonte à une entrée FUNC-XX, RA-XX ou VAL-XX de ce document. La spec évolue via le protocole de delta des sources de vérité (voir <code>.claude/rules/spec-protocol.md</code>).</p>
          <p>Conventions d'identifiants :</p>
          <ul>
            <li><strong>FUNC-XX</strong> : fonctionnalités (numérotées séquentiellement)</li>
            <li><strong>RA-XX</strong> : règles d'affaires</li>
            <li><strong>VAL-XX</strong> : validations de saisie</li>
            <li><strong>C-XX</strong> : composants (dans <a href="composants/catalogue-composants.html">catalogue-composants.html</a>, pas ici)</li>
          </ul>
          <p>Document en ajout seul (append-only). Pour modifier : écrire un bloc delta dans le document de design ; le delta est appliqué comme phase finale de <code>/execute-plan</code>.</p>

          <h2 id="personas"><a class="header-anchor" href="#personas" aria-hidden="true">#</a> Personas</h2>
          <p>(Rempli pendant <code>/brainstorm</code> section 4 + <code>/persona-simulator</code>.)</p>
          <h3 id="persona-1"><a class="header-anchor" href="#persona-1" aria-hidden="true">#</a> Persona 1 : &lt;nom&gt;</h3>
          <ul>
            <li>Rôle : …</li>
            <li>Objectifs : …</li>
            <li>Irritants : …</li>
            <li>Aisance technologique : …</li>
          </ul>
          <h3 id="persona-2"><a class="header-anchor" href="#persona-2" aria-hidden="true">#</a> Persona 2 : &lt;nom&gt;</h3>
          <p>…</p>

          <h2 id="fonctionnalites"><a class="header-anchor" href="#fonctionnalites" aria-hidden="true">#</a> Fonctionnalités (FUNC-XX)</h2>
          <h3 id="func-01"><a class="header-anchor" href="#func-01" aria-hidden="true">#</a> FUNC-01 — &lt;nom de la fonctionnalité&gt;</h3>
          <p><strong>Description</strong> : 1-2 phrases.</p>
          <p><strong>Critères d'acceptation</strong> :</p>
          <ul class="contains-task-list">
            <li class="task-list-item"><label><input class="task-list-item-checkbox" disabled="" type="checkbox"> AC1</label></li>
            <li class="task-list-item"><label><input class="task-list-item-checkbox" disabled="" type="checkbox"> AC2</label></li>
          </ul>
          <p><strong>Composants liés</strong> : C-01, C-02</p>
          <p><strong>Validations liées</strong> : VAL-01</p>
          <p><strong>Règles d'affaires liées</strong> : RA-01</p>
          <hr>
          <h3 id="func-02"><a class="header-anchor" href="#func-02" aria-hidden="true">#</a> FUNC-02 — &lt;nom de la fonctionnalité&gt;</h3>
          <p>…</p>

          <h2 id="regles-daffaires"><a class="header-anchor" href="#regles-daffaires" aria-hidden="true">#</a> Règles d'affaires (RA-XX)</h2>
          <h3 id="ra-01"><a class="header-anchor" href="#ra-01" aria-hidden="true">#</a> RA-01 — &lt;nom de la règle&gt;</h3>
          <p><strong>Énoncé</strong> : 1 phrase à la forme déclarative.</p>
          <p><strong>Justification</strong> : 1-2 phrases (le « pourquoi » — rester proche du langage du domaine).</p>
          <p><strong>Mode de défaillance</strong> : ce qui se passe si la règle est violée.</p>
          <hr>
          <h3 id="ra-02"><a class="header-anchor" href="#ra-02" aria-hidden="true">#</a> RA-02 — &lt;nom de la règle&gt;</h3>
          <p>…</p>

          <h2 id="validations"><a class="header-anchor" href="#validations" aria-hidden="true">#</a> Validations (VAL-XX)</h2>
          <h3 id="val-01"><a class="header-anchor" href="#val-01" aria-hidden="true">#</a> VAL-01 — &lt;nom de la validation&gt;</h3>
          <p><strong>Champ</strong> : quel champ / quelle saisie</p>
          <p><strong>Règle</strong> : la logique de validation</p>
          <p><strong>Message d'erreur</strong> : texte affiché à l'utilisateur</p>
{{IF_BILINGUAL}}
          <ul>
            <li>{{LANGUAGE_PRIMARY}} : « … »</li>
            <li>{{LANGUAGE_SECONDARY}} : « … »</li>
          </ul>
{{/IF}}
          <hr>
          <h3 id="val-02"><a class="header-anchor" href="#val-02" aria-hidden="true">#</a> VAL-02 — &lt;nom de la validation&gt;</h3>
          <p>…</p>

          <h2 id="machine-detats"><a class="header-anchor" href="#machine-detats" aria-hidden="true">#</a> Flux de statuts / machine d'états (si applicable)</h2>
          <p>(Pour les projets à workflow non trivial. Documenter les états + les transitions + les permissions par rôle.)</p>
          <pre><code>[État A] --commandes--&gt; [État B]
[État B] --commandes--&gt; [État C]</code></pre>

          <h2 id="permissions-par-role"><a class="header-anchor" href="#permissions-par-role" aria-hidden="true">#</a> Permissions par rôle</h2>
          <div class="table-wrap"><table>
            <thead><tr><th>Rôle</th><th>Peut lire</th><th>Peut éditer</th><th>Peut transitionner</th></tr></thead>
            <tbody><tr><td>…</td><td>…</td><td>…</td><td>…</td></tr></tbody>
          </table></div>

          <h2 id="glossaire"><a class="header-anchor" href="#glossaire" aria-hidden="true">#</a> Glossaire</h2>
          <p>(Définir les termes du langage omniprésent. Croiser avec <code>docs/architecture/glossary.html</code> si le projet est scoré DDD.)</p>

          <h2 id="delta-source-de-verite"><a class="header-anchor" href="#delta-source-de-verite" aria-hidden="true">#</a> Delta des sources de vérité</h2>
          <p>Chaque amendement de la spec passe par un bloc delta dans un document de design <code>/brainstorm</code>. Verbes : <strong>ADD</strong> | <strong>MODIFY</strong> | <strong>REMOVE</strong>. Origine tracée dans le bloc : <code>&lt;!-- origin: design-2026-MM-JJ-sujet.html --&gt;</code>.</p>
          <p>Exemple :</p>
          <pre><code>ADD FUNC-15 « Gestion des soumissions »
- Description : …
- Critères d'acceptation : …

MODIFY FUNC-03
- Ancien AC : « L'utilisateur peut voir ses commandes »
- Nouvel AC : « L'utilisateur peut voir ses commandes triées par date desc »

REMOVE VAL-08 (déprécié ; logique déplacée côté backend)</code></pre>
          <p>(Les deltas sont appliqués ici en ordre chronologique via la tâche apply-delta de <code>/execute-plan</code>.)</p>
        </div>
      </article>
      <footer class="docs-footer">
        <span class="brand">{{PROJECT_NAME}} — Documentation</span>
        <span>Spécification · <code>{{SPEC_DOC}}</code></span>
      </footer>
    </div>
  </div>
  <script src="assets/js/docs-toc.js" defer></script>
</body>
</html>
