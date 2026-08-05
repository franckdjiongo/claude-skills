---
name: lexicon-capture
description: >
  Analyze the voice-dictated prompts of the session that is about to end, spot
  0-N recurring mis-transcriptions (proper nouns, tools, jargon the speech-to-text
  keeps getting wrong), and submit each as a candidate correction to the
  workstation Lexique via its CLI, then ALWAYS log the pass (even at 0). Use this
  skill when the global Stop hook (Claude: ~/.claude/hooks/lexicon-capture-stop.mjs;
  Codex: ~/.codex/hooks/lexicon-capture-stop.mjs) blocks a session end
  because the session contained dictation-prefixed prompts and instructs you
  to invoke it — the ONLY normal trigger; do not use it speculatively mid-session.
---

# Lexicon Capture

> Source de vérité : `workstation/.claude/skills/lexicon-capture/` — ne pas éditer ici.

The workstation Lexique corrects voice-dictated prompts (the global
`transcription-clean.mjs` hook applies it on every dictated prompt). Source
of truth: `~/Desktop/my-projets/workstation/data/lexicon/lexicon.json`. This
skill closes the loop at end of session: propose mis-transcriptions the
current lexicon did NOT yet catch, for human approval in the workstation
"Lexique" tab. Full doctrine (marker list, ambiguity bar, confidence
guidance): `/Users/elmabi/Desktop/my-projets/workstation/docs/lexique.md`.

## Step 1 — Find the dictated prompts of THIS session

Already in context — no re-read of the transcript needed. Keep only prompts
that started with a dictation marker (`tt`, `transcrit`, `transcrite`,
`transcription`, `transcribed`, `transcript`, `dictee`/`dictée`,
`dicte`/`dicté`, `voix`, `voice`) and/or arrived with a "🎙️ transcription
cleaned" system notice. Ignore typed prompts entirely.

## Step 2 — Spot recurring mis-transcriptions (0-N candidates)

Bar for inclusion, ALL must hold: recurring/reusable (not a one-off slip);
not already caught (`cd ~/Desktop/my-projets/workstation && bun run lexicon
entries` first); a real correction (`from`/`to` differ, both non-empty);
unambiguous source term — THINK, don't map word-for-word: simulate 2-3 other
sentences that could plausibly contain `from` — if any is legitimate as-is,
a bare mapping would corrupt it. A real French/English word or natural
phrase is NEVER acceptable as a bare `from` (see the canonical
« gold »/« goal » counter-example in the doc above); anchor ambiguous
corrections in a multi-word disambiguating phrase, or skip and rely on
in-session contextual self-correction. **0 candidates is normal — never pad
the count.**

## Step 3 — Submit each candidate via the CLI

```
cd ~/Desktop/my-projets/workstation && bun run lexicon propose "<from>" "<to>" \
  --confidence <0..1> [--context "<phrase or rationale>"] [--source-session <id>]
```

`--confidence`: clear proper noun ≈ 0.9, plausible-but-uncertain ≈ 0.4, a
contextualized ambiguous-word entry caps at ≈ 0.6 (and its `--context` MUST
name the ambiguity). Never resolve/approve proposals yourself — that's the
human's job in the "Lexique" tab. Don't retry a failed `propose` more than
once; count it as not-submitted and move on.

## Step 4 — Log the run (mandatory, even at 0 candidates)

```
cd ~/Desktop/my-projets/workstation && bun run lexicon capture-log \
  --candidates <N> --submitted <M> [--source-session <id>]
```

Then `touch ~/.claude/.lexicon-capture-last-run` (starts the 30-min debounce window, even at 0 candidates).

## Step 5 — Stop normally

Capture pass complete. End your turn as usual — the Stop hook's `stop_hook_active` guard prevents a second block this turn.
