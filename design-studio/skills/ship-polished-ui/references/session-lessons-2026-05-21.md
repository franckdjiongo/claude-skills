# Session Lessons — 2026-05-21 Brillance Décor UI Polish

This file continues `session-lessons-2026-05-04.md` with bugs from a later session. Same format: **symptom**, **root cause**, the **diagnostic that should have run earlier**, the **fix that worked**, and the **generalized takeaway**. Read these to keep the abstract checklist grounded in real failures.

---

## Bug 5 — Product detail page overflowed the viewport on mobile

### Symptom

In the rental catalogue, tapping "En savoir plus" on a product opened the detail view. On a phone-width viewport the product image, the "Ajouter au devis" CTA, and the description text all spilled off the right edge of the screen — the whole page was wider than the viewport. The catalogue *grid* page was fine on mobile; only the detail view broke. The user caught it. The verification pass that preceded it **had** exercised the detail view — but only at desktop width.

### Root cause

The detail layout was `<div className="grid lg:grid-cols-2 gap-8">`. `lg:grid-cols-2` sets two columns **only** at the `lg` breakpoint and up. Below `lg` there was no explicit `grid-template-columns` at all, so the grid fell back to a single implicit `auto` track.

A CSS Grid `auto` track is sized to its content's *max-content* — and an `<img>` contributes its full intrinsic width as max-content. The track, and therefore the whole layout, blew out far past the viewport. Every `width: 100%` child (image, CTA, description) then stretched to that oversized track.

The catalogue grid page didn't have the bug because *its* grid declared an explicit base column (`grid-cols-2`), and Tailwind's `grid-cols-N` compiles to `repeat(N, minmax(0, 1fr))` — the `minmax(0, …)` lets the track shrink to the container.

### Diagnostic that should have been run earlier

**The Section 8 responsive sweep.** The detail view is *interaction-reached* — you click "En savoir plus" to get there. It was exercised in Section 5 (interactive states) at desktop. The mobile pass that followed checked the URL-reachable surfaces — home, catalogue grid, banner pages — but never re-opened the detail view at phone width. One check of `document.documentElement.scrollWidth === clientWidth` on the detail page at 375 px would have flagged it in seconds.

This bug is the reason Section 8 was rewritten from an optional "edge cases" afterthought into a non-negotiable ★ sweep that explicitly re-triggers interaction-reached views at every viewport.

### Fix that worked

Add an explicit base column: `grid grid-cols-1 lg:grid-cols-2 gap-8`. `grid-cols-1` is `repeat(1, minmax(0, 1fr))`; the `minmax(0, …)` minimum lets the single mobile track shrink to the container width instead of expanding to the image's intrinsic width. The desktop two-column layout is unchanged.

### Generalized takeaways

1. **An interaction-reached view tested at one viewport is not tested.** Modals, drawers, detail pages, popovers — resizing the browser does not re-open them. Either redo the interaction at each viewport, or you have only verified the viewport you happened to be in.
2. **A responsive grid needs an explicit base column.** `lg:grid-cols-2` (or `md:`, `xl:`) with no base `grid-cols-1` is a latent mobile-overflow bug: below the breakpoint the grid is an unconstrained `auto` track. Always pair a breakpoint-scoped `grid-cols-N` with an explicit base `grid-cols-1`.
3. **`scrollWidth > clientWidth` is the one-line overflow test.** Run it on every surface at every viewport in the sweep — it is objective and instant, where a screenshot can be ambiguous (and screenshot tooling sometimes letterboxes or rescales, which looks like clipping when there is none).

---

## Meta-lesson — a linear checklist hides a two-dimensional job

The 2026-05-04 lessons were all about *looking harder* at a single surface — scroll it, zoom it, click it. This bug is different in kind: every individual check was sound, the surface *was* looked at — just at the wrong viewport.

A checklist is a list, and a list is run top to bottom once. But verification is a **matrix**: (every surface) × (every viewport) × (theme, key states). Run the list once and each surface gets tested at whatever viewport you were in when you reached it. URL-reachable pages tend to get the viewport sweep because they are cheap to revisit; interaction-reached views get whatever viewport they were born at in Section 5, and no other.

Section 1 (scope) now asks you to write the matrix down and flag the interaction-reached surfaces. Section 8 (responsive sweep) now walks that matrix on purpose. The fix for "I forgot to test the modal on mobile" is not "try harder next time" — it is to make the matrix explicit, so the empty cell is visible to *you* before the user finds it.
