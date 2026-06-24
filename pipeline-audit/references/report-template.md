# Report template

The audit's deliverable is a single self-contained HTML report. Triangulate the
three workflow outputs (WF1 skills · WF2 corpus · WF3 sessions) into it — the value
is in where the three **converge**, not three reports stapled together.

## How to generate the file (respect the project's style)

1. **If `discover_project.py` found a scaffold tool** (`scaffold.tool`): use it so
   the report inherits the project's theme, TOC, and badges. Example seen in the
   wild: `node .claude/scripts/docs-html/scaffold.mjs audit <report_dir>/<YYYY-MM-DD>-pipeline-skills-audit.html "Audit du pipeline …"`,
   then fill the `docs-content` body with the sections below. Write the file into
   `discover_project.py → report_dir` (e.g. `docs/audits`). If the project tracks
   docs in a path map, add/refresh its entry and run the project's docs-map check.
2. **If no scaffold tool**: emit a clean, self-contained HTML (inline `<style>`, no
   external assets) with the same section structure. Keep it premium-plain:
   readable max-width column, system font stack, subtle table borders, a sticky TOC
   is optional. Don't invent a heavy framework.
3. **If the project blocks Markdown in its docs dir** (a common hook): never write
   `.md` there — HTML only.

## Section structure (in order)

Mirror the question the audit answers at the top: *do the skills produce
specs/designs/plans good enough that fresh implementers execute correctly — without
guessing, asking, or deviating — and if not, what to fix?*

1. **Méthode & périmètre** — a 3-row table (one per workflow): corpus + method +
   agent count. State the fixed 14-dimension grid (7 design + 7 plan) in one line.
2. **Verdict** — the headline answer in 2–3 sentences, then a grades table: overall
   pipeline health, design-artifacts grade, plan-artifacts grade, and a letter grade
   per audited skill with a one-line reading. Lead with the honest bottom line
   (e.g. "rarely ships wrong, but pays quality in rework, not first-time-right").
3. **Trajectoire de maturité** — chronological theme scores (from WF2). If low
   scores cluster in OLD themes and recent themes are high, say so loudly — a
   self-healing pipeline is the most important finding and a global average hides it.
   Include the single worst historical case as an instructive example.
4. **Triangulation** — a table: one row per question, one column per workflow
   (WF1/WF2/WF3), showing how the three methods converge. Add the **calibration
   nuance** explicitly: raw regex signals overstate friction; state WF3's % real
   defect vs healthy process.
5. **Constats — étage DESIGN** — bulleted findings against the design generator,
   ordered by leverage, each `[severity]` tagged with evidence.
6. **Constats — étage PLAN** — same, for the plan generator.
7. **Constats — étage EXÉCUTION** — same, for the executor/TDD skills.
8. **Constat transverse** (if it emerges) — cross-cutting themes the three legs
   share (e.g. a "green tests / broken reality" gap where the verification strategy
   proves the wrong thing). Optional — include only if evidenced.
9. **Ce qui marche déjà (à ne pas casser)** — the strengths, evidenced. A credible
   audit names what's working, not only gaps; it also stops a reader from "fixing"
   a load-bearing guard.
10. **Recommandations priorisées** — the payload. A numbered table: `#`, faulty
    skill, the change, the pain it removes (with evidence), leverage (high/med).
    Dedupe across the three workflows. Close with a **meta-recommendation** naming
    the shortest causal chain of fixes. Recommendations are PROPOSED, not applied —
    say that, and route skill changes through the project's governance path
    (e.g. a runtime-sync skill) for Claude/Codex parity.
11. **Limites de l'analyse** — NON-NEGOTIABLE. An honest audit states its own
    weaknesses or it is propaganda. Cover at minimum:
    - **Sampling:** all transcripts were mined deterministically, but only the
      top-N highest-friction were deep-read; session conclusions rest on extracted
      dossiers, not full re-reads. Note any out-of-disk/missing transcript.
    - **Coarse regex signals:** ranking only, not conclusions — the deferral/
      resumption buckets are inflated by healthy backlog + TDD process.
    - **Self-assessed severities:** the agents graded their own findings; strong
      evidence that gates catch defects pre-merge, but this does NOT prove the
      absence of un-logged friction.
    - **Not applied:** this is an audit; no recommendation was implemented here.

## Tone

Honest over flattering. Every claim carries evidence (a quote, a file, a count, a
score). Severities and grades are the agents' own judgment — label them as such.
Prefer "B — strong but not gated" over an unexplained letter. Match the user's
language (the example deliverable is in French).
