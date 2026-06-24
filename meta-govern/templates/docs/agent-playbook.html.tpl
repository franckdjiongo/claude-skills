<!DOCTYPE html>
<!--
  meta-govern — gabarit agent-playbook.html.tpl (rendu vers docs/agent-playbook.html).
  Variables : PROJECT_NAME, LANG, THEME_STORAGE_KEY, META_GOVERN_VERSION, VALIDATE_COMMAND
  (alignée sur buildDefaultPlan de scripts/bootstrap-project.mjs — pas de VALIDATE_CMD).
-->
<html lang="{{LANG}}" data-doc-type="playbook">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{PROJECT_NAME}} — Playbook agents</title>
  <meta name="doc-type" content="playbook">
  <meta name="doc-type-label" content="Playbook">
  <meta name="doc-title" content="{{PROJECT_NAME}} — Playbook agents">
  <meta name="doc-source" content="docs/agent-playbook.html">
  <meta name="generator" content="meta-govern v{{META_GOVERN_VERSION}}">
  <meta name="description" content="Playbook agents — comment réaliser les tâches courantes du dépôt">
  <link rel="stylesheet" href="assets/css/docs-theme.css">
  <style>:root{--doc-accent:#334155;--doc-glyph:"☰";}</style>
  <script>(function(){try{var t=localStorage.getItem('{{THEME_STORAGE_KEY}}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body data-doc-type="playbook">
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
        <li class="lvl-2"><a href="#ajouter-une-fonctionnalite">Ajouter une fonctionnalité</a></li>
        <li class="lvl-2"><a href="#ajouter-un-endpoint">Ajouter un endpoint / handler de route</a></li>
        <li class="lvl-2"><a href="#ajouter-un-composant-ui">Ajouter un formulaire / composant UI</a></li>
        <li class="lvl-2"><a href="#executer-une-migration">Lancer / écrire une migration</a></li>
        <li class="lvl-2"><a href="#ajouter-une-table-dataverse">Ajouter une table Dataverse</a></li>
        <li class="lvl-2"><a href="#publier-une-version">Publier une version</a></li>
        <li class="lvl-2"><a href="#creer-un-worktree">Mettre en place un worktree</a></li>
        <li class="lvl-2"><a href="#differer-du-travail">Différer du travail</a></li>
        <li class="lvl-2"><a href="#bump-meta-govern">Monter de version meta-govern</a></li>
        <li class="lvl-2"><a href="#playbook-perime">Quand le playbook devient périmé</a></li>
        <li class="lvl-2"><a href="#skills-references">Skills référencés ici</a></li>
      </ul></nav>
    </aside>
    <div class="docs-main">
      <button class="docs-toc-toggle" type="button" aria-controls="docs-toc">☰ Sommaire</button>
      <article class="docs-article">
        <header class="docs-header">
          <nav class="docs-breadcrumb" aria-label="Fil d'Ariane"><a href="index.html">docs</a><span class="sep">›</span><span aria-current="page">agent-playbook</span></nav>
          <span class="docs-badge"><span class="ico" aria-hidden="true">☰</span>Playbook</span>
          <h1 class="docs-title">{{PROJECT_NAME}} — Playbook agents</h1>
          <p class="docs-blurb">Playbook agents — comment réaliser les tâches courantes du dépôt</p>
          <div class="docs-meta">
            <span><b>Type</b> · Playbook</span>
            <span><b>Source</b> · <code>docs/agent-playbook.html</code></span>
            <span><b>Projet</b> · {{PROJECT_NAME}}</span>
            <span>Créé par meta-govern — nouveaux docs via <code>node .claude/scripts/docs-html/scaffold.mjs</code></span>
          </div>
        </header>
        <div class="docs-content">
          <p>Comment réaliser les tâches courantes dans ce dépôt. Chaque entrée du playbook est courte et pointe vers le skill pertinent.</p>

          <h2 id="ajouter-une-fonctionnalite"><a class="header-anchor" href="#ajouter-une-fonctionnalite" aria-hidden="true">#</a> Ajouter une fonctionnalité</h2>
          <ol>
            <li><code>/brainstorm "&lt;sujet de la fonctionnalité&gt;"</code> — phase de design.<br>Sortie : <code>docs/specs/AAAA-MM-JJ-&lt;sujet&gt;-design.html</code> avec un bloc « Source of truth delta ».</li>
            <li><code>/write-plan</code> — convertit le design en plan.<br>Sortie : <code>docs/plans/AAAA-MM-JJ-&lt;sujet&gt;-plan.html</code> avec Tâche 1 = « Appliquer le delta des sources de vérité ».</li>
            <li><code>/execute-plan</code> — dispatch implémenteur + reviewers par tâche.</li>
            <li><code>/quality-gate</code> — scan final avant merge.</li>
            <li>Lancer <code>{{VALIDATE_COMMAND}}</code> pour confirmer.</li>
            <li>Commit par tâche ou par groupe selon le tier.</li>
          </ol>

          <h2 id="ajouter-un-endpoint"><a class="header-anchor" href="#ajouter-un-endpoint" aria-hidden="true">#</a> Ajouter un endpoint / handler de route</h2>
          <ol>
            <li>Identifier la feature propriétaire. La logique d'endpoint appartient à une feature, pas à la route.</li>
            <li>Créer :
              <ul>
                <li>Fichier frontière : <code>&lt;chemin de route&gt;/route.ts</code> (ou <code>+server.ts</code>) — parser, valider (Zod), appeler le service de la feature, répondre.</li>
                <li>Service de feature : <code>src/features/&lt;feature&gt;/services/&lt;nom&gt;.ts</code> — logique durable.</li>
                <li>Schéma : <code>src/shared/schemas/&lt;endpoint&gt;.ts</code> (si réutilisé) ou <code>src/features/&lt;feature&gt;/schemas/</code>.</li>
              </ul>
            </li>
            <li>Ajouter un test dans <code>&lt;feature&gt;/__tests__/&lt;nom&gt;.test.ts</code> (ou <code>.http.test.ts</code> pour l'intégration).</li>
            <li>Croiser la référence FUNC-XX dans la spec.</li>
            <li>Lancer <code>{{VALIDATE_COMMAND}}</code>.</li>
          </ol>

          <h2 id="ajouter-un-composant-ui"><a class="header-anchor" href="#ajouter-un-composant-ui" aria-hidden="true">#</a> Ajouter un formulaire / composant UI</h2>
          <ol>
            <li>Vérifier <a href="composants/catalogue-composants.html"><code>docs/composants/catalogue-composants.html</code></a> — réutiliser si un <code>C-XX</code> existe.</li>
            <li>Un nouveau composant vit à <code>src/features/&lt;feature&gt;/components/&lt;Nom&gt;.tsx</code>, ou <code>src/shared/ui/&lt;Nom&gt;.tsx</code> si inter-features.</li>
            <li>Utiliser les tokens de design (utilitaires Tailwind uniquement) ; pas de hex/rgba inline.</li>
            <li>Chaînes visibles par l'utilisateur via <code>LocalizedString</code> + <code>useContent()</code> (si bilingue).</li>
            <li>Ajouter l'accessibilité : aria-label, textes alternatifs, navigation clavier, cibles tactiles 44px.</li>
            <li>Ajouter un test avec Testing Library.</li>
            <li>Mettre à jour <code>catalogue-composants.html</code> avec la nouvelle entrée <code>C-XX</code>.</li>
          </ol>

          <h2 id="executer-une-migration"><a class="header-anchor" href="#executer-une-migration" aria-hidden="true">#</a> Lancer / écrire une migration</h2>
          <ol>
            <li>Lire <code>docs/security.html</code> pour les règles de sécurité.</li>
            <li>Les fichiers de migration vivent à <code>&lt;répertoire migrations&gt;/AAAA-MM-JJ-HHMM_&lt;description&gt;.&lt;ext&gt;</code>.</li>
            <li>Les migrations sont idempotentes ; ne jamais éditer une migration déjà livrée.</li>
            <li>Tester localement (ou en staging) avant d'appliquer aux environnements partagés.</li>
            <li>Documenter l'intention de la migration dans la description de la PR.</li>
            <li>Après application, mettre à jour <a href="data-model.html"><code>docs/data-model.html</code></a> si le schéma a changé.</li>
          </ol>

          <h2 id="ajouter-une-table-dataverse"><a class="header-anchor" href="#ajouter-une-table-dataverse" aria-hidden="true">#</a> Ajouter une table Dataverse (Power Platform uniquement)</h2>
          <p>Utiliser le skill <code>add-dataverse</code> — il génère les types/services depuis la table.</p>

          <h2 id="publier-une-version"><a class="header-anchor" href="#publier-une-version" aria-hidden="true">#</a> Publier une version</h2>
          <ol>
            <li>S'assurer que <code>{{VALIDATE_COMMAND}}</code> passe sur la branche.</li>
            <li><code>/quality-gate</code> rapporte CRITICAL / HIGH = 0.</li>
            <li>Merger vers main.</li>
            <li>Taguer si applicable : <code>git tag vX.Y.Z</code>.</li>
            <li>Déployer via &lt;processus de déploiement&gt;.</li>
            <li>Surveiller &lt;tableaux de bord d'observabilité&gt; pendant ≥1 heure après le déploiement.</li>
          </ol>

          <h2 id="creer-un-worktree"><a class="header-anchor" href="#creer-un-worktree" aria-hidden="true">#</a> Mettre en place un worktree (palier 3+)</h2>
          <p>Lancer <code>node .claude/scripts/setup-worktree.mjs &lt;nom-de-branche&gt;</code>. Le worktree atterrit à <code>.claude/.worktrees/&lt;nom&gt;/</code>.</p>

          <h2 id="differer-du-travail"><a class="header-anchor" href="#differer-du-travail" aria-hidden="true">#</a> Différer du travail</h2>
          <p>Ajouter une entrée DEFERRED-XXX à <a href="backlog-deferred.html"><code>docs/backlog-deferred.html</code></a>. Chaque entrée : ID, sévérité, zone, ce qui a été différé, pourquoi, qui/quand réviser.</p>

          <h2 id="bump-meta-govern"><a class="header-anchor" href="#bump-meta-govern" aria-hidden="true">#</a> Monter de version meta-govern (quand meta-govern publie une mise à jour)</h2>
          <ol>
            <li>L'utilisateur lance <code>/meta-govern</code> et choisit MIGRATE.</li>
            <li>meta-govern lit le changelog de <code>~/.claude/skills/meta-govern/version.json</code>.</li>
            <li>Appliquer la migration étape par étape. Valider entre les étapes.</li>
            <li>Mettre à jour <code>.claude/.meta-govern.json</code> avec la nouvelle version.</li>
          </ol>

          <h2 id="playbook-perime"><a class="header-anchor" href="#playbook-perime" aria-hidden="true">#</a> Quand le playbook devient périmé</h2>
          <p>L'utilisateur lance <code>/govern-claude</code> (audit au niveau projet) — la dérive est détectée et des mises à jour sont proposées.</p>

          <h2 id="skills-references"><a class="header-anchor" href="#skills-references" aria-hidden="true">#</a> Skills référencés ici</h2>
          <ul>
            <li><code>brainstorm</code> (projet) — phase de design</li>
            <li><code>write-plan</code> (projet) — phase de plan</li>
            <li><code>execute-plan</code> (projet) — dispatcher d'exécution</li>
            <li><code>quality-gate</code> (projet) — scan final</li>
            <li><code>add-dataverse</code> (niveau utilisateur) — spécifique Dataverse</li>
            <li><code>meta-govern</code> (niveau utilisateur) — gouvernance du workflow</li>
            <li><code>govern-claude</code> (projet) — audit du projet</li>
          </ul>
        </div>
      </article>
      <footer class="docs-footer">
        <span class="brand">{{PROJECT_NAME}} — Documentation</span>
        <span>Playbook · <code>docs/agent-playbook.html</code></span>
      </footer>
    </div>
  </div>
  <script src="assets/js/docs-toc.js" defer></script>
</body>
</html>
