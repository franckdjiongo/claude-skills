Texte Codex de chaque emplacement runtime de ../SKILL.md. Construit par
scripts/build-runtime-variant.mjs (racine de claude-skills) ; format décrit dans son en-tête.

<!-- slot:preflight-invoke -->
10. **Préflight obligatoire.** Invoque le skill `brief-preflight` en lui donnant, dans ta demande,
    `<chemin-absolu-du-plan.html>` et `<repo-cible>` (Codex ne passe pas d'arguments : `brief-preflight`
    te fait lancer le lint toi-même, en premier) : lint déterministe
<!-- /slot:preflight-invoke -->

<!-- slot:wait-subagents -->
   Pour attendre un sous-agent (`spawn_agent`), boucle `wait_agent` avec un `timeout_ms` fini jusqu'à sa
   réponse finale, sans polling à côté ; ne termine JAMAIS un tour avec un agent actif
   (`references/watchdog-codex.md` § Attendre). Ne laisse pas le subagent committer :
<!-- /slot:wait-subagents -->

<!-- slot:watchdog -->
Tick de 30 min par heartbeat `automation_update`, armé tant qu'un chantier n'a pas livré sa PR. Agent vivant :
`list_agents` ; relance : `followup_task`. Procédure complète (fichier de surveillance, journal, fin de run) :
`references/watchdog-codex.md`.
<!-- /slot:watchdog -->
