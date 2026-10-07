# Watchdog d'une flotte de chantiers

Complète `SKILL.md` § Phase 3bis. Le silence ne prouve pas la progression : une session d'arrière-plan peut
mourir sans rien émettre. Le mécanisme du tick (minuterie, liste des agents, message de relance) est
propre au runtime et se lit dans `SKILL.md`.

1. **Tick périodique (30-45 min)**, armé tant qu'un chantier n'a pas livré sa PR. À chaque tick, pour CHAQUE
   chantier : vérité disque du worktree (`git -C <worktree> log --oneline -1` + mtime des fichiers récents)
   comparée au dernier point connu, et présence de l'agent parmi les agents vivants. La consigne COMPLÈTE de
   surveillance s'écrit là où elle survit à la compaction du contexte, jamais dans le seul présent skill.
2. **Disque immobile + agent absent = mort.** Relance avec l'état exact vérifié sur disque (commits,
   travail non commité, verdicts de revue reçus), jamais « reprends » à vide.
3. **Vérification post-relance (≤ 10 min)** : une réponse « resumed » ne prouve rien, le disque doit bouger ;
   sinon re-relance ou escalade à l'utilisateur.
4. **Journal** : une ligne par chantier et par tick (dernier commit, âge du dernier mtime).
