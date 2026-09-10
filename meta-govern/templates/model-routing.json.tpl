{
  "schemaVersion": 1,
  "lastReviewed": "{{TODAY}}",
  "enforcement": "warn",
  "note": "Source unique de « quelle release chaque alias résout aujourd'hui » pour CE projet. Ne jamais figer une release (« Opus 5 », « Sonnet 4.6 », claude-opus-5) dans .claude/rules, .claude/skills ou .claude/agents : utiliser l'alias (opus/sonnet/haiku) en frontmatter, ou pointer ce fichier en prose. Le bloc « Default model + effort » de CLAUDE.md est la SEULE surface projet autorisée à nommer une release — il est en lockstep avec le canon meta-govern (references/model-effort-defaults.html#claude-md-skeleton-block) et se rafraîchit avec lui, dans le MÊME change-set que ce fichier. enforcement: 'warn' rapporte sans bloquer (mode shadow, défaut au bootstrap) ; 'error' fait échouer validate. Promouvoir quand le projet est à 0 violation.",
  "allowPaths": [],
  "current": {
    "opus": { "label": "{{MODEL_OPUS_LABEL}}", "apiId": "{{MODEL_OPUS_API_ID}}", "role": "raisonnement de pointe — refactor multi-fichiers difficile, architecture, revue à fort jugement" },
    "sonnet": { "label": "{{MODEL_SONNET_LABEL}}", "apiId": "{{MODEL_SONNET_API_ID}}", "role": "cheval de trait — la plupart du code, la plupart du travail agentique borné" }
  },
  "roles": {
    "mechanical":     { "alias": "sonnet", "effort": "low",    "scope": "shell de CLI, lint-fix, renommage — aucun jugement" },
    "implementation": { "alias": "sonnet", "effort": "medium", "scope": "TDD borné sur une tâche unique" },
    "judgment":       { "alias": "sonnet", "effort": "high",   "scope": "revue, recherche, UI de production, simulation de persona" },
    "planning":       { "alias": "opus",   "effort": "xhigh",  "scope": "planification/architecture — la session principale, pas un fichier d'agent" }
  },
  "agents": {{MODEL_ROUTING_AGENTS}}
}
