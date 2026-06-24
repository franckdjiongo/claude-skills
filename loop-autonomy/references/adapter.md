# `.claude/loop-autonomy.json` — spécification de l'adapter projet

L'adapter est le SEUL endroit où la boucle apprend les spécificités d'un
projet. Tout le reste du skill est générique. S'il manque, propose-le à
l'utilisateur après détection ; ne le devine jamais en silence.

## Schéma

```json
{
  "validate": "npm run validate",
  "quickCheck": "npx vitest run --changed",
  "queue": { "type": "json", "path": ".claude/loop-queue.json" },
  "itemRunner": "general-purpose",
  "branchPrefix": "loop/",
  "decisionChannel": "ask-user",
  "caps": { "maxItemsPerRun": 8, "maxMinutes": 240 },
  "commitConvention": "chore(loop): resolve {id} — {title}"
}
```

| Champ | Requis | Sens |
|---|---|---|
| `validate` | **OUI** | LA définition machine de « fini » : commande qui sort 0/1. Sans elle, la boucle refuse de s'armer (règle de refus du SKILL.md). |
| `quickCheck` | non | Vérification rapide pour la boucle interne du subagent (sous-ensemble de tests). Défaut : `validate`. |
| `queue.type` | non | `json` (défaut, géré par `scripts/loop-queue.mjs`) ou `custom`. |
| `queue.path` | si json | Fichier de file. Recommandé hors du suivi git si la file est jetable, DANS git si elle fait partie du projet. |
| `queue.commands` | si custom | `{ "next": "...", "mark": "... {id} {status}", "report": "..." }` — la boucle appelle ces commandes au lieu du helper générique. |
| `itemRunner` | non | Type de subagent pour implémenter (`general-purpose` par défaut, ou un agent projet comme `tc-implementer`). |
| `reviewer` | non | Agent de review à dispatcher en FOREGROUND après l'implémentation (ex. `code-quality-reviewer`). Absent = pas de review dédiée (les hooks/pre-commit du projet restent le filet). |
| `branchPrefix` | non | Préfixe de la branche sacrifiable du run. Défaut `loop/`. |
| `decisionChannel` | non | `ask-user` (défaut) : questions posées en lot en fin de run. Ou `{ "type": "command", "create": "...", "read": "..." }` : un hub externe. |
| `caps` | non | Plafonds du run. Défauts : 8 items / 240 min. |
| `commitConvention` | non | Gabarit du message de commit ; `{id}` et `{title}` sont substitués. |

## Exemple 1 — projet générique (n'importe quel repo Node)

```json
{
  "validate": "npm test && npx eslint .",
  "queue": { "type": "json", "path": ".claude/loop-queue.json" },
  "decisionChannel": "ask-user",
  "caps": { "maxItemsPerRun": 6, "maxMinutes": 180 }
}
```

La file est créée par `node <skill>/scripts/loop-queue.mjs init <path>` puis
remplie avec l'utilisateur (un item = une unité fermée vérifiable).

## Exemple 2 — projet à infrastructure existante (Temps Chantier)

Quand le projet possède DÉJÀ une file outillée (backlog HTML + scripts), ne la
double pas d'une file JSON : branche l'adapter dessus en `custom`.

```json
{
  "validate": "npm run validate",
  "quickCheck": "npx vitest run",
  "queue": {
    "type": "custom",
    "commands": {
      "next": "node .claude/scripts/backlog-loop/build-queue.mjs --next",
      "mark": "node .claude/scripts/backlog-loop/build-queue.mjs --mark {id} {status} {note}",
      "report": "node .claude/scripts/backlog-loop/build-queue.mjs --report"
    }
  },
  "itemRunner": "tc-implementer",
  "reviewer": "code-quality-reviewer",
  "decisionChannel": {
    "type": "command",
    "create": "bun run --cwd ~/Desktop/my-projets/workstation convo create temps-chantier-code-app {file}",
    "read": "bun run --cwd ~/Desktop/my-projets/workstation convo read temps-chantier-code-app {id}"
  },
  "caps": { "maxItemsPerRun": 8, "maxMinutes": 240 },
  "commitConvention": "chore(backlog): resolve {id} — {title}"
}
```

Règle générale : si le projet a des skills/agents/scripts de qualité, l'adapter
les NOMME et la boucle les réutilise ; le skill n'apporte que le moteur
d'itération et la discipline. C'est ce qui le garde général sans être creux.

## Détection (quand l'adapter n'existe pas)

1. `package.json` → scripts `validate`, sinon composer `test`/`lint`/
   `typecheck` existants. `Cargo.toml` → `cargo test`. `pyproject.toml`/
   `pytest.ini` → `pytest -q`. `Makefile` → cible `test`/`check`.
2. File d'items : un backlog/TODO existant ? des tâches de plan non cochées ?
   Sinon proposer la création d'une file JSON vide à remplir ensemble.
3. Présenter l'adapter proposé à l'utilisateur AVANT de l'écrire — c'est lui
   qui connaît la vraie commande de vérité de son projet.
4. Rien de vérifiable trouvé → règle de refus (SKILL.md, Étape 0).
