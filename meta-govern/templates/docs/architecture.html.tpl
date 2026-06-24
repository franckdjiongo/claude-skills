<!DOCTYPE html>
<!--
  meta-govern — gabarit architecture.html.tpl (rendu vers docs/architecture.html).
  Variables : PROJECT_NAME, LANG, THEME_STORAGE_KEY, META_GOVERN_VERSION,
  STACK_NAME, PACKAGE_MANAGER, RUNTIME, ARCHETYPE, ARCHITECTURE_PATTERN.
  STACK_NAME vient du plan global ; RUNTIME/ARCHETYPE/ARCHITECTURE_PATTERN ont des
  défauts file-level dans buildDefaultPlan (bootstrap-project.mjs) — un plan
  d'architecte peut les fournir au niveau du fichier.
-->
<html lang="{{LANG}}" data-doc-type="architecture">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{PROJECT_NAME}} — Architecture</title>
  <meta name="doc-type" content="architecture">
  <meta name="doc-type-label" content="Architecture">
  <meta name="doc-title" content="{{PROJECT_NAME}} — Architecture">
  <meta name="doc-source" content="docs/architecture.html">
  <meta name="generator" content="meta-govern v{{META_GOVERN_VERSION}}">
  <meta name="description" content="Architecture du dépôt — stack, frontières, propriété des modules">
  <link rel="stylesheet" href="assets/css/docs-theme.css">
  <style>:root{--doc-accent:#0E7490;--doc-glyph:"▲";}</style>
  <script>(function(){try{var t=localStorage.getItem('{{THEME_STORAGE_KEY}}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body data-doc-type="architecture">
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
        <li class="lvl-2"><a href="#mission">Mission</a></li>
        <li class="lvl-2"><a href="#stack-et-runtime">Stack &amp; runtime</a></li>
        <li class="lvl-2"><a href="#archetype-du-projet">Archétype du projet</a></li>
        <li class="lvl-2"><a href="#patron-darchitecture">Patron d'architecture</a></li>
        <li class="lvl-2"><a href="#carte-du-depot">Carte du dépôt</a></li>
        <li class="lvl-2"><a href="#propriete-des-modules">Propriété des modules</a></li>
        <li class="lvl-2"><a href="#frontieres-de-dependances">Frontières de dépendances</a></li>
        <li class="lvl-2"><a href="#flux-de-donnees">Flux de données</a></li>
        <li class="lvl-2"><a href="#serveur-vs-client">Serveur vs client</a></li>
        <li class="lvl-2"><a href="#diagrammes-generes">Diagrammes générés</a></li>
        <li class="lvl-2"><a href="#journal-de-decisions">Journal de décisions</a></li>
        <li class="lvl-2"><a href="#quand-mettre-a-jour">Quand mettre ce fichier à jour</a></li>
      </ul></nav>
    </aside>
    <div class="docs-main">
      <button class="docs-toc-toggle" type="button" aria-controls="docs-toc">☰ Sommaire</button>
      <article class="docs-article">
        <header class="docs-header">
          <nav class="docs-breadcrumb" aria-label="Fil d'Ariane"><a href="index.html">docs</a><span class="sep">›</span><span aria-current="page">architecture</span></nav>
          <span class="docs-badge"><span class="ico" aria-hidden="true">▲</span>Architecture</span>
          <h1 class="docs-title">{{PROJECT_NAME}} — Architecture</h1>
          <p class="docs-blurb">Architecture du dépôt — stack, frontières, propriété des modules</p>
          <div class="docs-meta">
            <span><b>Type</b> · Architecture</span>
            <span><b>Source</b> · <code>docs/architecture.html</code></span>
            <span><b>Projet</b> · {{PROJECT_NAME}}</span>
            <span>Créé par meta-govern — nouveaux docs via <code>node .claude/scripts/docs-html/scaffold.mjs</code></span>
          </div>
        </header>
        <div class="docs-content">
          <h2 id="mission"><a class="header-anchor" href="#mission" aria-hidden="true">#</a> Mission</h2>
          <p>&lt;un paragraphe : ce que fait ce codebase et le résultat à plus fort levier qu'il permet&gt;</p>

          <h2 id="stack-et-runtime"><a class="header-anchor" href="#stack-et-runtime" aria-hidden="true">#</a> Stack &amp; runtime</h2>
          <ul>
            <li>Framework : {{STACK_NAME}}</li>
            <li>Gestionnaire de paquets : {{PACKAGE_MANAGER}}</li>
            <li>Runtime : {{RUNTIME}}</li>
            <li>Déploiement : &lt;où et comment&gt;</li>
          </ul>

          <h2 id="archetype-du-projet"><a class="header-anchor" href="#archetype-du-projet" aria-hidden="true">#</a> Archétype du projet</h2>
          <p><strong>{{ARCHETYPE}}</strong> — voir <code>~/.claude/skills/meta-govern/references/project-archetypes.html</code>.</p>

          <h2 id="patron-darchitecture"><a class="header-anchor" href="#patron-darchitecture" aria-hidden="true">#</a> Patron d'architecture</h2>
          <p><strong>{{ARCHITECTURE_PATTERN}}</strong> — voir <code>~/.claude/skills/meta-govern/references/architecture-patterns.html</code>.</p>

          <h2 id="carte-du-depot"><a class="header-anchor" href="#carte-du-depot" aria-hidden="true">#</a> Carte du dépôt</h2>
          <pre><code>{{PROJECT_NAME}}/
├─ src/
│  ├─ app/       # racine de composition (providers, router, thème)
│  ├─ routes/    # pages visibles par route (ou src/app/ pour Next)
│  ├─ features/  # tranches métier (un dossier par fonctionnalité)
│  └─ shared/    # utilitaires inter-features (gardés petits)
├─ docs/         # ce fichier + agent-playbook + ADRs + sources de vérité
├─ tests/        # e2e (les tests unitaires vivent près du code)
├─ public/
└─ .claude/      # palette workflow (rules, skills, agents, hooks)</code></pre>

          <h2 id="propriete-des-modules"><a class="header-anchor" href="#propriete-des-modules" aria-hidden="true">#</a> Propriété des modules</h2>
          <div class="table-wrap"><table>
            <thead><tr><th>Module</th><th>Propriétaire</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td><code>src/app/</code></td><td>core</td><td>composition uniquement</td></tr>
              <tr><td><code>src/routes/</code></td><td>core</td><td>entrées de routes ; minces</td></tr>
              <tr><td><code>src/features/&lt;feature&gt;/</code></td><td>propriétaire de la feature</td><td>tranche auto-contenue</td></tr>
              <tr><td><code>src/shared/</code></td><td>core</td><td>inter-features ; revue avant ajout</td></tr>
            </tbody>
          </table></div>

          <h2 id="frontieres-de-dependances"><a class="header-anchor" href="#frontieres-de-dependances" aria-hidden="true">#</a> Frontières de dépendances</h2>
          <ul>
            <li><code>src/app</code> peut importer depuis <code>src/routes</code>, <code>src/features</code>, <code>src/shared</code>.</li>
            <li><code>src/routes</code> peut importer depuis <code>src/features</code>, <code>src/shared</code> — jamais une autre route.</li>
            <li><code>src/features</code> peut importer depuis <code>src/shared</code> uniquement — jamais une autre feature.</li>
            <li><code>src/shared</code> ne peut importer que depuis lui-même ou des paquets externes.</li>
          </ul>
          <p>Ces règles sont appliquées (au palier ≥3) par <code>eslint-plugin-boundaries</code>. Voir <code>~/.claude/skills/meta-govern/references/tooling-architecture-checks.html</code>.</p>

          <h2 id="flux-de-donnees"><a class="header-anchor" href="#flux-de-donnees" aria-hidden="true">#</a> Flux de données</h2>
          <p>&lt;une courte sous-section par flux majeur : ex. « L'utilisateur soumet le formulaire → le handler de route valide avec Zod → appelle le service de la feature → le service écrit dans le repository → retourne la réponse »&gt;</p>

          <h2 id="serveur-vs-client"><a class="header-anchor" href="#serveur-vs-client" aria-hidden="true">#</a> Serveur vs client (le cas échéant)</h2>
          <ul>
            <li>Code serveur uniquement : <code>&lt;src/server/ | $lib/server | apps/api/&gt;</code></li>
            <li>Code client uniquement : feuilles marquées <code>'use client'</code> (Next) ou importées dans des chemins navigateur uniquement</li>
            <li>Code partagé : fonctions pures dans <code>src/shared/lib/</code> qui fonctionnent des deux côtés</li>
          </ul>

          <h2 id="diagrammes-generes"><a class="header-anchor" href="#diagrammes-generes" aria-hidden="true">#</a> Diagrammes générés</h2>
          <p>Lancer <code>&lt;commande&gt;</code> pour régénérer le graphe de dépendances à <code>docs/dependency-graph.svg</code>.</p>

          <h2 id="journal-de-decisions"><a class="header-anchor" href="#journal-de-decisions" aria-hidden="true">#</a> Journal de décisions</h2>
          <p>Les décisions d'architecture significatives sont consignées dans <code>docs/decisions/ADR-*.html</code>. Le format suit le gabarit ADR de meta-govern (<code>templates/docs/decisions/ADR-template.html.tpl</code>).</p>

          <h2 id="quand-mettre-a-jour"><a class="header-anchor" href="#quand-mettre-a-jour" aria-hidden="true">#</a> Quand mettre ce fichier à jour</h2>
          <ul>
            <li>Un nouveau répertoire de premier niveau est ajouté.</li>
            <li>Une frontière de propriété change.</li>
            <li>Un paquet partagé est extrait ou supprimé.</li>
            <li>Une nouvelle frontière serveur/client est introduite.</li>
          </ul>
          <p>Ce fichier est chargé à la demande. Le garder concis.</p>
        </div>
      </article>
      <footer class="docs-footer">
        <span class="brand">{{PROJECT_NAME}} — Documentation</span>
        <span>Architecture · <code>docs/architecture.html</code></span>
      </footer>
    </div>
  </div>
  <script src="assets/js/docs-toc.js" defer></script>
</body>
</html>
