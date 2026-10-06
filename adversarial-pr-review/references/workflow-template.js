// Workflow script body for the adversarial review engine (see ../SKILL.md). Run by the Workflow tool, or
// executed by hand as a specification on runtimes without it. Top-level await/return are intended.
export const meta = {
  name: 'pr-adversarial-review',
  description: 'Adversarially review the working diff before PR / before pushing fixes',
  phases: [{ title: 'Hunt' }, { title: 'Verify' }],
}

const REPO = '<absolute repo path>'
// Hard cap: 2 rounds, never a 3rd.
// Round 1 reviews the whole diff. Round 2 reviews ONLY the delta since round 1, plus its direct interactions.
const ROUND = 1
const ROUND1_SHA = '' // round 2 only: the HEAD reviewed in round 1
// Claude: the pins below. Codex: overwrite both from `node <skill folder>/scripts/resolve-codex-models.mjs
// --repo <REPO>`; never keep these Claude values and never use a model name from memory.
const HUNTER = { model: 'sonnet', effort: 'medium' }
const VERIFIER = { model: 'sonnet', effort: 'high' }
const SCOPE = ROUND === 1
  ? `Run \`git -C "${REPO}" diff <merge-base-sha> --\` (committed + staged + unstaged), include the
untracked PR files inventoried below, read the full changed files + their callers/siblings, AND
read the MOST-BOUNDED sibling of any query/handler/message you touch (so you know THIS repo's idiom).
For any file that is WHOLLY NEW in this diff, read and audit the entire file (there is no old
behavior to diff against); for a pre-existing file, scope to what the diff changed vs main.`
  : `ROUND 2: review ONLY the delta since round 1 (\`git -C "${REPO}" diff ${ROUND1_SHA} --\`) plus its direct
interactions (callers, siblings and tests of the changed lines). A finding on lines this delta did not touch
is INVALID. The NEW_FILES below are the files added since round 1.`
const CONTEXT = `Adversarially review the UNCOMMITTED+committed diff that will become a PR at ${REPO}.
${SCOPE}
A finding is reportable only if it names BOTH:
  • TRIGGER: the REAL input that fires it today (existing data, call or consumer), not a hypothetical one.
    No real input: severity P3.
  • ORIGIN, proven by running or reading base AND HEAD: introduced | aggravated | pre-existing.
Classes: correctness (the trigger makes it wrong / crash / lose data); convention (cite the sibling file:line
that does it right); scalability / platform-limit (unbounded read, N+1, over-fetch, external hard limit),
judged on the data and callers that exist today; wiring (new enforcement/tooling code that does not fire on
this repo's real paths/event payloads, or is not called from every place the invariant is enforced: trace it
against an ACTUAL file or event); state-safety (a gate satisfiable without the protected work, or that can
block forever).
SEVERITY: P1 = harms users, data or security, or breaks a hard limit; P2 = a real defect or repo-idiom/scale
violation with a bounded blast radius; P3 = cosmetic, hypothetical input, or taste.`

// `sweeps` + `residualRisk` are REQUIRED alongside `findings`: they are the restitution channel for
// class-sweep enumeration and unresolved doubt. A sub-agent that swept a class but only wrote the
// table into its reasoning (never into `sweeps`) is invisible to the orchestrator and the next
// round — see "Reading sweeps and residualRisk" below. `additionalProperties:false` stays: the
// schema grows by adding required fields, not by loosening it.
// EVIDENCE FORM / SHARED MACHINE (hunt prompt, field 2026-09-27): across 6 fresh graded hunter sessions,
// 4 returned sitesChecked as prose, 4 claimed a site or grep no tool call backs, one declared an
// identity-guard target `clean` with no test run and another ran no test believing read-only
// forbade `bun test`, and two siblings ran the full suite concurrently, left it running in the
// background and wrote the same fixed /tmp file.
// SHELL (field 2026-09-29): all 4 fresh graded hunters broke `grep -r --include=*.ts` on zsh's
// unmatched-glob error (at least 9 failed calls, one grep left partial); two also called GNU `timeout` (absent on
// macOS) and one repeated a BSD `sed -i` error it had already seen.
// The sweep `verdict` is a STRICT tri-state (field, 2026-09-13: "finding-filed" sweeps with no
// finding behind them, and "not-examined" sweeps whose sitesChecked listed inspected sites, both
// mis-routed the next round): `finding-filed` must point at a findings[] title via `findingRef`;
// `not-examined` means NOTHING was inspected, so its sitesChecked is empty. The reconciliation
// below turns any other combination into `inconsistentSweeps`.
const FINDINGS = { type:'object', additionalProperties:false, required:['findings','sweeps','residualRisk'], properties:{
  findings:{ type:'array', items:{
    type:'object', additionalProperties:false,
    required:['title','file','line','class','severity','trigger','origin','scenario','suggestedFix'],
    properties:{ title:{type:'string'}, file:{type:'string'}, line:{type:'string'},
      class:{type:'string', enum:['correctness','convention','scalability','platform-limit','wiring','state-safety']},
      severity:{type:'string', enum:['P1','P2','P3']},
      trigger:{type:'string', description:'the real existing input (data, call or consumer) that fires it today; "none" makes it P3'},
      origin:{type:'string', enum:['introduced','aggravated','pre-existing'], description:'proven against base and HEAD'},
      scenario:{type:'string'}, suggestedFix:{type:'string'} } } },
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
  required:['mustFix','class','origin','checksPerformed','reasoning'],
  properties:{ mustFix:{type:'boolean'},
    origin:{type:'string', enum:['introduced','aggravated','pre-existing'], description:'your own base-vs-HEAD proof of where the defect comes from; pre-existing is never a FIX unless P1'},
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


// WHOLLY-NEW FILES AS NAMED TARGETS (field, 2026-10-01 + 2026-10-02 — two distinct jobs): the CONTEXT
// line "audit the entire file" was not enough. On job 33cd3e17 five of six hunters never opened the
// wholly-new test + __fixtures__ files (one excluded them from its own `git diff` with ':!*.test.ts');
// on job 12c1e9cc no hunter opened the new taskAlerter.test.ts, a second new test file was read only
// to line 60, three more were run but never read — and `uncoveredTargets` stayed empty both times
// because no dimension NAMED them. Fill NEW_FILES from
// the two NUL-delimited inventory commands above — tests and fixtures INCLUDED,
// nothing filtered out — and each file is assigned round-robin to a dimension as a named target, so
// silence on any of them surfaces in `uncoveredTargets` instead of reading as a pass.
const INVENTORY_COMPLETE = false // Set true only after both inventory commands succeed and paths are reconciled.
const NEW_FILES = [/* unique PR paths from both inventory commands above */]
if (!INVENTORY_COMPLETE) throw new Error('INCOMPLETE: populate and validate the new-file inventory first')
if (NEW_FILES.length && !DIMENSIONS.length) throw new Error('New files require a hunt dimension')
NEW_FILES.forEach((f, i) => {
  const d = DIMENSIONS[i % DIMENSIONS.length]
  d.targets = [...(d.targets ?? []), `wholly-new file ${f}`]
})

phase('Hunt')
const results = await pipeline(
  DIMENSIONS,
  (d) => agent(`${CONTEXT}\n\nDIMENSION: ${d.focus}\n\nIf a finding overlaps another dimension's territory, note the overlap in one line rather than re-developing it — a later step dedupes same-file/line reports, so a full write-up per dimension only multiplies verify cost for one defect.\n\nRESTITUTION (required, not optional): anything you investigate but do not write into \`sweeps\` or \`residualRisk\` counts as NOT DONE — a class-sweep or a doubt that stays inside your reasoning is invisible to the orchestrator and to the next round. Explicitly close every focal question this dimension raises: one \`sweeps\` entry per class/pattern you swept, listing every site you actually checked (\`sitesChecked\`) and its \`verdict\` — \`not-examined\` is a valid, honest answer when you ran out of budget, silence is not. If you notice a defect while reasoning through this dimension — even low severity, even adjacent to your named focus — file it in \`findings\` rather than dropping it because it felt minor.\n\nCOVERAGE 1:1: every target named in this DIMENSION (a consumer list, a sibling file, a symbol, a residual item) needs its own \`sweeps\` entry quoting the name verbatim in \`target\` — clean, finding-filed, or not-examined. Before you emit, re-read the DIMENSION text and tick each named target against your sweeps; a named target with no entry is a restitution defect, not an omission.\n\nTRI-STATE, strictly: \`not-examined\` means you did NOT inspect it — its \`sitesChecked\` is empty. If you opened a site and drew a conclusion, the verdict is \`clean\` or \`finding-filed\`, never \`not-examined\`. \`finding-filed\` requires a real \`findings\` entry, named in \`findingRef\` — a defect that lives only in \`residualRisk\` prose is invisible to the dedupe and fix steps. A defect you noticed yourself (even adjacent) is filed, not parked as not-examined.\n\nPROVENANCE: every \`sitesChecked\` entry is a site YOU opened or grepped in this run — a tool call in your trace backs it; a path you only read in this prompt is not a checked site. Every claim in \`residualRisk\` names the command you ran and its observed output, and that command must be CAPABLE of proving the claim (a filtered/piped command proves only what the filter can see; an aggregate test run proves nothing per file; overlapping batches do not add up). If you did not run it, write "not run".\n\nEVIDENCE FORM: each \`sitesChecked\` entry is \`path:line\` (or \`path\` + the exact grep pattern) — never a prose summary, so it can be matched against your tool calls. A \`clean\` verdict on a BEHAVIORAL claim (a guard, a race, an auth/identity boundary, a state transition) needs an executed test or reproduction; if you only read the code, keep \`clean\` but write "static read only — no test run" for that target in \`residualRisk\`. A targeted test run (e.g. \`bun test <file>\`) is allowed and expected where it can prove the claim — read-only forbids edits, not tests.\n\nSHARED MACHINE: sibling hunters run in parallel. Run TARGETED tests only — never the full suite (the orchestrator owns it); never leave a background process running at hand-back, never sleep-poll one; write scratch files under \`mktemp -d\`, never a fixed /tmp name. SHELL: the host is typically macOS/zsh — quote every glob you pass to a tool (\`--include='*.ts'\`), prefer \`rg -g '*.ts'\` for searches. Hunters must not edit reviewed files. On BSD/macOS, \`sed -i\` takes an empty suffix argument (\`sed -i ''\`); GNU sed does not. Do not assume GNU \`timeout\` exists; after a shell error, change the command before retrying it.${d.targets?.length ? `\n\nNAMED TARGETS (each needs its own \`sweeps\` entry quoting the name verbatim — clean, finding-filed, or not-examined; silence is a restitution defect): ${d.targets.join(' · ')}` : ''}`, { label:`hunt:${d.key}`, phase:'Hunt', schema:FINDINGS, model:HUNTER.model, effort:HUNTER.effort }),
  (review) => parallel((review?.findings ?? []).map((f) => () =>
    agent(`${CONTEXT}\n\nADVERSARIALLY VERIFY this finding. First verify its FACTS against the real code, then set mustFix:
- Check the TRIGGER (does the named real input exist today?) and the ORIGIN (run or read base AND HEAD: introduced, aggravated or pre-existing).
- TRUE if the trigger exists and it makes something wrong/crash/lose data, OR it deviates from a repo idiom you can CITE in repoIdiomViolated / violates an external hard limit / is an unbounded read|scan|N+1|over-fetch on data or callers that exist today.
- FALSE if it is pure STYLE, its facts don't hold, or no real input triggers it.\n\nRESTITUTION (required, not optional): any command/grep/test you run to verify or refute this finding that you do not list in \`checksPerformed\` counts as NOT DONE — a check that only happened in your reasoning is unopposable by the orchestrator. Close the focal question this finding raises explicitly, with the outcome of each check. If, while verifying, you notice a DIFFERENT defect than the one you were sent to check, file it too rather than silently letting it go because it's out of scope for this verdict.\n\nPROVENANCE: each \`checksPerformed\` entry is "command → observed output", and the command must be CAPABLE of proving what you conclude from it — "typecheck clean" needs an unfiltered tsc run (a \`| grep\` pipe proves only the absence of the grepped pattern), a per-file test count needs a run of that file, and a total across batches is only valid if the batches do not overlap. A conclusion with no command behind it is written as "not run", never as verified.\n\n${JSON.stringify(f,null,2)}`,
      { label:`verify:${f.file}:${f.line}`, phase:'Verify', schema:VERDICT, model:VERIFIER.model, effort:VERIFIER.effort })
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
    if (s.verdict === 'clean' && !(s.sitesChecked ?? []).some((site) => typeof site === 'string' && site.trim().length > 0))
      return [{ ...s, problem: 'clean with no checked site or recorded search' }]
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
const uncoveredTargets = namedTargets.filter((t) => !sweeps.some((s) => s.target === t))
const incomplete = notExaminedSweeps.length || inconsistentSweeps.length || uncoveredTargets.length

return {
  verdict: confirmed.length ? 'FINDINGS' : incomplete ? 'INCOMPLETE' : 'PASS',
  confirmed: confirmed.map((r) => ({ ...r.finding, verdict:r.verdict, duplicateCount:r.duplicateCount })),
  sweeps, notExaminedSweeps, inconsistentSweeps, uncoveredTargets, residualRisks,
}
