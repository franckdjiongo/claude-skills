# Audit adversarial — skill `create-plugin` (aptitude Phase G « design-studio »)

**Date** : 2026-07-04
**Auditeur** : sous-agent (audit seulement — aucun correctif appliqué)
**Objet** : le skill `create-plugin` est-il apte à empaqueter la Phase G — un plugin
UNIQUE `design-studio` réunissant **3 skills** (brand-forge, ship-polished-ui,
design-elevation) + **1 agent** (visual-qa-inspector), structure calquée sur le
plugin `design-forge/` qui FONCTIONNE.

## Emplacement (résolu)
Le skill n'est PAS à `~/.claude/skills/create-plugin/` ni à
`<repo>/create-plugin/`. Il vit à :
- `/Users/elmabi/Desktop/my-projets/claude-skills/.claude/skills/create-plugin/`
  (source, project-local — exempt de registry/app par sa propre `repo-conventions.md`)
- miroir installé : `~/.claude/plugins/marketplaces/claude-skills/.claude/skills/create-plugin/`
Parties lues intégralement : `SKILL.md` (101 l), `scripts/scaffold_plugin.py`,
`scripts/validate_plugin.py`, `references/{claude-code,codex,repo-conventions}.md`.

## Méthode
Vérification contre le sol de vérité `design-forge/` (plugin qui charge) et
**exécution réelle** du scaffolder+validateur dans un bac à sable pour le scénario
exact Phase G (`--components skill,agents --category Design`).

---

## VERDICT : **APTE-AVEC-CORRECTIFS**

Le cœur technique est **exact et vérifié en exécution** : le layout généré est
byte-pour-byte cohérent avec `design-forge` (le plugin qui marche), les deux
manifestes et les deux catalogues sont corrects, les gates sont **vérifiables**
(scripts qui `exit 1` sur FAIL), pas de simples exhortations. Le seul écart réel
est que le scaffolder est **mono-skill / agent-singulier** alors que la Phase G est
**multi-skills + agent nommé** — un correctif de *scope de génération*, pas un
défaut de justesse. D'où : apte, mais 4 correctifs avant de lancer la Phase G.

### Ce qui est CONFIRMÉ correct (aucune action)
- Layout `skills/<name>/SKILL.md` + `agents/*.md` + `.claude-plugin/plugin.json` +
  `.codex-plugin/plugin.json` == design-forge. Test scaffold→validate = 6 PASS / 0 FAIL.
- Codex : **pas de clé `agents`** dans le manifest — conforme au design-forge réel
  (`.codex-plugin/plugin.json` sans `agents`). Codex inclus, correctement borné.
- Catalogue Codex `.agents/plugins/marketplace.json` : format
  `source:{source:"local",path}` + `policy.installation:"AVAILABLE"` == catalogue
  réel du repo. Le validateur exige l'inscription dans les DEUX catalogues.
- Cross-refs agent→skill via `${CLAUDE_PLUGIN_ROOT}/skills/<name>/references/…` —
  design-forge fait exactement ça (agents/*.md l.19). Piège des chemins relatifs
  agents↔skills correctement documenté ET contrôlé par le validateur (l.108-113).
- `openai.yaml` (présent dans design-forge/agents/) explicitement signalé comme
  NON-composant Codex non documenté — bon réflexe adversarial.

---

## FINDINGS (sévérité-taggés, fichier:ligne)

### [MAJEUR — bloquant pour Phase G] Scaffolder mono-skill
`scripts/scaffold_plugin.py:279-283` — ne crée qu'UN seul dossier
`skills/<name>/` nommé d'après le plugin. Pour Phase G il faut
`skills/brand-forge/`, `skills/ship-polished-ui/`, `skills/design-elevation/`.
Preuve : le scaffold sandbox n'a produit que `skills/design-studio/`. Le
VALIDATEUR gère déjà le multi-skill (`glob skills/*/SKILL.md`, l.82), donc
l'incohérence est unilatérale : on peut créer les 3 skills à la main puis valider,
mais le scaffolder ne les génère pas.

### [MAJEUR — bloquant pour Phase G] Nom d'agent hardcodé `{name}-agent`
`scripts/scaffold_plugin.py:284-286` et `agent_stub` l.114-115 — force
`design-studio-agent.md` / frontmatter `name: design-studio-agent`. Phase G veut
`visual-qa-inspector`. Contournement : `git mv` + éditer le frontmatter, mais
c'est manuel et non guidé par le skill.

### [MINEUR] Le SKILL.md ne couvre pas explicitement « plusieurs skills »
`SKILL.md:31-46` (matrice) et §Workflow parlent d'« un `skills/<name>/SKILL.md` »
au singulier. Aucune consigne « pour N skills, répéter le dossier + `git mv`
chaque skill existant sous `skills/<son-nom>/` ». Or Phase G empaquette 3 skills
existants. Manque un cas d'usage « container multi-skills ».

### [MINEUR] `git mv` mentionné mais pas outillé pour l'import de skills existants
`SKILL.md:76` dit « git mv it into place » en une ligne. Pour Phase G (déplacer 3
skills DÉJÀ dans le repo vers `design-studio/skills/…` ET les retirer de
skills-registry/app en tant qu'entrées autonomes, ou les re-pointer) il n'y a ni
checklist ni script. Risque : doublons registry (skill listé et comme sous-skill).

### [MINEUR] Parité manifeste : keywords/interface non enrichis au scaffold
`scaffold_plugin.py:56-67,88-93` — manifestes générés avec `keywords` dérivés du
nom et `shortDescription = desc[:80]`. design-forge a des keywords soignés et une
`interface` rédigée. Non bloquant (édition post-scaffold), mais le skill ne le
rappelle pas.

### [INFO] Aucune régression de justesse détectée
Les deux scripts parsent (`ast.parse` OK), le validateur `exit 1` sur FAIL (gate
réelle), warning « Codex can't bundle agents » attendu et documenté.

---

## CORRECTIFS PRÉCIS (décision de Franck — NON appliqués)

1. **Scaffolder multi-skills** — ajouter `--skills a,b,c` (liste) à
   `scaffold_plugin.py` ; boucler la création de `skills/<chaque>/SKILL.md` +
   `references/` + `assets/` (généraliser l.279-283). Garder `--components skill`
   comme raccourci mono-skill = nom du plugin.
2. **Nom d'agent paramétrable** — ajouter `--agents nom1,nom2` ; générer
   `agents/<nom>.md` avec frontmatter `name: <nom>` (remplacer le hardcode
   `{name}-agent` l.114,285). Défaut conservé si absent.
3. **SKILL.md : section « plugin container multi-skills + agent »** — ajouter un
   court bloc au §Workflow décrivant le cas Phase G : N skills sous `skills/`,
   agent(s) nommés sous `agents/`, cross-ref `${CLAUDE_PLUGIN_ROOT}`. Référencer
   design-forge comme exemplaire vivant.
4. **Checklist d'import de skills existants** — dans `repo-conventions.md`,
   ajouter la procédure : `git mv <skill> design-studio/skills/<skill>` ; décider
   registry/app (skill autonome retiré vs ré-pointé `path:
   design-studio/skills/<skill>/SKILL.md`) ; re-valider anti-doublon. (Optionnel :
   étendre `validate_plugin.py` pour flaguer un skill listé à la fois autonome et
   comme sous-skill.)

**Après ces 4 correctifs → APTE sans réserve pour la Phase G.** Sans eux, le skill
reste utilisable manuellement (créer les 3 skills à la main, `git mv`, éditer
l'agent, puis `validate_plugin.py`) : le validateur, lui, est déjà prêt.
