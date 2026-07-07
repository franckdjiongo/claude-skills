---
name: lexicon-capture
description: >
  Analyze the voice-dictated prompts of the session that is about to end, spot
  0-N recurring mis-transcriptions (proper nouns, tools, jargon the speech-to-text
  keeps getting wrong), and submit each as a candidate correction to the
  workstation Lexique via its CLI, then ALWAYS log the pass (even at 0). Use this
  skill when the global Stop hook (~/.claude/hooks/lexicon-capture-stop.mjs) blocks
  a session end because the session contained dictation-prefixed prompts and
  instructs you to invoke it — this is the ONLY normal trigger, it is not
  user-invoked. Do not use it speculatively mid-session.
---

# Lexicon Capture

The workstation Lexique corrects voice-dictated prompts (the global
`transcription-clean.mjs` hook applies it on every dictated prompt). Its source
of truth is `~/Desktop/my-projets/workstation/data/lexicon/lexicon.json`. This
skill closes the loop: at the end of a session that used dictation, it proposes
the mis-transcriptions the current lexicon did NOT yet catch, so a human can
approve them in the workstation "Lexique" tab. Invoked once, right before the
session actually stops, by the global Stop hook — never speculatively.

## Step 1 — Find the dictated prompts of THIS session

You already have the session in context — no need to re-read the transcript file.
Look back over the user's prompts and keep only the ones that were **dictated by
voice**: they start with a marker word (`tt`, `transcrit`, `transcrite`,
`transcription`, `transcribed`, `transcript`, `dictee`/`dictée`, `dicte`/`dicté`,
`voix`, `voice`) and/or arrived with a "🎙️ transcription cleaned" system notice.
Non-dictated (typed) prompts are out of scope — ignore them entirely.

## Step 2 — Spot recurring mis-transcriptions (0-N candidates)

Within those dictated prompts, identify words the speech-to-text got **wrong**
in a way that is **stable and reusable** — the correction should help EVERY
future dictation, not just this one:

- Mangled proper nouns / product / tool names (e.g. heard "vexcel" → meant
  "Vercel"; "koba camp" → "Cobacam"; "cloud code" → "Claude Code").
- Domain jargon the model keeps mishearing (e.g. "data verse" → "Dataverse";
  "power to mate" → "Power Automate").

Bar for inclusion, ALL must hold:

1. **Recurring / reusable** — a generic homophone or one-off slip that won't
   repeat does NOT qualify. Prefer things you saw more than once, or that are
   clearly a fixed name.
2. **Not already caught** — before proposing, check the current lexicon with
   `cd ~/Desktop/my-projets/workstation && bun run lexicon entries`. If the
   `from → to` pair (case-insensitive on `from`) is already there, skip it (the
   CLI also guards this, but don't create obvious noise).
3. **A real correction** — `from` (as mis-transcribed) and `to` (the correct
   form) differ and both are non-empty.

**0 candidates is a normal, expected, and equally valid outcome.** Most dictation
sessions won't surface a NEW reusable correction. Never pad the count — a bad
proposal costs the human a rejection click.

## Step 3 — Submit each candidate via the CLI

For each candidate (order doesn't matter), from the workstation root:

```
cd ~/Desktop/my-projets/workstation && bun run lexicon propose "<from>" "<to>" \
  --confidence <0..1> [--context "<phrase or rationale>"] [--source-session <id>]
```

- `<from>` = exactly how the dictation mis-heard it (lowercase is fine — matching
  is case-insensitive). `<to>` = the correct form to substitute.
- `--confidence` 0..1: how sure you are it's a real, reusable correction (a clear
  proper noun ≈ 0.9; a plausible-but-uncertain guess ≈ 0.4).
- `--context` optional: the phrase it appeared in, or why you think it's wrong —
  helps the human decide.
- `--source-session <id>` optional: pass the session id from the hook's block
  message (after "transcript de la session") for traceability.

Do NOT resolve/approve proposals yourself — approval is the human's job in the
"Lexique" tab. Do not retry a failed `propose` more than once; if it errors, count
it as not-submitted for step 4 and move on — a capture failure must never block
the session from stopping.

## Step 4 — Log the run (mandatory, even at 0 candidates)

Once all candidates have been attempted, ALWAYS run exactly one:

```
cd ~/Desktop/my-projets/workstation && bun run lexicon capture-log \
  --candidates <N> --submitted <M> [--source-session <id>]
```

`N` = candidates identified in step 2 (may be 0). `M` = how many `propose` calls
actually succeeded in step 3 (a `SKIPPED_ALREADY_CANONICAL` still counts as
submitted — it reached the store; only hard errors are excluded). This makes a
0-candidate pass visible and auditable, never silent — exactly the brain-capture
§4 discipline applied to the Lexique.

## Step 5 — Stop normally

After step 4, the capture pass is complete. End your turn as you normally would —
the Stop hook's `stop_hook_active` guard ensures it will not block you again this
turn.
