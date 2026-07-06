# Session Lessons — 2026-05-31 Temps Chantier docs HTML elevation

Continues `session-lessons-2026-05-04.md` and `session-lessons-2026-05-21.md`. Same format: **symptom**, **root cause**, the **diagnostic that should have run earlier**, the **fix that worked**, **generalized takeaways**.

These two are different in kind from the earlier bugs: **nothing rendered incorrectly.** No overflow, no clipping, no regression, clean in light and dark, holds across viewports. Both passed every correctness check — and the user bounced them back anyway, because they were *ergonomic* failures. They are the reason the checklist now has a Section 10 (Reading & interaction ergonomics).

---

## Bug 6 — Navigation chrome crowded the reading column

### Symptom

A documentation theme: a left TOC sidebar plus a centered reading card. The migration + premium restyle shipped and passed the full correctness pass — no overflow, clean themes, tables intact, nav working. The user's first reaction was not "it's broken," it was: *"le TOC prend trop de place et je n'ai pas assez de real estate pour la lecture."* The reading column was ~660px while the TOC (280px) plus a ~64px gutter consumed roughly a third of the horizontal space.

### Root cause

The layout tokens were never tuned for the **content-to-chrome balance**. `--toc-w: 17.5rem`, a gutter that clamped up to `4rem`, and a reading card that — on the user's viewport — ended up narrower than the chrome beside it. Each value was individually defensible; the *ratio* was wrong, and nothing in the QA pass measured the ratio. Correctness QA has no opinion about whether 35% of the width should be a sidebar.

### Diagnostic that should have been run earlier

The **reading-ergonomics check** (Section 10): measure the reading column's character count and the chrome-to-content ratio. The prose measure was ~66ch (borderline), but the real signal was that a third of the width was navigation chrome while the payload felt cramped. The damning detail: the agent had **already measured `proseW=663, content=759` mid-session and written in its own reasoning that "the fix would be to narrow the TOC or reduce the gap" — then shipped without doing it.** The deficiency was diagnosed and shelved. This was not a perception failure; it was a follow-through failure.

### Fix that worked

Rebalance the tokens: `--toc-w 17.5→14.5rem`, gutter `4→2.5rem` max, reading measure `44→47rem`, card `58→64rem`. The reading column went 663→752px (~76ch); the TOC went 280→232px. Pure CSS, no structural change, applied to every page on reload.

### Generalized takeaways

1. **Correctness QA and ergonomics QA are different jobs.** "No bug" is not "comfortable to read." A page can pass overflow/clip/regression/viewport checks and still waste the user's reading space.
2. **Measure the chrome-to-content ratio, not just "does it fit."** Individually sane widths compose into a bad ratio. Ask what fraction of the width the user actually reads in.
3. **A self-diagnosed fix you don't apply is a guaranteed bounce-back.** If your own reasoning names the fix, apply it or surface it — do not ship a flaw you already saw.

---

## Bug 7 — A dense table forced horizontal scrolling for every row

### Symptom

A 6-column traceability matrix (~1666px of prose + code-reference cells) sat in a ~940px card. It scrolled horizontally — correctly: no page overflow, identifiers intact, scrollbar present. The agent had explicitly decided "scroll, don't shred" was acceptable and defended it at length in its reasoning. The user disagreed: *"quand les tables sont longues horizontalement … je dois scroller horizontalement à chaque fois pour tout lire — tu me proposes quoi ?"* Reading across every row meant panning left-right, over and over.

### Root cause

The fix for an *earlier* bug — cells shredding tokens vertically (`F/U/N/C/-0/1`) because of `overflow-wrap: anywhere` in a squeezed column — was "let the table scroll instead of compress." That solved the shredding (a correctness bug) but created a **per-row ergonomic tax** on the densest tables. Horizontal scroll is fine *occasionally*; it is painful when it is required for *every* row of a reference table you read across.

### Diagnostic that should have been run earlier

The **scroll-cost check** (Section 10): for the widest element, how far must the user pan to read one row, and how often? Here it was ~700px of pan, every row — well over the threshold where "it scrolls" stops being an acceptable answer. The agent had all the numbers (table width 1666, card 940) and treated the gap as "standard horizontal scroll" rather than as friction to design out.

### Fix that worked

Two complementary, low-cost moves: (a) **freeze the identifier column** (`position: sticky; left: 0`, opaque background, divider) so the row stays anchored while the dense columns scroll — you never lose which row you're on; (b) a per-table **"⤢ Agrandir" → fullscreen modal** where the table wraps to fit the viewport width (`overflow-wrap: anywhere` *inside the wide modal only*, where columns are roomy) with zero horizontal scroll, all columns visible. CSS + a little JS, no re-render.

### Generalized takeaways

1. **A correctness fix can manufacture an ergonomic problem.** "Scroll instead of shred" fixed the shredding and introduced the panning tax. When you resolve a bug by *changing layout behavior*, re-run the ergonomics lens on the result — the new behavior has its own comfort cost.
2. **"It's standard to scroll wide tables" is a deflection when the scroll is per-row.** Offer the mitigation (sticky column / fit-to-width / expand) proactively instead of defending the compromise — the user will ask for it anyway, so propose it first.
3. **The same CSS property is right or wrong depending on the space it lives in.** `overflow-wrap: anywhere` shreds in a 110px column and reads fine in a 300px one. Don't ban or bless a property globally; tune it to the container.

---

## Bug 8 — A correct, readable component that simply wasn't premium

### Symptom

Same session, later pass. A live **plan progress bar** + status-colored TOC was built (by a `Workflow()`, then verified with this very skill) and declared "solide": it passed the full correctness sweep (no overflow at 375/768/1280, light/dark clean) **and** the Section-10 ergonomics lens (readable, didn't crowd the content). The user bounced it anyway, with three distinct complaints: *"la barre colle carrément aux bords de la page… il n'y a pas de padding"*; *"les petits ronds [de statut dans le TOC] sont complètement collés sur la ligne… ce n'est pas premium… il manque la shadow, la profondeur, les bleus"*; and *"l'avancement aurait dû être sticky — un plan peut être très long, quand je scrolle l'avancement doit rester visible… la manière dont c'est designé, c'est trop simpliste."*

### Root cause

**Two gaps the existing checklist did not name:**

1. **Visual craft ≠ correctness ≠ ergonomics.** The bar was a flat fill with no shadow/elevation while sitting next to elevated cards; it bled to the card's raw edges because it was inserted *outside* the content's padding wrapper (a direct child of `.docs-article`, not inside `.docs-content`'s `clamp()` padding); the TOC status dots were positioned at `left: 0`, kissing the text baseline. None of that fails an overflow/clip/contrast/measure check — it just looks unfinished next to the design system's real surfaces.
2. **Component intent.** A *progress* indicator's whole job is to be consulted while you work. On a 12,000px plan it scrolled off after the first screen — so it was, functionally, a header decoration. "Make it sticky" was not an enhancement to wait for; it was implied by what the component is *for*.

A compounding factor: the bar was generated by an upstream workflow and **never went through frontend-design's taste pass** — so this skill's verify phase was the *only* craft gate, and the agent gave its own un-taste-reviewed work a correctness-only pass.

### Diagnostic that should have been run earlier

The **premium-craft + intent pass** (now Section 11): put the new component next to the nicest existing element and judge depth/containment/detail/accent like a designer; and ask "what is this component *for* over a long, scrolled surface?" Both signals were visible in a single side-by-side zoom — the flat bar beside an elevated card, the dot jammed on the line — and in one mental sentence ("it's a progress bar on a long doc"). Neither needed the user.

### Fix that worked

Craft: horizontal margin matching `.docs-content`'s `clamp()` padding (stop the edge-bleed); `--shadow-md` + backdrop-blur + a top accent rail (match the card system); a recessed/inset track with gradient+glow on done segments; TOC dots moved into the gutter (`left: 0.55em`, `padding-left: 1.5em`) with a soft halo ring + status-colored left border. Intent: `position: sticky; top: 0.75rem` so progress stays visible while scrolling — then a Section-6/8 re-check caught and fixed a mobile collision with the sticky `Sommaire` toggle (`top: 4rem` on mobile). Pure CSS + a tiny scroll class toggle; landed in commit `c3825dd`.

### Generalized takeaways

1. **There are three axes, not two.** Correct (Sections 1–9), comfortable to read (Section 10), and *premium / intentional* (Section 11). A component can pass the first two and fail the third — that's the "trop simpliste" bounce. Judge craft by side-by-side comparison with the page's best element, not against "it works."
2. **Behavior is part of design.** Sticky-ness, persistence, reachability are decisions you owe a component based on what it's *for* — not features to ship flat and wait for the user to request. Ask "would this serve its purpose over a long/populated surface?" before declaring done.
3. **Work you didn't taste-pass is the most dangerous to sign off on.** When a component arrives from a workflow/generator (or an earlier you) without going through frontend-design, the verify phase is the *only* craft gate. Don't give your own un-reviewed output a correctness-only rubber stamp — that's precisely where "looks fine" hides "looks generic."

---

## Meta-lesson — three axes: correct, comfortable, premium

The 05-04 lessons were about *looking harder* at one surface — scroll it, zoom it, click it. The 05-21 lesson was about the *viewport matrix* — every surface × every viewport. The 05-31 lessons add the remaining axes: a surface can be fully **correct** (no overflow, clip, regression; holds across viewports and data) and even **comfortable to read** (Bug 6/7: good measure, balanced chrome, no per-row panning) — and *still* get bounced because it isn't **premium** (Bug 8: flat where it should be elevated, edge-hugging where it should be inset, static where it should persist). Correctness fails a `scrollWidth` assertion; ergonomics fails a reading-width measure; craft fails none of them — it only fails the side-by-side eye.

Three habits close the gaps.

**First, run the ergonomics lens** (Section 10) on any surface meant for reading or scanning — and *measure* (reading width in ch, chrome ratio, scroll cost), don't vibe.

**Second, run the craft + intent lens** (Section 11) on any component you designed or restyled — compare it side-by-side with the page's best element (depth, containment, detail, accent), and ask what the component is *for* over a long, populated surface (sticky? persistent? reachable?). Especially when the component came from a generator/workflow and never got a taste pass.

**Third, close the loop on your own diagnoses.** Every bug here was visible to the agent before the user saw it — Bug 6 was *literally measured and named* in the agent's own reasoning; Bug 8's flat-vs-elevated gap was one side-by-side zoom away. The failure was not perception; it was letting a noticed problem ship because fixing it felt like scope creep, or rationalizing a known friction as "standard." If you see it, you own it: fix it this pass, or say it out loud to the user. The cheapest bug to fix is the one you already found.
