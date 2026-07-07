---
name: brain-capture
description: >
  Extract 0-3 candidate memories (facts/decisions/preferences/lessons/routines/
  conventions worth remembering long-term) from the session that is about to
  end, and submit them to the Second Brain via its CLI, with deterministic
  scope resolution and full reliance on server-side semantic dedup. Use this
  skill when the global Stop hook (~/.claude/hooks/brain-capture-stop.mjs)
  blocks a session end under ~/Desktop/my-projets and instructs you to invoke
  it — this is the ONLY normal trigger, it is not user-invoked. Do not use
  this skill speculatively mid-session or for projects outside
  ~/Desktop/my-projets.
---

# Brain Capture

Second Brain (plan §08, V3) captures durable knowledge automatically at the end of every session under `~/Desktop/my-projets`, so decisions/lessons/preferences don't only live in a transcript that gets discarded. This skill is invoked once, right before the session actually stops, by the global Stop hook — never speculatively.

## Step 1 — Decide if there's anything worth capturing

Reflect on the session that just happened (you already have it in context — no need to re-read transcript files). Extract **0 to 3** candidate memories, one of these `kind`s each:

- `fait` — a fact learned about the user, a system, a codebase.
- `préférence` — a stated preference (tooling, style, workflow).
- `décision` — an architecture/product/process decision and its rationale.
- `leçon` — a lesson learned from a bug, an incident, a wrong assumption.
- `routine` — a recurring workflow/procedure worth remembering.
- `convention` — a project- or user-specific convention.

Bar for inclusion: would this matter to a future session that has no memory of this one? Routine tool calls, one-off debugging noise, or anything already captured earlier this same session do NOT qualify. **0 candidates is a normal, expected, and equally valid outcome** — most sessions won't produce anything durable. Never pad the count to hit a target.

## Step 2 — Resolve scope deterministically (never invent, never widen)

This is a fail-safe boundary, not a judgment call:

1. Take the `cwd` reported by the hook (in its block reason).
2. Look up whether that `cwd` maps to a known project: run
   `bun run --cwd /Users/elmabi/Desktop/my-projets/second-brain cli/index.ts project list --limit 200`
   and check each row's context — a project is a match if its `repoPath` equals `cwd`, or (if `repoPath` is unset) if its `slug` equals the kebab-case name of the directory immediately under `~/Desktop/my-projets` that `cwd` is inside of.
3. **Match found** → inherit that project's `scope` and pass `--project <slug>` on every `remember` call below.
4. **No match** → scope is **`personnel`** (the most restrictive), no `--project`. Never fall back to `public`/`professionnel` without an explicit project match — an unmapped repo defaults to the safest scope, exactly so a stray capture on an unknown/new project never leaks past an approval gate.

Do not ask the user to disambiguate mid-capture — resolve deterministically per the rule above and move on. If the project genuinely needs a corrected `kind`/`scope`, that's a weekly-review fix, not this skill's job.

## Step 3 — Submit each candidate via the CLI

For each candidate (in the order extracted), run:

```
bun run --cwd /Users/elmabi/Desktop/my-projets/second-brain cli/index.ts remember "<text>" \
  --kind <kind> --scope <scope> [--project <slug>] [--tags <csv>] [--confidence <0..1>]
```

Do not pre-filter for duplicates yourself — `remember` already does semantic dedup server-side (vector similarity ≥ 0.92, same scope/kind/project) and will report `skipped_duplicate` on its own; trust it and move on to the next candidate. Do not retry a failed submission more than once; if it errors, log it as a `submitted=false` case for step 4 and continue — a capture failure must never block the session from stopping.

## Step 4 — Log the run (mandatory, even at 0 candidates)

Once all candidates have been attempted, ALWAYS run exactly one:

```
bun run --cwd /Users/elmabi/Desktop/my-projets/second-brain cli/index.ts capture-log \
  --candidates <N> --submitted <M> [--project <slug>]
```

`N` = candidates extracted in step 1 (may be 0). `M` = how many actually reached a `direct`/`pending`/`skipped_duplicate` outcome in step 3 (excludes hard failures). This writes an `audit_events` row (`tool: "brain-capture"`, `client: "claude-code"`) so a 0-memory pass is visible and auditable, never silent — this is what the V3 acceptance criterion "5/5 sessions trigger brain-capture, verifiable in audit_events" checks against.

## Step 5 — Stop normally

After step 4, the capture pass is complete. End your turn as you normally would — the Stop hook's `stop_hook_active` guard ensures it will not block you again this turn.
