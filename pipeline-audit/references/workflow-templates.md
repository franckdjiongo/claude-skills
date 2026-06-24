# Workflow templates (WF1 · WF2 · WF3)

Three dynamic `Workflow` scripts. Copy the one you need, **fill its `EMBED`
placeholder with the literal JSON your script produced**, write it to
`.pipeline-audit/wfN.mjs`, then run `Workflow({scriptPath: ".pipeline-audit/wfN.mjs"})`.

These templates are pre-loaded with the lessons that were learned the hard way.
**Do not remove them or the workflow will break at scale:**

1. **Batch to ~3 concurrent agents, sequentially.** A burst of 15–50 agents trips
   a server-side rate limit and the run dies mid-flight. The `inBatches(items, 3, …)`
   helper below bounds concurrency AND paces the run. Keep `BATCH = 3` unless you
   have a reason; raise cautiously.
2. **Make every run resumable.** When a batch dies (rate limit, transient API
   error), relaunch with `Workflow({scriptPath, resumeFromRunId: "<runId>"})`.
   Cached agent calls return instantly; only failed/new ones re-run. Same script +
   same data ⇒ 100% cache hit. Stop the prior run (TaskStop) before resuming.
3. **Embed work-lists as literals — NEVER pass them via `args`.** Large arrays
   arrive at the script unparsed through `args`. The script that built the work-list
   prints JSON; paste that JSON into the `EMBED` slot.
4. **≤ ~7 docs per agent.** `build_corpus_worklist.py` already chunks to 7. Don't
   hand an agent a whole theme.
5. **Filter `.filter(Boolean)`** before using results — a skipped/dead agent is `null`.

Common helper (top of every script):

```js
const BATCH = 3
async function inBatches(items, size, fn, phaseName) {
  const out = []
  for (let i = 0; i < items.length; i += size) {
    const group = items.slice(i, i + size)
    const res = await parallel(group.map((it, j) => () => fn(it, i + j)))
    out.push(...res)
    log(`${phaseName}: batch ${Math.floor(i/size)+1}/${Math.ceil(items.length/size)} — ${res.filter(Boolean).length}/${group.length} ok`)
  }
  return out
}
```

Point agents at the grid by absolute path (they read it themselves — don't inline
all 14 definitions into every prompt):
`const GRID = "/Users/<you>/.claude/skills/pipeline-audit/references/dimensions.md"`

---

## WF1 — Skills audit (against the 14-dimension grid)

```js
export const meta = {
  name: 'pipeline-audit-wf1-skills',
  description: 'Score each pipeline skill against the 14-dimension grid; name the weakest link.',
  phases: [{ title: 'Score skills' }, { title: 'Synthesize' }],
}
const BATCH = 3
async function inBatches(items, size, fn, phaseName) { /* …paste helper… */ }
const GRID = "/ABS/PATH/.claude/skills/pipeline-audit/references/dimensions.md"

// EMBED: one entry per pipeline skill from discover_project.py → skills{design,plan,execution}.
// role drives which dimension subset applies. Include the SKILL.md path + key refs/agent bodies.
const SKILLS = [
  // { name, skill_md: "/abs/SKILL.md", extra_reads: ["/abs/agents/x.md"], role: "design"|"plan"|"exec" }
]

const SKILL_SCORE = {
  type: "object",
  required: ["skill", "scores", "findings", "weakest_dimension"],
  properties: {
    skill: { type: "string" },
    role: { type: "string" },
    scores: { type: "object", description: "dimension_id -> {score:1-5, evidence:string}" },
    findings: { type: "array", items: { type: "object", required: ["title","severity","dimension","evidence","fix"],
      properties: { title:{type:"string"}, severity:{enum:["high","medium","low"]}, dimension:{type:"string"},
        gated:{type:"boolean", description:"does the SKILL hard-gate it, or only the agent body?"},
        evidence:{type:"string"}, fix:{type:"string"} } } },
    weakest_dimension: { type: "string" },
  },
}

phase('Score skills')
const scored = await inBatches(SKILLS, BATCH, (s) => agent(
  `You audit ONE skill of a brainstorm→plan→implementation pipeline.
   Read ${s.skill_md}${s.extra_reads?.length ? " plus "+s.extra_reads.join(", ") : ""}.
   Read the grid at ${GRID}. Score this skill on the dimensions its role (${s.role}) owns
   (design skills → the 7 DESIGN dims; plan/exec skills → the 7 PLAN dims + execution-strategy).
   For each: 1-5 + concrete evidence (quote the SKILL). KEY DISTINCTION: does the SKILL itself
   hard-gate the behavior, or does the guard live only in an agent body / downstream? A guard
   that isn't in the SKILL is a gap, because the SKILL is the contract. Return structured output.`,
  { schema: SKILL_SCORE, phase: 'Score skills', label: `wf1:${s.name}` }
), 'Score skills')

phase('Synthesize')
const synthesis = await agent(
  `Per-skill scores: ${JSON.stringify(scored.filter(Boolean))}.
   Name the WEAKEST LINK skill and why. List cross-skill patterns (e.g. "rely-but-never-verify"
   gaps repeated across executors). Rank the skills by health (letter grade A-D + one-line reason).
   Return {weakest_link, grades:[{skill,grade,reason}], cross_patterns:[...]}.`,
  { schema: { type:"object", required:["weakest_link","grades","cross_patterns"],
    properties:{ weakest_link:{type:"string"}, grades:{type:"array"}, cross_patterns:{type:"array"} } },
    phase: 'Synthesize' }
)
return { scored: scored.filter(Boolean), synthesis }
```

---

## WF2 — Corpus scoring (designs + plans, by theme)

```js
export const meta = {
  name: 'pipeline-audit-wf2-corpus',
  description: 'Score the full design+plan corpus by theme: 14 dims + design→plan fidelity + remediation.',
  phases: [{ title: 'Score chunks' }, { title: 'Synthesize themes' }],
}
const BATCH = 3
async function inBatches(items, size, fn, phaseName) { /* …paste helper… */ }
const GRID = "/ABS/PATH/.claude/skills/pipeline-audit/references/dimensions.md"

// EMBED: the `chunks` array from build_corpus_worklist.py (already ≤7 docs each).
// Also embed `themes` so the synthesis agent knows the pairs/orphans deterministically.
const CHUNKS = [ /* {theme, batch_index, docs:[...absolute paths...]} */ ]
const THEMES = [ /* {theme, pairs:[{design,plan}], orphan_designs:[], orphan_plans:[]} */ ]

const CHUNK_SCORE = {
  type: "object",
  required: ["theme", "docs_scored", "findings"],
  properties: {
    theme: { type: "string" },
    docs_scored: { type: "array", items: { type: "object", required: ["path","kind","scores"],
      properties: { path:{type:"string"}, kind:{enum:["design","plan"]},
        date:{type:"string"}, scores:{type:"object", description:"dimension_id -> 1-5"} } } },
    design_to_plan_fidelity: { type: "array", items: { type:"object",
      properties:{ design:{type:"string"}, plan:{type:"string"}, fidelity:{type:"number"},
        dropped_or_overridden:{type:"string"} } } },
    remediation: { enum: ["none","light","yes"] },
    remediation_is_real_defect: { type: "boolean", description: "true=caused by upstream insufficiency; false=healthy iteration" },
    findings: { type: "array", items: { type:"object", required:["title","skill","severity","evidence"],
      properties:{ title:{type:"string"}, skill:{type:"string"}, severity:{enum:["high","medium","low"]},
        dimension:{type:"string"}, evidence:{type:"string"} } } },
  },
}

phase('Score chunks')
const scored = await inBatches(CHUNKS, BATCH, (c) => agent(
  `Score these ${c.docs.length} artifacts (theme ${c.theme}) against the grid at ${GRID}:
   ${c.docs.map(d=>`- ${d}`).join("\n")}
   For each doc: classify design|plan, capture its date (from filename), score every owned dimension 1-5.
   For each design that has a paired plan in this theme, judge design→plan fidelity (1-5) and name what was
   dropped/added/renamed. Detect remediation cycles (round-2 / final-polish / same-day re-plan / revert) and
   say whether each was a REAL upstream defect vs healthy iteration. Attribute every finding to ONE faulty
   skill with a severity + evidence quote. Return structured output.`,
  { schema: CHUNK_SCORE, phase: 'Score chunks', label: `wf2:${c.theme}#${c.batch_index}` }
), 'Score chunks')

phase('Synthesize themes')
const synthesis = await agent(
  `Chunk scores: ${JSON.stringify(scored.filter(Boolean))}.
   Deterministic pairing/orphans: ${JSON.stringify(THEMES)}.
   Produce: (1) per-theme aggregate (design avg, plan avg, fidelity, remediation y/n) sorted CHRONOLOGICALLY,
   (2) the MATURITY TRAJECTORY verdict (are low scores concentrated in OLD themes? call it out — it's the key
   positive signal), (3) design-grade vs plan-grade (which artifact is weaker), (4) the deduped finding list
   attributed by skill with counts, (5) % of themes with remediation and how much was real-defect vs healthy.
   Return {themes_chrono:[...], maturity_verdict, design_grade, plan_grade, findings_by_skill:[...], remediation_stats}.`,
  { schema: { type:"object", required:["themes_chrono","maturity_verdict","design_grade","plan_grade","findings_by_skill"],
    properties:{ themes_chrono:{type:"array"}, maturity_verdict:{type:"string"}, design_grade:{type:"string"},
      plan_grade:{type:"string"}, findings_by_skill:{type:"array"}, remediation_stats:{type:"object"} } },
    phase: 'Synthesize themes' }
)
return { scored: scored.filter(Boolean), synthesis }
```

---

## WF3 — Session friction (root-cause attribution)

```js
export const meta = {
  name: 'pipeline-audit-wf3-sessions',
  description: 'Deep-read the highest-friction session dossiers; classify root cause; calibrate raw signals.',
  phases: [{ title: 'Classify dossiers' }, { title: 'Synthesize friction' }],
}
const BATCH = 3
async function inBatches(items, size, fn, phaseName) { /* …paste helper… */ }

// EMBED: dossier file paths from mine_friction.py (`dossiers_written`), highest-friction first.
const DOSSIERS = [ /* "/abs/.pipeline-audit/dossiers/01-….md", … */ ]

const DOSSIER_CLASS = {
  type: "object",
  required: ["dossier", "episodes"],
  properties: {
    dossier: { type: "string" },
    episodes: { type: "array", items: { type: "object", required: ["summary","root_cause","is_artifact_defect","skill"],
      properties: {
        summary: { type: "string" },
        root_cause: { enum: ["design_deficiency","plan_imprecision","execution_discipline","tooling_false_positive",
                              "spec_debt_upstream","healthy_process","user_change_of_mind","unknown"] },
        is_artifact_defect: { type: "boolean", description: "false = healthy gate/backlog/TDD/escalation, NOT a defect" },
        skill: { type: "string", description: "skill to fix, or 'none' if healthy" },
        severity: { enum: ["high","medium","low","na"] },
        evidence: { type: "string" } } } },
  },
}

phase('Classify dossiers')
const classified = await inBatches(DOSSIERS, BATCH, (d) => agent(
  `Deep-read this friction dossier: ${d}.
   The friction SCORES are coarse regex hits for RANKING ONLY — most "deferral"/"resumption" hits are
   HEALTHY process (backlog routing, TDD red→green, gates firing, escalation to the user on irreversible
   steps), NOT defects. Identify the real friction EPISODES. For each: one-line summary, root cause (use the
   enum), and CRUCIALLY label is_artifact_defect (false if it's healthy process / a gate working as intended /
   the user changing their mind). Attribute true defects to ONE skill. Be skeptical — default ambiguous
   episodes to healthy_process. Return structured output.`,
  { schema: DOSSIER_CLASS, phase: 'Classify dossiers', label: `wf3:${d.split("/").pop().slice(0,20)}` }
), 'Classify dossiers')

phase('Synthesize friction')
const synthesis = await agent(
  `Classified episodes: ${JSON.stringify(classified.filter(Boolean))}.
   Produce: (1) root-cause distribution (counts per enum), (2) the CALIBRATION number — what % of flagged
   episodes are real artifact defects vs healthy process, (3) the #1 skill to fix by defect count,
   (4) the top recurring artifact-defect patterns with evidence. Be explicit that this is a deep read of the
   highest-friction sample, not the whole corpus. Return {distribution, pct_real_defect, top_skill, patterns:[...]}.`,
  { schema: { type:"object", required:["distribution","pct_real_defect","top_skill","patterns"],
    properties:{ distribution:{type:"object"}, pct_real_defect:{type:"number"}, top_skill:{type:"string"}, patterns:{type:"array"} } },
    phase: 'Synthesize friction' }
)
return { classified: classified.filter(Boolean), synthesis }
```

---

## Running order & scope flag

- **full** (default): run WF1, WF2, WF3 — read each result before launching the next
  (you may need a result to size the next, and a death is cheaper to resume one WF at a time).
- **corpus-only**: WF1 + WF2 (skip session mining).
- **sessions-only**: WF3 only (skip corpus work-list + skills audit).

After all selected workflows return, triangulate per `report-template.md`.

## Codex / runtimes without a `Workflow` tool

The three Python scripts are runtime-agnostic — run them the same way. The
orchestration differs: Codex has no `Workflow` tool, so replay each WF as a manual
sub-agent loop (`spawn_agent` / `wait_agent` / `close_agent`) with the SAME
batching discipline — Codex caps near 6 live agents, so close finished agents
before spawning the next batch of 3. Same grid, same schemas (as plain JSON the
agent echoes back), same triangulation.
