---
name: galley
description: >-
  Galley est le sous-système de revue d'artefacts HTML de la workstation : des
  commentaires ancrés (et généraux) vivent DANS le fichier .html, l'utilisateur
  annote, et Claude lit, édite le HTML, répond et résout. Utilise ce skill dès que
  l'utilisateur demande de « traiter / relire / réviser les commentaires » d'un
  fichier .html, parle de « Galley », « revue HTML », « épreuve », pointe un .html
  annoté à corriger, ou demande de répondre à une revue. Concerne aussi : éditer un
  HTML d'après des commentaires, réancrer un commentaire orphelin, marquer un fil
  résolu. NE PAS confondre avec le hub de décisions (conversations JSON) : Galley
  porte sur du HTML libre, via les outils MCP html_review_* ou la CLI `bun run review`.
---

# Galley — revue d'artefacts HTML

Galley transforme la workstation en hôte de revue de **HTML libre** (plan, design,
rapport) provenant de n'importe quel projet. L'état de revue — les fils de
commentaires — vit **dans le fichier HTML lui-même**, dans un bloc inerte
`<script type="application/json" id="ws-review-state">…</script>`. Il est donc
portable et commitable dans *son* projet.

Protocole détaillé : `docs/html-review-protocole.md`. Conception/invariants :
`docs/html-review.md`.

## Règle d'or

**N'édite JAMAIS le bloc `ws-review-state` à la main.** Il est validé par un schéma
(`src/html-review/schema.ts`), protégé par un verrou optimiste (409) et écrit
atomiquement. Passe toujours par les outils MCP `html_review_*` ou la CLI
`bun run review …` — ils garantissent l'intégrité et évitent d'écraser des réponses
de l'utilisateur.

## La boucle de revue

1. **Lire.** `html_review_read { path }` (MCP) ou `bun run review read <path>`.
   Pour chaque fil non résolu tu reçois : le statut d'ancrage
   (`anchored` / `needs-review` / `orphaned` / `general`), le **contexte** (texte
   avant/après l'ancre), la citation et les messages. Ce contexte te permet de
   retrouver l'emplacement même après avoir édité le HTML.
2. **Éditer le HTML** avec tes outils habituels (Edit/Write) pour répondre à chaque
   demande. L'aperçu de l'utilisateur se met à jour en direct (SSE) dès que le
   fichier change.
3. **Réancrer si l'ancre a bougé.** Une édition peut déplacer le passage ancré : si
   un fil devient `orphaned` (ou `needs-review`), le `read` te renvoie déjà un
   `suggestedReanchor` (citation actuelle proposée). Sinon appelle
   `html_review_suggest_reanchor { path, threadId }` pour l'obtenir, puis refixe avec
   `html_review_reanchor { path, threadId, quote, prefix?, suffix? }` en citant un
   texte présent dans la version courante.
4. **Répondre + résoudre.** `html_review_reply { path, threadId, body }` puis
   `html_review_resolve { path, threadId, resolved: true }`. Pour enchaîner plusieurs
   gestes en une écriture : `html_review_apply { path, ops: [...] }`.

Un **commentaire général** (sans ancre, statut `general`) est une consigne au niveau
du document — traite-le comme une instruction d'ensemble.

## Sécurité & contraintes (pourquoi)

- Le chemin doit être **absolu**, en `.html`/`.htm`, et vivre sous une racine
  autorisée (`HTML_REVIEW_ROOTS`, défaut `PROJECTS_ROOT:ROOT`). Sinon l'outil
  refuse — c'est la garde anti-traversée / anti-symlink qui protège le disque.
- Le matching d'ancre est **insensible à la casse** (un texte affiché en majuscules
  via CSS `text-transform` reste retrouvable) — tu peux citer le texte tel qu'il
  s'affiche.
- Après ton passage, invite l'utilisateur à ouvrir l'onglet **« HTML »** de la
  workstation : il verra tes réponses et tes éditions **en direct**.

## Disponible depuis N'IMPORTE QUEL projet

Galley est **global** : le serveur MCP `html-review` est déclaré au **scope user**
(`WORKSTATION_ROOT` pointe la workstation), donc les outils `html_review_*` sont
accessibles partout. Tu peux donc, depuis le projet `brillance-decor` par exemple,
réviser un `rapport.html` qui vit **dans ce projet** : l'état de revue est écrit
DANS le fichier (commitable dans brillance-decor), et l'utilisateur l'annote via
l'UI Galley de la workstation. Rien ne « déménage » — Galley adresse le fichier par
chemin absolu et l'édite sur place.

Workflow type (autre projet) : `html_review_register { path: "/…/brillance-decor/rapport.html" }`
→ l'utilisateur commente dans l'UI → `html_review_read` → tu édites le HTML → reply/resolve.

## CLI (alternative sans MCP)

La CLI vit dans le repo workstation ; depuis un autre projet, préfixe par un `cd` :

```bash
cd /Users/elmabi/Desktop/my-projets/workstation && bun run review read <path|docId>
# comment / reply / resolve / reanchor / register : mêmes sous-commandes
bun run review register <path.html>     # enregistre un HTML (chemin absolu) dans Galley
bun run review comment  <path> <quote> <body> [--prefix=…] [--suffix=…] [--author=user|claude]
bun run review reply    <path> <threadId> "Fait — réduit à 3 lignes."
bun run review resolve  <path> <threadId> true
bun run review reanchor <path> <threadId> "nouvelle citation"
```

> Le MCP `html-review` (scope user) est déjà enregistré. Pour le (ré)installer :
> `claude mcp add --scope user html-review --env WORKSTATION_ROOT=/Users/elmabi/Desktop/my-projets/workstation -- bun run /Users/elmabi/Desktop/my-projets/workstation/server/mcp/index.ts`
