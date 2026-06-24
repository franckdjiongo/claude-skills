<!DOCTYPE html>
<!--
  meta-govern — gabarit data-model.html.tpl (rendu au BOOTSTRAP vers docs/data-model.html).
  Variables : PROJECT_NAME, PROJECT_SLUG, DATA_MODEL_DOC, ERROR_CLASS, LANG,
  THEME_STORAGE_KEY, META_GOVERN_VERSION.
  Conditionnels plats : IF_STACK_CONVEX, IF_STACK_POWER_PLATFORM,
  IF_STACK_GENERIC_BACKEND, IF_BILINGUAL, IF_STACK_HAS_FILE_STORAGE.
-->
<html lang="{{LANG}}" data-doc-type="lexique">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{PROJECT_NAME}} — Modèle de données</title>
  <meta name="doc-type" content="lexique">
  <meta name="doc-type-label" content="Lexique de données">
  <meta name="doc-title" content="{{PROJECT_NAME}} — Modèle de données">
  <meta name="doc-source" content="{{DATA_MODEL_DOC}}">
  <meta name="generator" content="meta-govern v{{META_GOVERN_VERSION}}">
  <meta name="description" content="Modèle de données — source de vérité de la persistance">
  <link rel="stylesheet" href="assets/css/docs-theme.css">
  <style>:root{--doc-accent:#0F766E;--doc-glyph:"▦";}</style>
  <script>(function(){try{var t=localStorage.getItem('{{THEME_STORAGE_KEY}}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body data-doc-type="lexique">
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
        <li class="lvl-2"><a href="#tables-entites">Tables / Entités</a></li>
{{IF_STACK_CONVEX}}        <li class="lvl-3"><a href="#schema-convex">Schéma Convex</a></li>
{{/IF}}{{IF_STACK_POWER_PLATFORM}}        <li class="lvl-3"><a href="#tables-dataverse">Tables Dataverse</a></li>
{{/IF}}{{IF_STACK_GENERIC_BACKEND}}        <li class="lvl-3"><a href="#schema-generique">Schéma (générique)</a></li>
{{/IF}}        <li class="lvl-2"><a href="#conventions">Conventions</a></li>
        <li class="lvl-3"><a href="#monnaie">Monnaie</a></li>
{{IF_BILINGUAL}}        <li class="lvl-3"><a href="#champs-bilingues">Champs bilingues</a></li>
{{/IF}}        <li class="lvl-3"><a href="#erreurs">Erreurs</a></li>
        <li class="lvl-3"><a href="#horodatages">Horodatages</a></li>
{{IF_STACK_HAS_FILE_STORAGE}}        <li class="lvl-2"><a href="#stockage-de-fichiers">Stockage de fichiers</a></li>
        <li class="lvl-3"><a href="#layout-r2">Layout R2</a></li>
        <li class="lvl-3"><a href="#flux-de-televersement">Flux de téléversement</a></li>
{{/IF}}        <li class="lvl-2"><a href="#delta-source-de-verite">Delta des sources de vérité</a></li>
      </ul></nav>
    </aside>
    <div class="docs-main">
      <button class="docs-toc-toggle" type="button" aria-controls="docs-toc">☰ Sommaire</button>
      <article class="docs-article">
        <header class="docs-header">
          <nav class="docs-breadcrumb" aria-label="Fil d'Ariane"><a href="index.html">docs</a><span class="sep">›</span><span aria-current="page">data-model</span></nav>
          <span class="docs-badge"><span class="ico" aria-hidden="true">▦</span>Lexique de données</span>
          <h1 class="docs-title">{{PROJECT_NAME}} — Modèle de données</h1>
          <p class="docs-blurb">Modèle de données — source de vérité de la persistance</p>
          <div class="docs-meta">
            <span><b>Type</b> · Lexique de données</span>
            <span><b>Source</b> · <code>{{DATA_MODEL_DOC}}</code></span>
            <span><b>Projet</b> · {{PROJECT_NAME}}</span>
            <span>Créé par meta-govern — nouveaux docs via <code>node .claude/scripts/docs-html/scaffold.mjs</code></span>
          </div>
        </header>
        <div class="docs-content">
          <h2 id="vue-densemble"><a class="header-anchor" href="#vue-densemble" aria-hidden="true">#</a> Vue d'ensemble</h2>
          <p>Bref : ce que représente le modèle de données (entités, relations, cycles de vie).</p>
          <p>Ce document est la source de vérité du modèle de données du projet. Chaque changement de persistance remonte à une entrée de ce document. Il évolue via le protocole de delta des sources de vérité.</p>

          <h2 id="tables-entites"><a class="header-anchor" href="#tables-entites" aria-hidden="true">#</a> Tables / Entités</h2>
{{IF_STACK_CONVEX}}
          <h3 id="schema-convex"><a class="header-anchor" href="#schema-convex" aria-hidden="true">#</a> Schéma Convex</h3>
          <p>Situé à <code>convex/schema.ts</code>. Chaque table a :</p>
          <ul>
            <li>un validateur de champs (<code>v.object({...})</code>)</li>
            <li>des index pour les patrons de requête</li>
            <li>un README à <code>convex/&lt;table&gt;/README.md</code> documentant son rôle</li>
          </ul>
          <h4>Table : <code>&lt;nom-de-table&gt;</code></h4>
          <p><strong>Champs</strong> :</p>
          <div class="table-wrap"><table>
            <thead><tr><th>Nom</th><th>Type</th><th>Validateur</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td>_id</td><td>Id&lt;"&lt;table&gt;"&gt;</td><td>auto</td><td>clé primaire</td></tr>
              <tr><td>_creationTime</td><td>number</td><td>auto</td><td>epoch ms</td></tr>
              <tr><td>…</td><td>…</td><td>…</td><td>…</td></tr>
            </tbody>
          </table></div>
          <p><strong>Index</strong> :</p>
          <ul>
            <li><code>byUser</code> — <code>["userId"]</code> — requête par utilisateur</li>
            <li><code>byStatus</code> — <code>["status", "_creationTime"]</code> — liste chronologique par statut</li>
          </ul>
          <p><strong>Relations</strong> :</p>
          <ul>
            <li><code>userId</code> → <code>users._id</code> (1:N)</li>
            <li>…</li>
          </ul>
          <hr>
{{/IF}}
{{IF_STACK_POWER_PLATFORM}}
          <h3 id="tables-dataverse"><a class="header-anchor" href="#tables-dataverse" aria-hidden="true">#</a> Tables Dataverse</h3>
          <h4>Table : <code>cr&lt;prefix&gt;_&lt;entityname&gt;</code></h4>
          <p><strong>Nom d'affichage</strong> : &lt;Entity Name&gt;<br>
          <strong>Nom logique</strong> : cr&lt;prefix&gt;_&lt;entityname&gt;</p>
          <p><strong>Colonnes</strong> :</p>
          <div class="table-wrap"><table>
            <thead><tr><th>Nom logique</th><th>Affichage</th><th>Type</th><th>Requis</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td>cr&lt;prefix&gt;_id</td><td>ID</td><td>UniqueIdentifier</td><td>oui</td><td>clé primaire</td></tr>
              <tr><td>cr&lt;prefix&gt;_name</td><td>Name</td><td>Text(100)</td><td>oui</td><td>affichage</td></tr>
              <tr><td>cr&lt;prefix&gt;_status</td><td>Status</td><td>OptionSet</td><td>oui</td><td>voir Ensembles d'options</td></tr>
              <tr><td>cr&lt;prefix&gt;_&lt;lookup&gt;id</td><td>Lookup</td><td>Lookup</td><td>conditionnel</td><td>→ cr&lt;prefix&gt;_&lt;targetentity&gt;</td></tr>
              <tr><td>…</td><td>…</td><td>…</td><td>…</td><td>…</td></tr>
            </tbody>
          </table></div>
          <p><strong>Lookups</strong> :</p>
          <ul>
            <li><code>cr&lt;prefix&gt;_&lt;lookupname&gt;</code> → <code>cr&lt;prefix&gt;_&lt;targetentity&gt;</code> (N:1)</li>
            <li>…</li>
          </ul>
          <p><strong>Ensembles d'options</strong> :</p>
          <ul>
            <li><code>cr&lt;prefix&gt;_status</code> :
              <ul>
                <li>1 = « Draft »</li>
                <li>2 = « Active »</li>
                <li>3 = « Archived »</li>
              </ul>
            </li>
          </ul>
          <p><strong>Filtres OData / conventions GUID</strong> :</p>
          <ul>
            <li>Les IDs sont sensibles à la casse dans <code>@odata.bind</code></li>
            <li>Les colonnes formule ne peuvent pas être utilisées dans les filtres OData (RA-XX dans la spec)</li>
            <li>Lookups : <code>_cr&lt;prefix&gt;_&lt;lookupname&gt;_value</code> retourne le GUID</li>
          </ul>
          <hr>
{{/IF}}
{{IF_STACK_GENERIC_BACKEND}}
          <h3 id="schema-generique"><a class="header-anchor" href="#schema-generique" aria-hidden="true">#</a> Schéma (générique)</h3>
          <p>Chaque table a : des champs (typés), des index, des relations (FK), des contraintes.</p>
          <h4>Table : <code>&lt;table_name&gt;</code></h4>
          <p><strong>Champs</strong> :</p>
          <div class="table-wrap"><table>
            <thead><tr><th>Nom</th><th>Type</th><th>Nullable</th><th>Défaut</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td>id</td><td>UUID</td><td>non</td><td>gen_uuid()</td><td>clé primaire</td></tr>
              <tr><td>created_at</td><td>TIMESTAMPTZ</td><td>non</td><td>now()</td><td></td></tr>
              <tr><td>…</td><td>…</td><td>…</td><td>…</td><td>…</td></tr>
            </tbody>
          </table></div>
          <p><strong>Index</strong> :</p>
          <ul>
            <li><code>&lt;table&gt;_&lt;col&gt;_idx</code> sur <code>&lt;col&gt;</code></li>
          </ul>
          <p><strong>Relations</strong> :</p>
          <ul>
            <li><code>&lt;col&gt;</code> → <code>&lt;table&gt;.&lt;col&gt;</code> (N:1, ON DELETE SET NULL)</li>
          </ul>
          <p><strong>Contraintes</strong> :</p>
          <ul>
            <li>CHECK (…)</li>
            <li>UNIQUE (…)</li>
          </ul>
          <hr>
{{/IF}}
          <h2 id="conventions"><a class="header-anchor" href="#conventions" aria-hidden="true">#</a> Conventions</h2>
          <h3 id="monnaie"><a class="header-anchor" href="#monnaie" aria-hidden="true">#</a> Monnaie</h3>
          <p>Stockée en cents entiers (ex. <code>priceCents: number</code>, pas <code>priceFloat: number</code>). Devise : &lt;CAD/USD/EUR&gt;. Affichage via <code>Intl.NumberFormat</code>.</p>
{{IF_BILINGUAL}}
          <h3 id="champs-bilingues"><a class="header-anchor" href="#champs-bilingues" aria-hidden="true">#</a> Champs bilingues</h3>
          <p>Les chaînes bilingues visibles par l'utilisateur sont stockées en colonnes dénormalisées : <code>&lt;champ&gt;En</code> + <code>&lt;champ&gt;Fr</code> (PAS un objet JSON). Exemple : <code>nameEn</code>, <code>nameFr</code>.</p>
{{/IF}}
          <h3 id="erreurs"><a class="header-anchor" href="#erreurs" aria-hidden="true">#</a> Erreurs</h3>
          <p>Levées comme <code>{{ERROR_CLASS}}</code> avec des codes (ex. <code>INVALID_AMOUNT</code>, <code>INSUFFICIENT_PERMISSIONS</code>). Les codes sont ajoutés à <code>constants/content/&lt;section&gt;.ts</code> pour la traduction.</p>
          <h3 id="horodatages"><a class="header-anchor" href="#horodatages" aria-hidden="true">#</a> Horodatages</h3>
          <ul>
            <li><code>_creationTime</code> (Convex) / <code>created_at</code> (générique) — posé à l'insertion</li>
            <li>Les autres horodatages sont explicites (<code>shippedAt</code>, <code>cancelledAt</code>)</li>
            <li>Tout en UTC ; affichage via <code>Intl.DateTimeFormat</code></li>
          </ul>
{{IF_STACK_HAS_FILE_STORAGE}}
          <h2 id="stockage-de-fichiers"><a class="header-anchor" href="#stockage-de-fichiers" aria-hidden="true">#</a> Stockage de fichiers</h2>
          <p>(Pour les projets avec téléversement de fichiers. Documenter le layout R2, les URLs signées, les politiques de rétention.)</p>
          <h3 id="layout-r2"><a class="header-anchor" href="#layout-r2" aria-hidden="true">#</a> Layout R2</h3>
          <pre><code>&lt;bucket&gt;/
├── uploads/&lt;userId&gt;/&lt;fileId&gt;.&lt;ext&gt;
├── thumbnails/&lt;fileId&gt;.webp
└── …</code></pre>
          <h3 id="flux-de-televersement"><a class="header-anchor" href="#flux-de-televersement" aria-hidden="true">#</a> Flux de téléversement</h3>
          <ol>
            <li>Le client demande une URL de téléversement via une mutation</li>
            <li>La mutation crée la ligne en base + l'URL signée</li>
            <li>Le client téléverse vers R2</li>
            <li>La mutation marque le téléversement complété</li>
          </ol>
{{/IF}}
          <h2 id="delta-source-de-verite"><a class="header-anchor" href="#delta-source-de-verite" aria-hidden="true">#</a> Delta des sources de vérité</h2>
          <p>Même protocole que <a href="{{PROJECT_SLUG}}-spec.html">la spécification</a>. Verbes : <strong>ADD</strong> | <strong>MODIFY</strong> | <strong>REMOVE</strong>.</p>
          <p>Exemples :</p>
          <pre><code>ADD table `quotes`
- Champs : id, userId, total, status, createdAt
- Index : byUser

MODIFY `users.email`
- Ancien : nullable
- Nouveau : requis + UNIQUE

REMOVE `legacyOrders` (déprécié 2026-MM-JJ ; données archivées)</code></pre>
          <p>(Deltas en ordre chronologique ; appliqués via la phase apply-delta de <code>/execute-plan</code>.)</p>
        </div>
      </article>
      <footer class="docs-footer">
        <span class="brand">{{PROJECT_NAME}} — Documentation</span>
        <span>Lexique de données · <code>{{DATA_MODEL_DOC}}</code></span>
      </footer>
    </div>
  </div>
  <script src="assets/js/docs-toc.js" defer></script>
</body>
</html>
