{
  "_comment": "MANIFEST DE PARITÉ RUNTIME — {{PROJECT_NAME}}. Rendu en `.claude/runtime-parity.json`. Déclare les paires de fichiers miroir entre les deux runtimes `.claude/` (Claude Code) et `.agents/` (Codex) qui doivent rester alignés. Le script `.claude/scripts/check-runtime-parity.mjs` lit ce fichier et, pour chaque paire `sync:\"exact\"`, compare les deux fichiers après normalisation CRLF→LF : toute divergence sort en exit 1 avec la liste des chemins concernés. Une paire `sync:\"documented-divergence\"` (champ `reason` requis) est ignorée par la comparaison, sa raison étant journalisée. L'inventaire réel se peuple au palier 5 (migrate-project) à partir d'un `diff -rq .claude .agents` ; à ce stade `pairs` reste vide, prêt à peupler.",
  "version": 1,
  "_examples": {
    "_comment": "Exemples de forme — NON lus par le script (seul `pairs` l'est). Copier une entrée dans `pairs` puis renseigner les chemins réels.",
    "exact": {
      "claudePath": ".claude/hooks/lib/hook-utils.mjs",
      "agentsPath": ".agents/hooks/lib/hook-utils.mjs",
      "sync": "exact"
    },
    "documentedDivergence": {
      "claudePath": ".claude/scripts/mark-validate-pass.mjs",
      "agentsPath": ".agents/scripts/mark-validate-pass.mjs",
      "sync": "documented-divergence",
      "reason": "Le sentinel Codex écrit dans un dossier d'état distinct ; divergence assumée et tracée ici."
    }
  },
  "pairs": [],
  "_roots_comment": "Optionnel. Quand `roots` est non vide, le script parcourt chaque paire de dossiers et signale (erreur explicite) tout fichier présent sur disque qui n'est couvert par aucune paire de `pairs` — la garde anti-dérive « fichier miroir non déclaré ». Vide par défaut : le mode strict s'active au palier 5.",
  "roots": []
}
