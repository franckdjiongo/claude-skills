# Bascule vers le plugin `design-studio`

> **État actuel : BASCULÉ (2026-07-06).** Le plugin `design-studio` est installé
> depuis la marketplace `claude-skills` ; les copies user-scope
> (`~/.claude/skills/{ship-polished-ui,design-elevation,brand-forge}` +
> `~/.claude/agents/visual-qa-inspector.md`) sont archivées dans
> `~/.claude/_archived-into-design-studio-20260706/` (étape 3 ci-dessous).
> Sources canoniques désormais : les 3 skills aux dossiers **racine du repo**
> (mirrorés vers le plugin par `sync-design-studio.mjs`) et l'agent **directement
> dans `design-studio/agents/visual-qa-inspector.md`** (voir Anti-dérive).

Ce document décrit comment **basculer** (activer le plugin, archiver les copies
`~/.claude`) et comment **revenir en arrière**.

Pré-requis : avoir poussé le repo sur GitHub (les marketplaces installent depuis
GitHub, pas depuis le disque local). Depuis la racine du repo :

```bash
node scripts/sync-design-studio.mjs --check   # doit dire "in sync"
git add -A && git commit -m "…" && git push
```

---

## Bascule — 3 étapes

### Étape 1 — Installer le plugin depuis la marketplace `claude-skills`

Dans Claude Code (session interactive) :

```
/plugin marketplace add franckdjiongo/claude-skills   # si pas déjà ajoutée
/plugin install design-studio@claude-skills
/reload-plugins
```

(Codex : `codex plugin marketplace add franckdjiongo/claude-skills` puis
**Add to Codex** / navigateur `/plugins`. Les 3 skills chargent côté Codex ;
l'agent `visual-qa-inspector` est Claude-Code-only — normal, cf. le WARN attendu
de `validate_plugin.py`.)

### Étape 2 — Vérifier le déclenchement

**Avant d'archiver quoi que ce soit** — pour ne pas se retrouver sans skill si
le plugin ne charge pas. Dans une session neuve :

- `/help` ou le panneau plugins doit lister `design-studio` avec ses 3 skills.
- Lancer un prompt qui déclenche chaque skill et confirmer qu'il vient bien du
  plugin :
  - « crée un site vitrine premium » → `ship-polished-ui`
  - « fais-moi un plan HTML soigné » → `design-elevation`
  - « trouve-moi un nom de marque » → `brand-forge`
- Confirmer que l'agent répond : `subagent_type: visual-qa-inspector`.
- Si un skill ne charge pas : `rm -rf ~/.claude/plugins/cache`, redémarrer,
  réinstaller. **Ne pas passer à l'étape 3 tant que ça ne déclenche pas.**

> À ce stade, les skills existent en DOUBLE (plugin + `~/.claude`). Les deux ont
> le même contenu (garanti par `sync-design-studio.mjs`), donc aucun risque de
> divergence — mais un double-déclenchement possible. L'étape 3 le supprime.

### Étape 3 — Archiver les copies `~/.claude` (supprime le double-déclenchement)

Une fois le plugin confirmé, déplacer (pas supprimer) les copies user-scope vers
une archive horodatée :

```bash
ARCHIVE=~/.claude/_archived-into-design-studio-$(date +%Y%m%d)
mkdir -p "$ARCHIVE/skills" "$ARCHIVE/agents"
for s in ship-polished-ui design-elevation brand-forge; do
  mv ~/.claude/skills/$s "$ARCHIVE/skills/$s"
done
mv ~/.claude/agents/visual-qa-inspector.md "$ARCHIVE/agents/visual-qa-inspector.md"
```

Redémarrer Claude Code. Désormais seul le plugin fournit ces skills + l'agent —
plus de double-déclenchement.

> Les dossiers `ship-polished-ui/`, `design-elevation/`, `brand-forge/` **au
> RACINE du repo** restent en place : ce sont les SOURCES que
> `sync-design-studio.mjs` mirroir vers le plugin. Ne pas les archiver.

---

## Retour arrière (rollback)

Si le plugin pose problème, revenir aux copies user-scope :

```bash
# 1) Restaurer les copies ~/.claude depuis l'archive (remplace <STAMP>)
ARCHIVE=~/.claude/_archived-into-design-studio-<STAMP>
for s in ship-polished-ui design-elevation brand-forge; do
  mv "$ARCHIVE/skills/$s" ~/.claude/skills/$s
done
mv "$ARCHIVE/agents/visual-qa-inspector.md" ~/.claude/agents/visual-qa-inspector.md
```

```
# 2) Désinstaller le plugin
/plugin uninstall design-studio@claude-skills
/reload-plugins
```

Redémarrer. On repart de l'état « NON basculé » ci-dessus.

> Si l'archive a déjà été supprimée : les sources vivent toujours au racine du
> repo. Recopier depuis là —
> `cp -R <repo>/ship-polished-ui ~/.claude/skills/ship-polished-ui` (idem pour
> les 3 skills), et
> `cp <repo>/design-studio/agents/visual-qa-inspector.md ~/.claude/agents/`.
> **Attention** : l'agent embarqué dans le plugin utilise `${CLAUDE_PLUGIN_ROOT}`
> pour ses lectures Step-1 ; en standalone il retombe sur `~/.claude/skills/…`
> (fallback déjà écrit dans le fichier), donc la copie fonctionne dans les deux
> contextes.

---

## Anti-dérive (pendant que le plugin est actif)

Toute modification des skills doit se faire sur les **sources au racine du repo**
(ou sur les copies `~/.claude` si non encore basculé), puis :

```bash
node scripts/sync-design-studio.mjs        # re-mirroir vers le plugin
node scripts/sync-design-studio.mjs --check # doit repasser "in sync" (CI-friendly)
```

**L'agent suit l'état de bascule — le script le détecte tout seul :**

- **Pré-bascule** (copie présente à `~/.claude/agents/visual-qa-inspector.md`) :
  cette copie user-scope est la source ; le script la mirroir vers le plugin en
  appliquant l'adaptation `${CLAUDE_PLUGIN_ROOT}`.
- **Post-bascule** (copie archivée dans `~/.claude/_archived-into-design-studio-*`) :
  **`design-studio/agents/visual-qa-inspector.md` est la source canonique** —
  l'éditer directement ; le script vérifie seulement sa présence et ne mirroir
  rien. L'ancienne consigne « éditer l'agent user-scope » ne s'applique plus.
- **Ni copie ni archive** : état ambigu (suppression accidentelle ?) → FATAL,
  restaurer l'un des deux avant de synchroniser.

Le script échoue bruyamment si une source manque ou si (pré-bascule) le bloc
Step-1 de l'agent change de forme (l'ancre d'adaptation ne matche plus) — signal
qu'il faut mettre à jour l'ancre dans `scripts/sync-design-studio.mjs`.
