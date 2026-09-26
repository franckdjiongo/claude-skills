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
   - **Mandate coverage is 1:1, and the table's verdicts must reconcile.** Before accepting a
     round, check the deliverable against the targets the mandate NAMED (files to read, consumer
     classes, a question to answer numerically): every named target has a disposition — `clean`
     with sites, `finding-filed` naming its finding, or an explicit `not-examined` with no sites —
     and a target that is simply absent is NOT DONE, never implicitly clean (field, 2026-09-10/11:
     two mandated consumer classes never appeared in any sweep, two mandated sibling files were
     never opened after an empty grep passed without comment). A `finding-filed` row with no
     finding behind it, or a `not-examined` row that lists inspected sites, is the same defect
     from the other side (field, 2026-09-13, 4/6 verifiers). The engine below computes
     `uncoveredTargets` and `inconsistentSweeps` for you; the manual fallback does it by hand.
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
7. **Every verification claim must name a check you actually ran — and the check must be CAPABLE
   of proving the claim.** Provenance, not just presence: "grep for X — none found" needs that grep
   in the trace; "typecheck clean repo-wide" needs an UNFILTERED `tsc --noEmit` (a `| grep foo`
   pipe proves only the absence of `foo`, and a 1.5 s run never type-checked a repo); "12/12 pass in
   file X" needs a run of file X (an aggregate "73 pass" over 7 files proves nothing per file); two
   batches that share a file do not add up to a total; a `sitesChecked` entry copied from the
   mandate you were handed is not a site you checked. Write the command AND its observed output,
   at the scope the command actually proved (a piped, grepped, or `head`-ed output grounds only
   the narrowed claim); report the numbers the tool printed, per invocation, so totals stay
   recomputable — never arithmetic on top of the output. If you did not run it, write "not run". In the field (2026-09-13/14, one review round): a grep
   declared "none found" that no tool call ever executed, a grep-filtered tsc reported as
   repo-wide, a per-file count inferred from an aggregate run, a double-counted test total, and a
   plist "confirmed read-only" that only the mandate had ever mentioned — five claims the trace
   could not back, each caught one night later by the judge instead of by the orchestrator.

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
10. **Read the bot's first pass before any merge.** Once the PR is open and before it is merged
    (by you, by `ship-pr`, or handed to the user as "ready"), collect every comment and review —
    `gh pr view <n> --json comments,reviews` and `gh api repos/<owner>/<repo>/pulls/<n>/comments` —
    and read the **author and body** of each one on THIS PR. A deployment/preview bot (e.g.
    `vercel[bot]`) is not a review, but you only know that once you have read it; never infer it from
    another PR's comment. Anything that is a review finding goes to Mode B. Merging over an unread
    comment is the recorded failure (field, 2026-09-25 and 2026-09-26: two consecutive graded jobs
    merged with the post-preflight comment never read — `ship-pr` checked only mergeable + checks).

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

// `sweeps` + `residualRisk` are REQUIRED alongside `findings`: they are the restitution channel for
// class-sweep enumeration and unresolved doubt. A sub-agent that swept a class but only wrote the
// table into its reasoning (never into `sweeps`) is invisible to the orchestrator and the next
// round — see "Reading sweeps and residualRisk" below. `additionalProperties:false` stays: the
// schema grows by adding required fields, not by loosening it.
// The sweep `verdict` is a STRICT tri-state (field, 2026-09-13: "finding-filed" sweeps with no
// finding behind them, and "not-examined" sweeps whose sitesChecked listed inspected sites, both
// mis-routed the next round): `finding-filed` must point at a findings[] title via `findingRef`;
// `not-examined` means NOTHING was inspected, so its sitesChecked is empty. The reconciliation
// below turns any other combination into `inconsistentSweeps`.
const FINDINGS = { type:'object', additionalProperties:false, required:['findings','sweeps','residualRisk'], properties:{
  findings:{ type:'array', items:{
    type:'object', additionalProperties:false,
    required:['title','file','line','class','severity','scenario','suggestedFix'],
    properties:{ title:{type:'string'}, file:{type:'string'}, line:{type:'string'},
      class:{type:'string', enum:['correctness','convention','scalability','platform-limit','wiring','state-safety']},
      severity:{type:'string', enum:['P1','P2','P3']}, scenario:{type:'string'}, suggestedFix:{type:'string'} } } },
  sweeps:{ type:'array', description:'One entry per class/pattern this dimension swept — the enumeration table, restituted, not left in reasoning. Every target NAMED in the mandate (DIMENSION focus, NAMED TARGETS, residual items from the prior round) gets its own entry quoting that name verbatim in `target`.', items:{
    type:'object', additionalProperties:false,
    required:['target','sitesChecked','verdict'],
    properties:{ target:{type:'string', description:'the class/pattern swept, e.g. "every route with the same validation" — a mandate-named target is quoted verbatim'},
      sitesChecked:{type:'array', items:{type:'string'}, description:'file:line entries you actually opened or grepped IN THIS RUN — a tool call in your trace backs each one; never copied from the mandate or the CONTEXT'},
      verdict:{type:'string', enum:['clean','finding-filed','not-examined'], description:'STRICT tri-state: clean = every listed site inspected, nothing to file; finding-filed = at least one findings[] entry exists for it (named in findingRef); not-examined = you did NOT inspect it, so sitesChecked MUST be empty — if you opened a site and drew a conclusion, the verdict is clean or finding-filed, never not-examined'},
      findingRef:{type:'string', description:'REQUIRED when verdict is finding-filed: the exact `title` of the findings[] entry this sweep filed'} } } },
  residualRisk:{type:'string', description:'Unconfirmed doubts and verifications that failed or could not be run — each as "command → observed output" or "not run". "none" is allowed if there truly are none.'} } }

// mustFix replaces isReal: it is true for a correctness defect OR a convention/scalability/platform
// deviation backed by a cited repo idiom or external limit. Pure style => mustFix:false.
// `checksPerformed` is REQUIRED restitution: the concrete commands/greps/tests actually executed
// and their outcome — not a description of what verification "would" show.
const VERDICT = { type:'object', additionalProperties:false,
  required:['mustFix','class','checksPerformed','reasoning'],
  properties:{ mustFix:{type:'boolean'},
    class:{type:'string', enum:['correctness','convention','scalability','platform-limit','wiring','state-safety','style']},
    repoIdiomViolated:{type:'string', description:'sibling file:line that does it right, or the external hard limit — REQUIRED to justify a non-correctness must-fix'},
    checksPerformed:{type:'array', items:{type:'string'}, description:'the concrete commands/greps/tests you ran to verify or refute this finding, each as "command → observed output". The check must be CAPABLE of proving what you conclude from it: a piped/filtered command proves only what the filter can see, an aggregate run proves nothing per file, and a claim with no command behind it is written as "not run"'},
    confidence:{type:'string',enum:['high','medium','low']}, reasoning:{type:'string'} } }

// Always include `scalability` + `platform-limits` for any backend / data / messaging diff, and
// `tooling-effectiveness` + `wiring-and-contract` for any diff that ships/edits enforcement code
// (hooks, lint/CI scripts, validators) or docs/agent-instructions — see the artifact-inventory step
// above. Add domain dimensions; drop only the ones with zero surface in this diff.
// Optional per dimension: `targets:[...]` — every consumer list, sibling file, symbol, or residual
// item from the prior round that you want explicitly CLOSED by this dimension (e.g.
// targets:['html-review-changed consumers','server/services/treeWatcher.ts','residual (b)']).
// Each name is injected into the hunt prompt as a NAMED TARGET and checked 1:1 against `sweeps`
// at the end of the round (`uncoveredTargets`). Field, 2026-09-11: three rounds in a row, targets
// named in a dimension's focus came back with no sweep at all — not `not-examined`, just silence —
// and the orchestrator read the empty `findings` as a clean pass.
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
  (d) => agent(`${CONTEXT}\n\nDIMENSION: ${d.focus}\n\nIf a finding overlaps another dimension's territory, note the overlap in one line rather than re-developing it — a later step dedupes same-file/line reports, so a full write-up per dimension only multiplies verify cost for one defect.\n\nRESTITUTION (required, not optional): anything you investigate but do not write into \`sweeps\` or \`residualRisk\` counts as NOT DONE — a class-sweep or a doubt that stays inside your reasoning is invisible to the orchestrator and to the next round. Explicitly close every focal question this dimension raises: one \`sweeps\` entry per class/pattern you swept, listing every site you actually checked (\`sitesChecked\`) and its \`verdict\` — \`not-examined\` is a valid, honest answer when you ran out of budget, silence is not. If you notice a defect while reasoning through this dimension — even low severity, even adjacent to your named focus — file it in \`findings\` rather than dropping it because it felt minor.\n\nCOVERAGE 1:1: every target named in this DIMENSION (a consumer list, a sibling file, a symbol, a residual item) needs its own \`sweeps\` entry quoting the name verbatim in \`target\` — clean, finding-filed, or not-examined. Before you emit, re-read the DIMENSION text and tick each named target against your sweeps; a named target with no entry is a restitution defect, not an omission.\n\nTRI-STATE, strictly: \`not-examined\` means you did NOT inspect it — its \`sitesChecked\` is empty. If you opened a site and drew a conclusion, the verdict is \`clean\` or \`finding-filed\`, never \`not-examined\`. \`finding-filed\` requires a real \`findings\` entry, named in \`findingRef\` — a defect that lives only in \`residualRisk\` prose is invisible to the dedupe and fix steps. A defect you noticed yourself (even adjacent) is filed, not parked as not-examined.\n\nPROVENANCE: every \`sitesChecked\` entry is a site YOU opened or grepped in this run — a tool call in your trace backs it; a path you only read in this prompt is not a checked site. Every claim in \`residualRisk\` names the command you ran and its observed output, and that command must be CAPABLE of proving the claim (a filtered/piped command proves only what the filter can see; an aggregate test run proves nothing per file; overlapping batches do not add up). If you did not run it, write "not run".${d.targets?.length ? `\n\nNAMED TARGETS (each needs its own \`sweeps\` entry quoting the name verbatim — clean, finding-filed, or not-examined; silence is a restitution defect): ${d.targets.join(' · ')}` : ''}`, { label:`hunt:${d.key}`, phase:'Hunt', schema:FINDINGS, model:'sonnet', effort:'medium' }),
  (review) => parallel((review?.findings ?? []).map((f) => () =>
    agent(`${CONTEXT}\n\nADVERSARIALLY VERIFY this finding. First verify its FACTS against the real code, then set mustFix:
- TRUE if some input makes it wrong/crash/lose data (correctness), OR it deviates from a repo idiom you can CITE in repoIdiomViolated / violates an external hard limit / is an unbounded read|scan|N+1|over-fetch — even if today's data makes it work.
- FALSE only if it is pure STYLE, or its facts don't hold.
Do NOT set mustFix=false merely because the output is correct today or "not triggerable" — that is the trap that lets review bots catch you.\n\nRESTITUTION (required, not optional): any command/grep/test you run to verify or refute this finding that you do not list in \`checksPerformed\` counts as NOT DONE — a check that only happened in your reasoning is unopposable by the orchestrator. Close the focal question this finding raises explicitly, with the outcome of each check. If, while verifying, you notice a DIFFERENT defect than the one you were sent to check, file it too rather than silently letting it go because it's out of scope for this verdict.\n\nPROVENANCE: each \`checksPerformed\` entry is "command → observed output", and the command must be CAPABLE of proving what you conclude from it — "typecheck clean" needs an unfiltered tsc run (a \`| grep\` pipe proves only the absence of the grepped pattern), a per-file test count needs a run of that file, and a total across batches is only valid if the batches do not overlap. A conclusion with no command behind it is written as "not run", never as verified.\n\n${JSON.stringify(f,null,2)}`,
      { label:`verify:${f.file}:${f.line}`, phase:'Verify', schema:VERDICT, model:'opus', effort:'high' })
      .then((v) => ({ finding:f, verdict:v }))))
    // Carry the hunt-level restitution (sweeps, residualRisk) alongside this dimension's verified
    // findings — if it only lived on `review` inside this closure it would never reach the
    // orchestrator's return value below, which is exactly the "trapped in reasoning" failure mode
    // this schema change exists to close.
    .then((verified) => ({ verified, sweeps: review?.sweeps ?? [], residualRisk: review?.residualRisk ?? 'none',
      huntFindings: review?.findings ?? [] }))
)
// results: one entry per dimension — { verified: [{finding,verdict}], sweeps, residualRisk, huntFindings }.

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

const allVerified = results.flatMap((r) => r.verified ?? [])
const confirmed = dedupeFindings(allVerified.filter(Boolean).filter((r) => r?.verdict?.mustFix))

// Restitution rollup: `sweeps` and `residualRisk` are orchestrator-facing, not buried in a
// subagent's report — surface them in the return so a `not-examined` sweep or an outstanding doubt
// is visible even when `findings` alone looks clean (see "Reading sweeps and residualRisk" below).
const sweeps = results.flatMap((r) => r.sweeps ?? [])
const notExaminedSweeps = sweeps.filter((s) => s.verdict === 'not-examined')
const residualRisks = results.map((r) => r.residualRisk).filter((r) => r && r !== 'none')

// Tri-state reconciliation (field, 2026-09-13): a `finding-filed` sweep with no findings[] entry
// behind it is a GHOST filing — the defect exists only in prose, invisible to dedupe and to the fix
// step; a `not-examined` sweep whose sitesChecked lists inspected sites is a dodged verdict. Both
// are unresolved, not clean — surfaced separately so you re-ask that dimension or examine it
// yourself before declaring convergence.
const inconsistentSweeps = results.flatMap((r) => {
  const titles = (r.huntFindings ?? []).map((f) => f.title)
  return (r.sweeps ?? []).flatMap((s) => {
    if (s.verdict === 'finding-filed' && !(s.findingRef && titles.includes(s.findingRef)))
      return [{ ...s, problem: 'finding-filed with no matching findings[] title (ghost filing)' }]
    if (s.verdict === 'not-examined' && (s.sitesChecked ?? []).length > 0)
      return [{ ...s, problem: 'not-examined but sites were inspected — must be clean or finding-filed' }]
    return []
  })
})

// Mandate coverage 1:1 (field, 2026-09-11): targets the orchestrator NAMED in a dimension came back
// with no sweeps entry at all — neither clean nor not-examined, just silence — and the empty
// `findings` read as a clean pass. Any dimension may cover a name; what matters is that SOME sweep
// quoted it. An uncovered target is an open focal question, exactly like `not-examined`.
const namedTargets = DIMENSIONS.flatMap((d) => d.targets ?? [])
const uncoveredTargets = namedTargets.filter((t) => !sweeps.some((s) =>
  `${s.target} ${(s.sitesChecked ?? []).join(' ')}`.toLowerCase().includes(t.toLowerCase())))

return {
  verdict: confirmed.length ? 'FINDINGS' : 'PASS',
  confirmed: confirmed.map((r) => ({ ...r.finding, verdict:r.verdict, duplicateCount:r.duplicateCount })),
  sweeps, notExaminedSweeps, inconsistentSweeps, uncoveredTargets, residualRisks,
}
```

When the workflow returns `FINDINGS`, **you** fix each confirmed item (once per distinct defect, not
once per `duplicateCount`) with a **class-sweep** (core
discipline #3 — fix every sibling of the same anti-pattern in the same pass, repo-wide, with the
enumeration table), then re-run the workflow on the **whole** new diff. Proceed once the size-scaled
convergence criterion (see "Scaling & cost") is met.

**Reading `sweeps` and `residualRisk` is part of reading the results, not optional extra credit.**
The workflow's return carries `sweeps`, `notExaminedSweeps`, `inconsistentSweeps`,
`uncoveredTargets`, and `residualRisks` alongside `verdict`/`confirmed` (manual fallback: the same
fields, gathered by hand from each agent's report — see below) — read them the same way you read
`findings`, every round:
- Anything in `notExaminedSweeps` is an open focal question, not a clean pass — fold it into the next
  round's scope (assign it to a dimension, or examine it yourself before declaring convergence).
  Never silently treat `not-examined` as `clean`, and never declare `PASS`/convergence while
  `notExaminedSweeps` is non-empty.
- Anything in `uncoveredTargets` is a target you NAMED that no sweep quoted — silence, which is
  worse than `not-examined` because nothing flags it. Treat it exactly like `notExaminedSweeps`.
  Before the round, name the targets you care about in `targets` (consumer lists, sibling files,
  residual items from the prior round) so the reconciliation can catch the silence for you; after
  the round, if you named nothing, do the tick-list by hand: every symbol/file/class the dimension
  focus mentions gets a line in some sweep, or it goes into the next round.
- Anything in `inconsistentSweeps` is a sweep whose verdict contradicts its own content: a
  `finding-filed` with no `findings[]` entry behind it (the defect only exists in prose — it never
  reaches dedupe or the fix step) or a `not-examined` whose `sitesChecked` shows the agent DID look.
  Re-ask that dimension for a real verdict (file the finding, or decide clean), or examine the
  sites yourself. Never count a ghost filing as "found and handled".
- Anything in `residualRisks` is a doubt an agent could not resolve — carry it forward into the next
  round's `CONTEXT`, or into the honest residual-risk report at convergence (see "Scaling & cost").
  Do not let it fall out of the loop just because the round it surfaced in returned `PASS` on
  `findings` alone.
- Same discipline for `checksPerformed` on each VERDICT: if a must-fix verdict's `checksPerformed` is
  thin or missing relative to what the reasoning claims, that verdict is under-restituted — treat it
  as unresolved, not as a pass.
- **Claims vs checks (discipline #7):** for every verification claim in `residualRisk` or
  `checksPerformed`, ask "which command, and could THAT command prove THIS?". A "repo-wide clean"
  backed by a `| grep` pipe, a per-file "N/N pass" backed by an aggregate run, a "none found" with
  no grep named, a total that re-adds an overlapping batch, a `sitesChecked` path that only the
  mandate ever mentioned — downgrade each to unverified and carry it into the next round's
  `CONTEXT`. The judge caught five of these in one night; the orchestrator should have.

**Model policy (Franck's decision, 2026-09-09, after a blind replay of 12 Opus reviews in
Sonnet on the same diffs — recall 5/8 of Opus's P1s, 4 new P1s with executed proofs, 0 Opus false
positives):** HUNTERS run `model:'sonnet', effort:'medium'`; the independent VERIFY step per
finding runs `model:'opus', effort:'high'` — the rigor that paid came from the protocol (second
round on the fix diff, executed proofs, independent verify), not from the hunter's tier. Pin these
in the agent opts as in the template above; never let a hunt inherit the session model. The second
round on the fix diff and the Verify step are NOT optional: both Opus runs that skipped Verify
missed boundary defects (state overwritten by a PUT body, the "item" half of a fix) that
independent verification exists to catch.

**Where the Workflow tool prompts, and where it does not (verified 2026-09-09):** LOCALLY, in a
session running in auto mode, the Workflow tool launches WITHOUT any approval dialog (this skill's
own fan-outs ran unattended in the field). In a CLOUD run (claude.ai routine), the Workflow tool
prompts at every launch even under bypassPermissions (cost guard) and nobody can click — there,
use the no-ultracode fallback below. Key the engine choice on the environment, not on the fear of
a popup.

**No-ultracode fallback:** spawn the same dimensions as parallel `Agent` calls returning the same
findings shape, then one verifier `Agent` per finding. Fewer agents, same discipline — and the SAME
restitution fields, not a lighter version because there's no Workflow tool enforcing a schema. Each
hunt agent's prompt/expected report must still require `findings`, `sweeps` (per class/pattern
swept: target, sites checked, verdict), and `residualRisk` (unconfirmed doubts, or "none"); each
verify agent's report must still require `checksPerformed` (the concrete checks it ran, with
outcome) alongside `mustFix`/`class`/`reasoning`. When you (the orchestrator) read a hand-launched
agent's final message back, hold it to the same bar as a Workflow schema result: no `sweeps` table,
no `residualRisk` line, no `checksPerformed` list in the report means that work is NOT DONE, even if
the agent's prose claims it happened. The same three reconciliations apply by hand: every target
you named in the prompt has a sweep line (or it is `not-examined` for the next round); every
`finding-filed` line points at a finding actually listed and every `not-examined` line has an
empty site list; every claim names a command capable of proving it.

**The fallback drops the Workflow tool, never a phase.** Whatever the tier, the fallback still runs
(a) at least one verifier `Agent` per finding — the orchestrator re-reading the finding and agreeing
with it ("valid finding, I'd seen it myself") is not a verify step — and (b) the second round on the
fix diff as an `Agent` fan-out, not as the orchestrator's own re-read. If you verify something
yourself anyway, it counts only when you emit its `checksPerformed` list ("command → observed
output") in the visible thread; verification that lives in your reasoning is NOT DONE. Field,
2026-09-25 and 2026-09-26: both graded jobs ran the fallback, replaced every verifier with
self-verification and ran round 2 alone ("self-verification … sufficient for this tier") — the
same shortcut the model-policy paragraph above records as missing boundary defects.

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
recorded as reviewed. After Mode A passes **and you've committed the reviewed state**, record it —
**always with an explicit `cd` into the reviewed repo/worktree root in the SAME command**:

```bash
cd <racine-absolue-du-repo-ou-worktree-revu> && git rev-parse HEAD > "$(git rev-parse --absolute-git-dir)/.adversarial-review-passed"
```

This writes the reviewed commit sha into the repo's own git dir (never committed, repo-local; for a
worktree that is `.git/worktrees/<name>/`, NOT the shared `.git`). The explicit `cd` is not optional:
running the bare command from the wrong cwd writes the wrong sha into the wrong git dir — observed
2026-08-14 (temps-chantier T77): the bare form ran from the main repo root and dropped master's sha
into the SHARED `.git`, forging a pass for a diff that hook never validated and potentially
contaminating the sibling worktrees. After writing, confirm the printed sha equals the HEAD you just
reviewed. The hook allows `gh pr create` only while that sha equals `HEAD` (and, for
`--head <branch>`, the tip of that branch). If you commit more after reviewing, the sentinel goes
stale and the hook re-blocks — **re-run the review** on the new diff, then re-record. Do **not**
write the sentinel to bypass the review, and NEVER write it into a `.git` that is not the reviewed
checkout's own git dir; that defeats the entire point and counts as a security incident. If the hook
blocks despite a genuine completed review, that is an infra failure: stop and report it (chip /
orchestrator), don't route around it.

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
- ❌ **Investigates but does not restitute** — real greps/tests actually run, a class genuinely swept,
  a doubt actually weighed, but none of it lands in `sweeps` / `checksPerformed` / `residualRisk`, so
  it stays trapped in the agent's reasoning and unopposable by the orchestrator. → ✅ Anything not
  written into those fields is treated as NOT DONE; every focal question gets explicitly closed, and
  a defect noticed mid-reasoning gets filed as a finding — even low severity — instead of dropped.
- ❌ **A named target answered by silence** — the dimension focus names "html-review-changed
  consumers" or a sibling file to read, and the report has no sweep for it: not `clean`, not
  `not-examined`, nothing — and the orchestrator reads the empty `findings` as a pass (field,
  2026-09-11, three rounds). → ✅ Coverage 1:1: every named target gets its own sweep line quoting
  the name; the orchestrator names them in `targets` and reads `uncoveredTargets` like
  `notExaminedSweeps`.
- ❌ **Blurred tri-state** — a `finding-filed` sweep with no finding behind it (a ghost that dedupe
  and fix never see), or a `not-examined` whose `sitesChecked` shows the agent looked and concluded,
  or a self-spotted adjacent defect parked as `not-examined` (field, 2026-09-13, four sessions).
  → ✅ `finding-filed` names its finding in `findingRef`; `not-examined` has an empty site list; a
  site you opened gets a real verdict; `inconsistentSweeps` is unresolved, never clean.
- ❌ **Claims that outrun their checks** — "grep — none found" with no grep in the trace, "tsc clean
  repo-wide" from a grep-filtered pipe, "12/12 pass" per file inferred from an aggregate run, a
  test total that double-counts an overlapping batch, a `sitesChecked` path copied from the mandate
  (field, 2026-09-13/14, five claims in one round). → ✅ Discipline #7: every claim names the
  command you ran and its observed output, and that command must be CAPABLE of proving the claim;
  otherwise it is written as "not run" and carried forward as unverified.
