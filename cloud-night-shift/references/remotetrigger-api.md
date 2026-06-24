# RemoteTrigger — mécanique de l'API des routines claude.ai

L'outil `RemoteTrigger` (chargé via ToolSearch si différé) appelle l'API des
routines claude.ai avec l'OAuth de l'utilisateur. Actions : `list`, `get`,
`create`, `update` (body partiel), `run` (déclenchement immédiat).

**Avertissement honnête** : API non documentée publiquement, rétro-ingéniérée
depuis des triggers existants. Si `create` rejette le body, replie-toi sur la
création manuelle dans l'UI claude.ai en fournissant la charte prête à coller
— ne force pas.

## Découvrir l'environment

`list` puis chercher un trigger dont `sources[].git_repository.url` = le repo
cible ; réutiliser son `job_config.ccr.environment_id`. Aucun → l'utilisateur
crée une routine/environment une fois via l'UI, puis re-lister.

## Créer un one-shot

```json
{
  "name": "[Nom lisible] (one-shot)",
  "enabled": true,
  "run_once_at": "2026-06-11T02:00:00Z",
  "job_config": {
    "ccr": {
      "environment_id": "env_…",
      "events": [{ "data": {
        "message": { "role": "user", "content": "<LA CHARTE>" },
        "parent_tool_use_id": null, "session_id": "", "type": "user",
        "uuid": "<uuid v4 quelconque>"
      }}],
      "session_context": {
        "allowed_tools": ["Bash","Read","Write","Edit","MultiEdit","Glob","Grep","Task","TodoWrite"],
        "autofix_on_pr_create": true,
        "model": "<id du modèle le plus capable du moment>",
        "outcomes": [{ "git_repository": { "git_info": {
          "branches": ["<branche de travail attendue>"],
          "repo": "OWNER/REPO" } } }],
        "sources": [{ "git_repository": {
          "allow_unrestricted_git_push": true,
          "url": "https://github.com/OWNER/REPO" } }]
      }
    }
  }
}
```

Règles apprises en production :

- **`run_once_at` pour un one-shot, JAMAIS un cron détourné** (`0 2 11 6 *`
  re-tirera l'année suivante). `run_once_at` s'auto-désactive après tir
  (`ended_reason: "run_once_fired"`).
- **Tout est UTC** : `run_once_at` ET `cron_expression`. Convertis depuis le
  fuseau de l'utilisateur et RELAIE l'heure interprétée : la réponse du
  create contient le run time parsé par le serveur + l'URL claude.ai —
  montre les deux pour confirmation.
- **Chaînage** : espace les `run_once_at` pour couvrir le pire cas du run
  amont (2-4h). Le filet de sécurité reste la précondition d'abort de la
  charte, pas l'horaire.
- **Déclenchement immédiat** : create sans schedule (`enabled: false`, ni
  cron ni run_once_at) puis `run` — utile pour « lance-le maintenant ».
- `update` est partiel : ne renvoyer que les champs à changer.

## Après la nuit — housekeeping

`list` et vérifier pour chaque one-shot : `ended_reason: "run_once_fired"`,
`enabled: false`, `last_fired_at` cohérent. Un `next_run_at` résiduel sur un
trigger désactivé est inoffensif. Garder les triggers comme journal des
chartes ou les supprimer — au choix de l'utilisateur, mais ne jamais laisser
un trigger ACTIF non désiré.
