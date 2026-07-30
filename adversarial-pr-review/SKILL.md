---
name: adversarial-pr-review
description: >-
  Run an ultracode multi-agent ADVERSARIAL review over the working diff so a change is
  bulletproof and "compliant" BEFORE its pull request is opened, and so automated code-review
  rounds CONVERGE instead of looping. Use this skill (Mode A) whenever you are about to create or
  open a pull request — when the user says "create a PR", "open a PR", "tu peux créer la PR",
  "raise/submit a PR", "ouvre la PR", or asks to push a branch up for review — and (Mode B)
  whenever a code-review bot (Codex, CodeRabbit, Claude review, Greptile, Graphite, etc.) posts
  comments on a PR that need addressing. A global PreToolUse hook BLOCKS `gh pr create` until this
  skill has validated the current HEAD, so reach for it proactively rather than waiting to be told.
  Especially important for any change touching shared/exported surfaces, public APIs, auth, schemas,
  or anything a downstream consumer (or another tool) depends on. It judges by the same bar a strong
  review bot uses — not only correctness bugs, but deviations from the repo's own idioms, unbounded /
  over-fetching queries and missing indexes, and external platform limits (e.g. message-size caps).
---

# Adversarial PR Review

A pull request is a promise: "this change is correct and won't surprise anyone." This skill makes
you keep that promise **before** the PR is public — by attacking your own diff the way a good
reviewer (human or bot like Codex) would, finding the bugs first, and fixing them in a way that
**converges** rather than spawning new ones.

## Why this exists (the lesson it encodes)

The expensive failure mode is **reactive patching**: a bot finds a bug, you fix that one line, the
bot finds the next bug, you fix that one line — and **your own fixes keep creating the next finding**
(a rename leaks a field elsewhere, a guard you add breaks a sibling tool, a validator you tighten
rejects a real input). That ping-pong can run a dozen rounds, burn enormous tokens, and frustrate
everyone — while the change quietly accretes regressions.

Three disciplines kill that failure:

1. **Get AHEAD of the bot.** Run the adversarial review on the *whole* diff **before** opening the
   PR. The PR then arrives already-compliant; the bot finds little or nothing.
2. **CONVERGE, don't loop.** Whenever you fix anything, sweep the **whole class** of that
   anti-pattern and re-verify the **entire** changeset adversarially **before** pushing — so the next
   round finds nothing *new that you introduced* and no *twin* of what you just fixed.
3. **Match the bot's BAR, not just "does it crash."** A strong review bot flags code that *works
   today* but breaks the repo's idioms (unbounded queries, missing indexes, over-fetch), exceeds an
   external platform limit (message size), or relies on the wall clock without a ticking state. If
   your verdict only asks "is this a triggerable bug?", you will pass **exactly** what the bot
   catches. See the two-gate verdict below — it is the single most important part of this skill.

You are smart enough to do this well; the point of the skill is to make it the **default**, not a
reaction after someone complains.

---

## Two modes

| Mode | Trigger | Goal |
| --- | --- | --- |
| **A — Preflight** | About to create/open a PR (`gh pr create`, "tu peux créer la PR", push-for-review). A global hook blocks `gh pr create` until this ran. | Ship a PR that's already bulletproof. |
| **B — Bot comments** | A review bot posted comments on an open PR. | Resolve *all* of them in one convergent pass — no per-comment ping-pong. |

Both modes run the **same engine** (below) and the **same core discipline**. The difference is only
*when* they fire and what you do at the end (open the PR vs. reply+resolve threads).

---

## Core discipline (applies to both modes)

1. **Review the whole changeset, never one line in isolation.** The unit is `git diff <base>...HEAD`
   (plus uncommitted work that will be in the PR), not the single hunk a comment points at. For a
   file that is **wholly new** in this diff, there is no "old behavior" to diff against — audit the
   **entire file** for self-contained bugs (a brand-new hook/script can be wrong on line 80 even
   though lines 1-79 are fine). For a **pre-existing** file, scope to the behavior the diff *changed*
   vs the base.
2. **Two-gate verdict — a finding is MUST-FIX if it fails EITHER gate.** This is the crux, and the
   single most common reason a bot keeps finding things you already "reviewed": a pure-correctness
   bar lets through exactly what a strong review bot (Codex et al.) flags.
   - **Gate A — Correctness:** some input makes it produce wrong output, crash, or lose data (a
     *triggerable* defect).
   - **Gate B — Convention / scalability / platform-limit:** it deviates from an idiom that ALREADY
     exists elsewhere in THIS repo (you can cite the sibling that does it right), violates a known
     external hard limit (e.g. Telegram's 4096-char message), or is an unbounded read / full-table
     scan / N+1 / over-fetch — **even if today's small data makes it "work."** At scale, or at the
     limit, IS the trigger. The bot enforces this superset; so must you.

   **Refute-on-doubt applies to PURE STYLE only** (naming, formatting, subjective taste, restated
   guards). It KILLS false positives there. **NEVER** use "it returns correct output / not
   triggerable today" to dismiss a Gate-B finding — that exact move is what let the bot catch you.
3. **Fix by CLASS, not by instance — and a "class" is not only repeated TEXT.** There are two kinds
   of twin, sweep for BOTH:
   - **Literal twins** (grep-able): the same anti-pattern *signature* repeated verbatim elsewhere
     (e.g. `withIndex('by_status'` + `.collect()`, every `sendMessage(` payload, every clock-derived
     window, every `instanceof SomeClass` that replaced a duck-type). Grep the repo and fix or
     explicitly clear ALL siblings in the same pass.
   - **Structural twins** (NOT grep-able by text — ask explicitly): (a) *the same invariant enforced
     at more than one integration point* — fixing "guard X isn't wired into `validate`" but missing
     that it's ALSO not wired into the pre-commit hook or CI is the identical mistake at a different
     site; (b) *the same function with more than one code path* — fixing how a tracker handles an
     **edit** but not how the identical code handles a **delete**, or the success path but not the
     failure path. Before declaring a sweep done, ask out loud: "where ELSE is this exact invariant
     supposed to hold?" and "what OTHER branches does this function have that I didn't touch?"
   - **Scope: a class is the resource pattern across the ENTIRE diff — never the module the finding
     sits in.** "Unguarded FK ownership" means *every mutation × that FK anywhere in the diff*;
     "uncapped client array" means *every array arg × that cap*, repo-wide. The deliverable of a
     sweep is an **enumeration table** (each candidate site: swept / has-guard / missing) — a sweep
     without the table is an assertion, not a sweep. **The table is emitted by YOU (the orchestrator,
     in the main thread) at fix time, BEFORE declaring the sweep done** — an enumeration that exists
     only inside a subagent's report is raw material, not the deliverable; and every grep hit the
     sweep surfaced must appear in the table with a disposition (swept / has-guard / not-in-class,
     with one line of why). In the field (2026-07-28, two independent runs): a duration-guard sweep
     that traced delegations but emitted no table missed `recordTimerHistory` in the SAME file —
     same class, re-found one round later; and a repo-wide grep left 4 hits undispositioned, which a
     round-2 agent had to back-fill. Correct outcome, wrong owner, one round late — both times.
     A sweep scoped to the finding's module is
     itself a review defect: in the field, one module-scoped FK-ownership sweep let the same class
     recur in two later rounds, costing ~2 extra rounds (~7M tokens) to re-find what the first
     sweep should have enumerated.
   The classic loop is fixing one unbounded query while its twin three functions away waits to be
   flagged next round — same failure mode whether the twin is textual or structural.
4. **Re-verify the FULL diff after fixing, before pushing** — the *same dimension fan-out* over the
   whole changed file set, NOT just the symptom you fixed. Loop until the size-scaled convergence
   criterion is met (see "Scaling & cost"). This is the opposite of "fix → push → wait for the bot →
   fix → push".
5. **Never ship an unverified behavioral claim.** If a fix — or its comment — asserts timing /
   scheduling / limit behavior the code doesn't *structurally* guarantee ("updates at midnight",
   "always fits", "can't overflow"), reproduce that behavior or drop the claim. A bot WILL falsify it.
6. **Report honestly.** If a pass found something you introduced, say so. If you can't verify a
   claim, say so. Never declare "compliant" you can't back.

---

## Mode A — Preflight (before opening a PR)

Run this the moment a PR is imminent. Steps:

1. **Scope the diff.** Determine the base branch and the full change:
   `git fetch` if needed, then `git diff --stat <base>...HEAD` and read the actual diff. Include
   uncommitted changes that will be part of the PR.
2. **Run the local quality gate first** (cheap signal): the project's tests + lint/typecheck/format
   (e.g. `bun run validate`, `npm test`, `make check`). Fix anything red before the expensive pass —
   no point fanning out agents over a diff that doesn't compile.
3. **Run the adversarial review engine** (next section) scaled to the diff size.
4. **Fix every confirmed finding — BOTH gates** (correctness AND convention/scalability/platform-limit,
   discipline #2), each with a **class-sweep** (discipline #3) whose enumeration table you emit in the
   main thread before moving on. Don't park a "works today" unbounded query as P3; the bot won't.
5. **Re-run the engine** on the new diff. Repeat until the size-scaled convergence criterion is met
   (see "Scaling & cost").
6. **Re-run the quality gate** to confirm fixes didn't break the build.
7. **Commit** the reviewed state (if not already committed).
8. **Record the sentinel** so the hook lets the PR through (see "Sentinel").
9. **Now create the PR.**

> The PR body should briefly note what the adversarial review covered and that the gate is green —
> it signals to human + bot reviewers that the change was self-audited.

---

## Mode B — Addressing bot review comments (converge, don't loop)

When a bot (Codex et al.) posts comments, do **not** fix them one-by-one-and-push. Instead:

1. **Collect ALL open comments at once** (`gh pr view <n> --json comments,reviews` and/or
   `gh api .../pulls/<n>/comments`). Read every one before touching code.
2. **Triage with the two-gate verdict (#2).** For each comment, decide: correctness, convention/
   scalability/platform-limit, or pure style. Verify the facts against the code; don't blindly trust
   the bot (it has false positives) — but do NOT downgrade a convention/scalability/limit comment to
   "works today, won't fix." If the bot cites an idiom or limit, it's must-fix.
3. **Fix the confirmed batch together with a CLASS-SWEEP (#3).** When a comment flags an unbounded
   query / oversized payload / clock-derived window, grep for EVERY sibling with that signature and
   fix them all now — not just the one line the bot pointed at. The bot found one instance; you fix
   the class, so the *next* round can't re-flag its twin.
4. **Re-run the engine on the WHOLE new diff with the FULL dimension fan-out** — *before* pushing,
   NOT scoped to the symptoms the comments named. The unbounded read sitting next to your fix must be
   assessed too. This is the step that breaks the loop. Also re-run the quality gate.
5. **Push once.** Then reply on each addressed thread (one line: what changed, or why you didn't),
   and resolve it. Skip replies for comments you didn't act on, unless asked otherwise.
6. **If the bot reacts 👍 / posts no new comments → done.** If it posts genuinely new findings
   (not re-raises of what you already addressed), repeat — but each iteration must include step 4,
   so rounds shrink fast instead of oscillating.

**Convergence check:** if you're on round 3+ and the bot keeps finding things, stop and ask
*"are these new, or the same anti-pattern class / a consequence of my own fix?"* If the latter, your
step-3 class-sweep or step-4 full-diff fan-out was too shallow — widen both before pushing again.

---

## The adversarial review engine

The engine is a **find → adversarially-verify → (you) fix** fan-out. With ultracode/workflows
enabled (`CLAUDE_CODE_WORKFLOWS=1`), use the **Workflow tool**; otherwise fall back to parallel
`Agent` subagents (same shape, fewer agents). **Key this decision on the environment
(`CLAUDE_CODE_WORKFLOWS` / whether the Workflow tool is actually available), never on "the user
didn't ask for ultracode"** — the engine choice is yours to make from capability, not from the
phrasing of the request (a field run mis-keyed on the latter and under-scaled its fan-out).

**Shape:** dimension reviewers each attack the diff from one angle and emit findings → each finding
gets an independent verifier that tries to *refute* it → you fix only what survives.

**Before picking dimensions: inventory the diff's artifact categories — don't dimension by the PR's
headline, dimension by what's actually in `git diff --stat`.** A PR's title/intent describes the
*foreground* change; large or heterogeneous diffs almost always also carry a *background* change
(new lint/CI/hook scripts that ship alongside a refactor, a docs rewrite that rides along with a
schema change) that a reviewer primed by the title will simply forget to look at — because nothing
forces a check of "what KINDS of files are actually in this diff." Concretely: run
`git diff --stat <base>...HEAD`, group the changed paths by what they ARE, and require at least one
dimension per category that's actually present, e.g.:
  - **Application/runtime code** — the thing users execute. → `correctness`, plus any domain
    dimension below that applies (`scalability`, `platform-limits`, ...).
  - **New or modified ENFORCEMENT/TOOLING code** — hooks, lint/guard scripts, CI config, validators,
    anything whose JOB is to catch a defect in something else. This code is self-referential: if
    it's silently wrong, it stops protecting and NOTHING downstream tells you. → `tooling-effectiveness`.
  - **Docs / agent-instructions / config-as-prose** — anything that makes a factual claim about a
    command, a script, a behavior, or a file that exists. → `wiring-and-contract`.
  - **Schema/contract surfaces** — exported types, public APIs, anything a caller depends on. →
    `contracts` / `blast-radius`.
A diff that introduces a NEW enforcement/tooling category you've never reviewed before in this repo
is the highest-risk case precisely because there's no prior round to have caught it — treat it as
**Large/risky** tier (full dimensions, 3-vote verify) regardless of line count.

Adapt this template to the change (drop dimensions that don't apply, add domain-specific ones —
but never drop a category the inventory above found present):

```js
export const meta = {
  name: 'pr-adversarial-review',
  description: 'Adversarially review the working diff before PR / before pushing fixes',
  phases: [{ title: 'Hunt' }, { title: 'Verify' }],
}

const REPO = '<absolute repo path>'
const CONTEXT = `Adversarially review the UNCOMMITTED+committed diff that will become a PR at ${REPO}.
Run \`git -C ${REPO} diff <base>...HEAD\`, read the full changed files + their callers/siblings, AND
read the MOST-BOUNDED sibling of any query/handler/message you touch (so you know THIS repo's idiom).
For any file that is WHOLLY NEW in this diff, read and audit the entire file (there is no old
behavior to diff against); for a pre-existing file, scope to what the diff changed vs main.
A finding is reportable if it fails ANY gate:
  • CORRECTNESS: some input makes it wrong / crash / lose data (triggerable), OR
  • CONVENTION/SCALABILITY/PLATFORM-LIMIT: it deviates from an idiom that ALREADY exists in this repo
    (cite the sibling file:line that does it right), violates an external hard limit (e.g. Telegram
    4096-char sendMessage), or is an unbounded read / full-table scan / N+1 / over-fetch — EVEN IF
    today's data makes it work. Scale, or the limit, IS the trigger.
  • WIRING: new enforcement/tooling code (a hook, lint check, CI step, validator) that does not
    actually fire against this repo's real paths/shapes/event-payloads, or is not registered/called
    from every place the same invariant should be enforced (e.g. validate AND pre-commit AND CI) —
    trace it against an ACTUAL file/event in this repo, don't just read the pattern.
  • STATE-SAFETY: a gate/tracker that can be satisfied without the protected work happening, or that
    can block forever (no escape hatch / re-entrancy guard).
"Returns correct output today / not triggerable" is NOT grounds to drop a convention/scalability/
platform-limit/wiring/state-safety finding — those are precisely what a review bot flags. Refute
ONLY pure style (naming/formatting/taste/restated guards).`

const FINDINGS = { type:'object', additionalProperties:false, required:['findings','sweepLedger','residualRisk'], properties:{ findings:{ type:'array', items:{
  type:'object', additionalProperties:false,
  required:['title','file','line','class','severity','scenario','suggestedFix'],
  properties:{ title:{type:'string'}, file:{type:'string'}, line:{type:'string'},
    class:{type:'string', enum:['correctness','convention','scalability','platform-limit','wiring','state-safety']},
    severity:{type:'string', enum:['P1','P2','P3']}, scenario:{type:'string'}, suggestedFix:{type:'string'} } } },
  // Restitution contract: the agent's reasoning trace is discarded — only this output reaches the
  // orchestrator, so anything checked but not listed here did not happen.
  sweepLedger:{ type:'array', items:{type:'string'}, description:'one line per site/claim/focus question actually checked: "<file:line or question> — clean | defect (→ finding title) | not-in-class". EVERY focus question in the DIMENSION brief must appear with an explicit disposition; silence is indistinguishable from not-checked.' },
  residualRisk:{ type:'string', description:'what was NOT checked and why — or "none"' } } }

// mustFix replaces isReal: it is true for a correctness defect OR a convention/scalability/platform
// deviation backed by a cited repo idiom or external limit. Pure style => mustFix:false.
const VERDICT = { type:'object', additionalProperties:false,
  required:['mustFix','class','reasoning','checksPerformed'],
  properties:{ mustFix:{type:'boolean'},
    class:{type:'string', enum:['correctness','convention','scalability','platform-limit','wiring','state-safety','style']},
    repoIdiomViolated:{type:'string', description:'sibling file:line that does it right, or the external hard limit — REQUIRED to justify a non-correctness must-fix'},
    checksPerformed:{ type:'array', items:{type:'string'}, description:'each fact verified and the command/file:line that proves it — a check that is not listed counts as not done' },
    confidence:{type:'string',enum:['high','medium','low']}, reasoning:{type:'string'} } }

// Always include `scalability` + `platform-limits` for any backend / data / messaging diff, and
// `tooling-effectiveness` + `wiring-and-contract` for any diff that ships/edits enforcement code
// (hooks, lint/CI scripts, validators) or docs/agent-instructions — see the artifact-inventory step
// above. Add domain dimensions; drop only the ones with zero surface in this diff.
const DIMENSIONS = [
  { key:'correctness',     focus:'Logic bugs, off-by-one, null/undefined, error paths, edge cases — a triggerable wrong output.' },
  { key:'scalability',     focus:'Read-cost & scale. EVERY query reachable from changed code: bounded by an index range, or does it .collect()/scan an unbounded set? over-fetch (collect-all then discard)? N+1? Compare to the MOST-bounded sibling query in the repo and CITE it. Flag even if today\'s data is small — scale is the trigger.' },
  { key:'platform-limits', focus:'External hard limits & encoding. Every outbound message/API payload: can it exceed a hard limit (e.g. Telegram 4096-char sendMessage)? break entities/encoding (mid-entity HTML, split emoji surrogate)? fail at boundaries (empty/max)? any clock-derived value that needs a ticking state to update at a rollover?' },
  { key:'tooling-effectiveness', focus:'For EVERY new/changed hook, lint check, CI step, regex-based scanner, or validator: does it actually FIRE against this repo\'s real paths/shapes/event-payloads, or could a path/regex/field-name/scope mismatch make it silently no-op? Don\'t just read the pattern — trace it against an ACTUAL file or event from this repo (run the regex, check the real directory tree, check the real hook-event payload shape) and state what you traced it against. A gate that can be satisfied without the protected work happening, or that can block forever, is reportable here.' },
  { key:'wiring-and-contract', focus:'Is every new script/hook/check actually REGISTERED/CALLED from EVERY place that\'s supposed to call it (not just the most obvious one — e.g. a validate script AND a pre-commit hook AND CI can each be a separate, independently-wireable integration point for the same invariant)? Does any doc/skill/rule/agent-instruction/README assert a command, script, or behavior that the actual code does not satisfy (stale or aspirational documentation)? Any dead link / orphan reference to a path that does not exist?' },
  { key:'blast-radius',    focus:'What ELSE depends on changed symbols/shapes/exports, AND every SIBLING with the same anti-pattern signature (same unbounded query, same unbounded payload, same clock-derived window) — twins three functions away.' },
  { key:'contracts',       focus:'Behavior/parity vs. the code it replaces; API/schema/validator changes; backward compat; silent data loss; and any unverified behavioral CLAIM (a comment asserting "updates at midnight"/"always fits" the code does not structurally guarantee).' },
  { key:'security-and-data', focus:'Auth, input validation, injection, PII/leak of internal fields, secrets, permissions.' },
]

phase('Hunt')
const results = await pipeline(
  DIMENSIONS,
  (d) => agent(`${CONTEXT}\n\nDIMENSION: ${d.focus}\n\nIf a finding overlaps another dimension's territory, note the overlap in one line rather than re-developing it — a later step dedupes same-file/line reports, so a full write-up per dimension only multiplies verify cost for one defect.\n\nRESTITUTION: your structured output is the ONLY artifact the orchestrator sees — the reasoning trace is discarded. Any defect noticed while investigating MUST land in findings[] or get an explicit sweepLedger disposition; answer EVERY focus question of this DIMENSION in sweepLedger ("clean" is a disposition, silence is not).`, { label:`hunt:${d.key}`, phase:'Hunt', schema:FINDINGS, effort:'high' }),
  (review) => parallel((review?.findings ?? []).map((f) => () =>
    agent(`${CONTEXT}\n\nADVERSARIALLY VERIFY this finding. First verify its FACTS against the real code, then set mustFix:
- TRUE if some input makes it wrong/crash/lose data (correctness), OR it deviates from a repo idiom you can CITE in repoIdiomViolated / violates an external hard limit / is an unbounded read|scan|N+1|over-fetch — even if today's data makes it work.
- FALSE only if it is pure STYLE, or its facts don't hold.
Do NOT set mustFix=false merely because the output is correct today or "not triggerable" — that is the trap that lets review bots catch you.\nList in checksPerformed each fact you verified and the command/file:line proving it; put any residual risk you could not close in reasoning — a check that is not listed counts as not done.\n\n${JSON.stringify(f,null,2)}`,
      { label:`verify:${f.file}:${f.line}`, phase:'Verify', schema:VERDICT, effort:'high' })
      .then((v) => ({ finding:f, verdict:v }))))
)
// Different dimensions independently rediscover the SAME bug constantly (e.g. 7 dimensions all
// flagging the same dead TOC anchor). Merge same-file/overlapping-line findings BEFORE you act on
// the list, or you'll pay verify + fix cost N times for one defect and the round-count looks far
// worse than it is.
function dedupeFindings(items) {
  const merged = []
  for (const item of items) {
    const f = item.finding
    const lineNum = String(f.line).match(/\d+/)?.[0]
    const twin = merged.find((m) => m.finding.file === f.file &&
      (lineNum ? String(m.finding.line).includes(lineNum) : m.finding.line === f.line))
    if (twin) twin.duplicateCount = (twin.duplicateCount ?? 1) + 1
    else merged.push({ ...item, duplicateCount: 1 })
  }
  return merged
}

const confirmed = dedupeFindings(results.flat().filter(Boolean).filter((r) => r?.verdict?.mustFix))
return { verdict: confirmed.length ? 'FINDINGS' : 'PASS', confirmed: confirmed.map((r) => ({ ...r.finding, verdict:r.verdict, duplicateCount:r.duplicateCount })) }
```

When the workflow returns `FINDINGS`, **you** fix each confirmed item (once per distinct defect, not
once per `duplicateCount`) with a **class-sweep** (core
discipline #3 — fix every sibling of the same anti-pattern in the same pass, repo-wide, with the
enumeration table), then re-run the workflow on the **whole** new diff. Proceed once the size-scaled
convergence criterion (see "Scaling & cost") is met.

**No-ultracode fallback:** spawn the same dimensions as parallel `Agent` calls returning the same
findings shape, then one verifier `Agent` per finding. Fewer agents, same discipline.

### Parallel fixers on a shared tree

Fan-out FINDING agents are read-only; fan-out FIXER agents write, and several fixers share one
working tree. One fixer running `git reset` / `git stash` / `git checkout -- .` wipes every OTHER
fixer's uncommitted work — this nearly destroyed a parallel round in the field. Two acceptable
setups, pick one per round:

- **Worktree isolation** (preferred when fixers touch overlapping areas): each fixer gets
  `isolation: 'worktree'`; merge back at round close-out.
- **Shared tree with a mandatory clause**: every fixer prompt carries, verbatim: *"The working tree
  is SHARED with other fixers running now. Never run `git reset`, `git stash`, `git checkout --`,
  `git clean`, or any command that reverts files you did not edit — uncommitted work of other fixers
  coexists with yours and is not noise. Edit only your assigned files."* A fixer prompt without this
  clause on a shared tree is a dispatch defect.

### Agent deaths mid-run (rate limits)

Long verify fan-outs WILL occasionally lose agents to provider rate limits (16 verifiers died in one
field round). Do not restart the round from scratch and do not respawn dead agents individually:

- **Workflow agents died** → relaunch the SAME script with `resumeFromRunId: <runId>`: every
  completed agent's result returns instantly from cache; only the dead ones re-run. One field round
  recovered all 16 dead verifiers this way at near-zero cost.
- **A fixer (spawned via `Agent`) died or stalled** → continue it with `SendMessage` using its
  agentId — its context (the finding, the files it read, its partial work) is intact. Respawning a
  fresh fixer re-pays the whole context ramp and risks double-editing the same files.

---

## Sentinel (this is what unblocks `gh pr create`)

The global hook `adversarial-pr-guard.mjs` blocks `gh pr create` unless the **current HEAD** has been
recorded as reviewed. After Mode A passes **and you've committed the reviewed state**, record it:

```bash
git rev-parse HEAD > "$(git rev-parse --absolute-git-dir)/.adversarial-review-passed"
```

This writes the reviewed commit sha into `.git/` (never committed, repo-local). The hook allows
`gh pr create` only while that sha equals `HEAD`. If you commit more after reviewing, the sentinel
goes stale and the hook re-blocks — **re-run the review** on the new diff, then re-record. Do **not**
write the sentinel to bypass the review; that defeats the entire point.

---

## Scaling & cost (don't 30-agent a typo)

Match the fan-out to the change. Over-reviewing is its own waste.

| Change size | Engine |
| --- | --- |
| Trivial (typo, comment, 1-line, config) | Skip the fan-out. Read the diff + run the quality gate. Record sentinel. |
| Small (a few files, no shared surface) | 2–3 dimensions, single-vote verify. |
| Medium (feature, multiple files) | 4–5 dimensions, adversarial verify each finding. |
| Large / risky (auth, schema, public API, shared dispatch, migration) | Full dimensions + 3-vote adversarial verify; widen blast-radius coverage. |

**Convergence criterion — scaled to diff size.** A single stop rule can't serve both a 200-line PR
and a migration branch: on big diffs "two consecutive clean passes" may literally never arrive (a
field migration review ran 16→7→10→8→2→2 findings over six rounds), while an unbounded loop grinds
tokens. Pick the rule by changed-line count:

- **Normal PR (≲5k changed lines):** loop until **two consecutive clean passes**; hard cap ~3 fix
  rounds. The cap binds: at the cap round the fan-out stops chasing zero. Surviving **P1/P2 still get
  fixed and re-verified** past the cap until clean; remaining **P3 / low-severity findings convert to
  follow-up chips** (`spawn_task`) instead of triggering another full fan-out — a P3 twin is worth a
  chip, not a fresh multi-million-token round. If a P1/P2 hasn't converged by the cap, the changeset
  is too entangled — surface that to the user with the open findings rather than grinding silently.
  In the field, two runs that re-ran the whole fan-out past the cap for P3-only residue cost ~2 extra
  rounds each (~4-6M subagent tokens).
- **Large diff (≳5k changed lines / migration-scale):** drain instead of chasing zero — loop until
  **two consecutive rounds each yield ≤2 findings, none P1**, then fix those, stop, and report the
  **residual risk** honestly (what classes were swept, what the last rounds still surfaced, what was
  not exhaustively re-verified). A truthful residual-risk note beats a hollow "clean pass" claim.

---

## Anti-patterns (the loop this skill exists to prevent)

- ❌ **Dismissing an unbounded query / missing index / over-fetch / oversized payload as "correct
  today, just an optimization."** This is the #1 way a bot catches you. → ✅ Gate B: a deviation from
  a repo idiom (cite the sibling) or an external limit is **must-fix even if not triggerable today**.
- ❌ Fixing the one instance the comment points at. → ✅ **Class-sweep**: grep every sibling with the
  same signature and fix them all in the same pass.
- ❌ **Leaving the sweep's enumeration inside a subagent report (or emitting no table at all).** The
  orchestrator declares "swept" on an assertion; undispositioned grep hits and same-file twins leak
  into the next round (field: `recordTimerHistory`, re-found round 2). → ✅ The orchestrator emits
  the table itself at fix time; every grep hit gets a disposition line.
- ❌ **An agent that investigates but does not restitute.** Focus questions answered only in the
  agent's private reasoning, verified-clean sites never listed in the output, a self-identified
  defect dropped between analysis and structured output (field: 4/4 verify agents of one round —
  every one had run the right greps/tests, none restituted them; one lost a P2 it had called
  "worth flagging"). → ✅ Output-only restitution: `sweepLedger`/`checksPerformed` + `residualRisk`
  are REQUIRED schema fields; a check absent from the output did not happen, and the orchestrator
  re-asks rather than re-reading traces.
- ❌ **Scoping a class-sweep to the module the finding sits in.** The class recurs in every module the
  sweep skipped, one round at a time (~7M tokens of re-finding, in the field). → ✅ The class is the
  resource pattern across the ENTIRE diff (every mutation × that FK, every array × that cap); the
  sweep's deliverable is an enumeration table of every candidate site.
- ❌ Re-verifying only the symptom the comment named. → ✅ Re-run the **full dimension fan-out over the
  whole diff** — the twin anti-pattern next to your fix must be assessed.
- ❌ Shipping a comment/claim the code doesn't structurally guarantee ("updates at midnight"). → ✅
  Reproduce the claimed behavior or drop the claim.
- ❌ Using "refute on doubt" to downgrade a cited convention/scalability/limit finding. → ✅
  Refute-on-doubt is for **pure style only**; never for Gate B.
- ❌ **Letting the PR's headline pick the dimensions** ("it's a quality cleanup PR" → only review the
  cleanup) while a *background* change rides along unreviewed (new hooks/guards/CI scripts shipped
  in the same diff). → ✅ Inventory the diff's actual file categories (`git diff --stat`) and assign
  a dimension to EVERY one present, especially new enforcement/tooling code — it's self-referential,
  so a bug in it disables protection silently and nothing downstream will catch it for you.
- ❌ Treating "fix every sibling with the same anti-pattern TEXT" as the whole class-sweep. → ✅ Also
  sweep **structurally**: the same invariant enforced at a second integration point (pre-commit as
  well as `validate`), and the same function's other code paths (delete as well as edit, failure as
  well as success) — these twins don't grep.
- ❌ Reporting (and separately fixing) the same defect 3-7 times because different dimension agents
  independently rediscovered it. → ✅ Dedupe confirmed findings by file + overlapping line before you
  act; a round that "found 19 things" may be 4 distinct defects reported many times — fix the
  defect once, not once per duplicate report.
- ❌ A parallel fixer running `git reset` / `git stash` / `git checkout --` on the shared tree. → ✅
  Worktree isolation, or the mandatory shared-tree clause in every fixer prompt — other fixers'
  uncommitted work coexists and is not noise.
- ❌ Restarting a round from scratch (or respawning agents one by one) after rate-limit deaths. → ✅
  Resume the SAME Workflow runId (completed agents return from cache); continue a dead fixer via
  `SendMessage` with its context intact.
- ❌ Fixing a bot comment, pushing, waiting for the next comment, repeat. → ✅ Batch + one full
  adversarial pass over the whole diff before each push.
- ❌ Declaring "compliant / no bugs" you can't back. → ✅ Re-verify the full diff; report honestly,
  including regressions you caused.
- ❌ Writing the sentinel to skip the review. → ✅ The sentinel attests a real pass; earn it.
