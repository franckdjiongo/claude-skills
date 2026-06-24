<!DOCTYPE html>
<!--
  meta-govern — gabarit catalogue-composants.html.tpl
  (rendu au BOOTSTRAP vers docs/composants/catalogue-composants.html).
  Variables : PROJECT_NAME, PROJECT_SLUG, CATALOG_DOC, COMPONENT_DIR, LANG,
  THEME_STORAGE_KEY, META_GOVERN_VERSION.
  Conditionnel plat : IF_BILINGUAL (principe de design bilingue — le bloc est
  correctement fermé ici, contrairement au .md.tpl historique qui laissait un
  marqueur orphelin).
-->
<html lang="{{LANG}}" data-doc-type="lexique">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{PROJECT_NAME}} — Catalogue de composants</title>
  <meta name="doc-type" content="lexique">
  <meta name="doc-type-label" content="Catalogue de composants">
  <meta name="doc-title" content="{{PROJECT_NAME}} — Catalogue de composants">
  <meta name="doc-source" content="{{CATALOG_DOC}}">
  <meta name="generator" content="meta-govern v{{META_GOVERN_VERSION}}">
  <meta name="description" content="Catalogue de composants — source de vérité du vocabulaire UI (C-XX)">
  <link rel="stylesheet" href="../assets/css/docs-theme.css">
  <style>:root{--doc-accent:#0F766E;--doc-glyph:"▦";}</style>
  <script>(function(){try{var t=localStorage.getItem('{{THEME_STORAGE_KEY}}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body data-doc-type="lexique">
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
        <li class="lvl-2"><a href="#vue-densemble">Vue d'ensemble</a></li>
        <li class="lvl-2"><a href="#principes-de-design">Principes de design</a></li>
        <li class="lvl-2"><a href="#composants">Composants</a></li>
        <li class="lvl-3"><a href="#c-01">C-01</a></li>
        <li class="lvl-3"><a href="#c-02">C-02</a></li>
        <li class="lvl-3"><a href="#c-03">C-03</a></li>
        <li class="lvl-2"><a href="#exemples-de-composition">Exemples de composition</a></li>
        <li class="lvl-3"><a href="#layout-nom">Layout : &lt;nom&gt;</a></li>
        <li class="lvl-2"><a href="#tokens-de-design">Tokens de design</a></li>
        <li class="lvl-3"><a href="#couleurs">Couleurs</a></li>
        <li class="lvl-3"><a href="#typographie">Typographie</a></li>
        <li class="lvl-3"><a href="#espacement">Espacement</a></li>
        <li class="lvl-3"><a href="#mouvement">Mouvement</a></li>
        <li class="lvl-2"><a href="#prototypes-html">Prototypes HTML</a></li>
        <li class="lvl-2"><a href="#delta-source-de-verite">Delta des sources de vérité</a></li>
      </ul></nav>
    </aside>
    <div class="docs-main">
      <button class="docs-toc-toggle" type="button" aria-controls="docs-toc">☰ Sommaire</button>
      <article class="docs-article">
        <header class="docs-header">
          <nav class="docs-breadcrumb" aria-label="Fil d'Ariane"><a href="../index.html">docs</a><span class="sep">›</span><a href="../index.html#lexique">composants</a><span class="sep">›</span><span aria-current="page">catalogue-composants</span></nav>
          <span class="docs-badge"><span class="ico" aria-hidden="true">▦</span>Catalogue de composants</span>
          <h1 class="docs-title">{{PROJECT_NAME}} — Catalogue de composants</h1>
          <p class="docs-blurb">Catalogue de composants — source de vérité du vocabulaire UI (C-XX)</p>
          <div class="docs-meta">
            <span><b>Type</b> · Catalogue de composants</span>
            <span><b>Source</b> · <code>{{CATALOG_DOC}}</code></span>
            <span><b>Projet</b> · {{PROJECT_NAME}}</span>
            <span>Créé par meta-govern — nouveaux docs via <code>node .claude/scripts/docs-html/scaffold.mjs</code></span>
          </div>
        </header>
        <div class="docs-content">
          <h2 id="vue-densemble"><a class="header-anchor" href="#vue-densemble" aria-hidden="true">#</a> Vue d'ensemble</h2>
          <p>Le catalogue de composants définit le vocabulaire UI du projet. Chaque composant référencé dans la spec (FUNC-XX) remonte à une entrée C-XX de ce document.</p>
          <p>Ce document est la source de vérité du vocabulaire de composants du projet. Chaque C-XX est une brique d'interface. Le catalogue évolue via le protocole de delta. Les prototypes HTML vivent à côté (un par C-XX) et sont référencés depuis la spec.</p>

          <h2 id="principes-de-design"><a class="header-anchor" href="#principes-de-design" aria-hidden="true">#</a> Principes de design</h2>
          <ul>
            <li><strong>Composabilité</strong> &gt; composants monolithiques</li>
            <li><strong>La logique à état vit dans des hooks</strong>, pas dans les composants</li>
{{IF_BILINGUAL}}            <li><strong>Bilingue</strong> : chaque chaîne visible par l'utilisateur passe par <code>LocalizedString</code> + <code>useContent()</code></li>
{{/IF}}            <li><strong>Cibles tactiles</strong> : ≥44px (≥36px pour les contrôles denses)</li>
            <li><strong>Accessibilité</strong> : HTML sémantique, aria-label, navigation clavier</li>
            <li><strong>Tokens uniquement</strong> : pas de hex/rgba inline ; tokens de design depuis la config Tailwind</li>
          </ul>

          <h2 id="composants"><a class="header-anchor" href="#composants" aria-hidden="true">#</a> Composants</h2>
          <h3 id="c-01"><a class="header-anchor" href="#c-01" aria-hidden="true">#</a> C-01 — &lt;Nom du composant&gt;</h3>
          <p><strong>Chemin</strong> : <code>{{COMPONENT_DIR}}&lt;ComponentName&gt;.tsx</code></p>
          <p><strong>Rôle</strong> : 1 phrase décrivant ce qu'il rend.</p>
          <p><strong>Props</strong> :</p>
          <div class="table-wrap"><table>
            <thead><tr><th>Prop</th><th>Type</th><th>Requis</th><th>Défaut</th><th>Notes</th></tr></thead>
            <tbody><tr><td>…</td><td>…</td><td>…</td><td>…</td><td>…</td></tr></tbody>
          </table></div>
          <p><strong>Variantes</strong> (le cas échéant) :</p>
          <ul>
            <li><code>default</code></li>
            <li><code>compact</code></li>
            <li><code>disabled</code></li>
          </ul>
          <p><strong>États</strong> :</p>
          <ul>
            <li>Chargement</li>
            <li>Vide</li>
            <li>Erreur</li>
            <li>Rempli</li>
          </ul>
          <p><strong>Prototype HTML</strong> : <code>docs/composants/prototypes/C-01-&lt;component-name&gt;.html</code></p>
          <p><strong>Utilisé dans</strong> : FUNC-01, FUNC-03</p>
          <p><strong>Validations liées</strong> : VAL-02</p>
          <p><strong>Tests</strong> : <code>tests/&lt;ComponentName&gt;.test.tsx</code></p>
          <p><strong>Notes</strong> :</p>
          <ul>
            <li>Utilise <code>useSyncedState</code> pour la synchro des props (pas de <code>useEffect</code> + <code>setState</code> pour synchroniser une prop)</li>
            <li>Couleurs de marque via tokens (<code>brand.blue</code>, <code>brand.gold</code>)</li>
          </ul>
          <hr>
          <h3 id="c-02"><a class="header-anchor" href="#c-02" aria-hidden="true">#</a> C-02 — &lt;Nom du composant&gt;</h3>
          <p>[même forme que C-01]</p>
          <hr>
          <h3 id="c-03"><a class="header-anchor" href="#c-03" aria-hidden="true">#</a> C-03 — &lt;Nom du composant&gt;</h3>
          <p>[…]</p>

          <h2 id="exemples-de-composition"><a class="header-anchor" href="#exemples-de-composition" aria-hidden="true">#</a> Exemples de composition</h2>
          <h3 id="layout-nom"><a class="header-anchor" href="#layout-nom" aria-hidden="true">#</a> Layout : &lt;nom&gt;</h3>
          <p>Composé de : C-01, C-02, C-05.</p>
          <pre><code>&lt;MainLayout&gt;
  &lt;Header /&gt;        {/* C-01 */}
  &lt;SideNav /&gt;       {/* C-02 */}
  &lt;ContentArea&gt;
    &lt;Card /&gt;        {/* C-05 */}
  &lt;/ContentArea&gt;
&lt;/MainLayout&gt;</code></pre>

          <h2 id="tokens-de-design"><a class="header-anchor" href="#tokens-de-design" aria-hidden="true">#</a> Tokens de design</h2>
          <p>Situés à <code>src/styles/_design-tokens.css</code> et <code>tailwind.config.js</code>.</p>
          <h3 id="couleurs"><a class="header-anchor" href="#couleurs" aria-hidden="true">#</a> Couleurs</h3>
          <ul>
            <li>Primaire de marque : &lt;hex&gt; (<code>brand.blue</code>)</li>
            <li>Accent de marque : &lt;hex&gt; (<code>brand.gold</code>)</li>
            <li>Échelle de neutres 50-900</li>
            <li>Sémantiques : succès (green-600), avertissement (yellow-600), erreur (red-600), info (blue-600)</li>
          </ul>
          <h3 id="typographie"><a class="header-anchor" href="#typographie" aria-hidden="true">#</a> Typographie</h3>
          <ul>
            <li>Titres : <code>&lt;police&gt;</code> &lt;graisse&gt;</li>
            <li>Corps : <code>&lt;police&gt;</code> &lt;graisse&gt;</li>
            <li>Mono : <code>&lt;police&gt;</code> (pour le code)</li>
          </ul>
          <h3 id="espacement"><a class="header-anchor" href="#espacement" aria-hidden="true">#</a> Espacement</h3>
          <p>Échelle Tailwind par défaut (base 4px) : <code>gap-1</code> (4px), <code>gap-2</code> (8px), <code>gap-4</code> (16px), <code>gap-8</code> (32px).</p>
          <h3 id="mouvement"><a class="header-anchor" href="#mouvement" aria-hidden="true">#</a> Mouvement</h3>
          <p>Easing : <code>ease-out</code> pour les entrées, <code>ease-in</code> pour les sorties. Durées : 150ms (micro), 300ms (transitions), 600ms (page).</p>

          <h2 id="prototypes-html"><a class="header-anchor" href="#prototypes-html" aria-hidden="true">#</a> Prototypes HTML</h2>
          <p>Chaque C-XX a un prototype HTML codé main à <code>docs/composants/prototypes/C-XX-&lt;nom&gt;.html</code>. Les prototypes sont en référence seule (non consommés par le build) et servent de contrats visuels pour l'implémentation.</p>

          <h2 id="delta-source-de-verite"><a class="header-anchor" href="#delta-source-de-verite" aria-hidden="true">#</a> Delta des sources de vérité</h2>
          <p>Même protocole que <a href="../{{PROJECT_SLUG}}-spec.html">la spécification</a>. Verbes : <strong>ADD</strong> | <strong>MODIFY</strong> | <strong>REMOVE</strong>.</p>
          <p>Exemples :</p>
          <pre><code>ADD C-12 « QuoteSummaryCard »
- Chemin : components/cart/QuoteSummaryCard.tsx
- Props : items, total, onSubmit
- Utilisé dans : FUNC-15

MODIFY C-03 « Button »
- Nouvelle variante : 'destructive' (pour les actions de suppression)

REMOVE C-08 « DropdownLegacy » (remplacé par C-08-v2)</code></pre>
          <p>(Deltas appliqués via la phase apply-delta de <code>/execute-plan</code>.)</p>
        </div>
      </article>
      <footer class="docs-footer">
        <span class="brand">{{PROJECT_NAME}} — Documentation</span>
        <span>Catalogue de composants · <code>{{CATALOG_DOC}}</code></span>
      </footer>
    </div>
  </div>
  <script src="../assets/js/docs-toc.js" defer></script>
</body>
</html>
