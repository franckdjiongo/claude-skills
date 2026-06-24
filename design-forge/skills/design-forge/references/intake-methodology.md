# Intake Methodology — Extracting Design Intent from a Non-Designer

How BRIEF mode pulls real design intent from a user who builds excellent backends but has zero design vocabulary. The user reacts to products and states functional facts; the agent translates and decides. Never ask "what design system?" or "serif or grotesque?" — that yields blank stares and erodes trust.

## Table of Contents
- [Core Principle](#core-principle)
- [The Intake Questions That Work](#the-intake-questions-that-work)
- [Plain-Language → Design Translation Table](#plain-language--design-translation-table)
- [The Four Functional Facts That Decide Visual Direction](#the-four-functional-facts-that-decide-visual-direction)
- [Inherit Conventions Once the Category Is Known](#inherit-conventions-once-the-category-is-known)
- [The Sensible-Defaults Rule — Ask Only the Irreducible Unknowns](#the-sensible-defaults-rule--ask-only-the-irreducible-unknowns)
- [Reframing Conflicting Desires](#reframing-conflicting-desires)
- [Intake Anti-Patterns](#intake-anti-patterns)

---

## Core Principle

Extract intent through **products the user already reacts to** and **functional facts that carry design implications** — not through design terminology. The agent owns the translation; the user never needs a single design word. The whole intake should resolve in `~4–5 questions` maximum.

---

## The Intake Questions That Work

Ask these in plain language. Each maps a casual answer onto a design decision the agent will make. Pick the few that are still unknown after reading the user's description — never ask all of them mechanically.

| Question (vocabulary that works) | Why it reveals design intent |
|---|---|
| "What apps do you admire the look of?" (NOT "what design system?") | Anchors to reference products the LLM has dense training data for — the single highest-leverage steering input. Feeds reference anchoring per `references/refinement-and-systems.md`. |
| "When someone opens this, should it feel calm and focused, or energetic and lively?" | Extracts **emotional tone** — the irreducible aesthetic axis the agent cannot infer from category alone. |
| "Is this something people use all day for work, or something they visit occasionally?" | Separates **tool-density** (instrument-panel, compact, restrained) from **marketing-polish** (airy, expressive, hero-led). |
| "Do your users care more about seeing a lot of information at once, or about a clean, simple screen?" | The **data-density axis** — whitespace-led vs instrument-panel. |
| "Light, dark, or both?" and "Phone, desktop, or both?" | Surface theme and primary device — both change layout and elevation decisions and cannot be safely assumed. |
| "Who uses it — experts who want speed and shortcuts, or first-timers who need hand-holding?" | **Expertise level → affordance density**: keyboard shortcuts, command palette, compact rows vs visible labels and guidance. |

---

## Plain-Language → Design Translation Table

When the user offers a vague descriptor, do NOT pass it through to the development LLM (see anti-patterns). Translate it into concrete direction the agent prompts toward. Express the result in natural language per `references/spec-language.md`; choose the matching archetype per `references/archetype-library.md`.

| User says | Agent hears (and prompts toward) |
|---|---|
| "clean" | minimal, generous whitespace, restraint, few elements per screen |
| "professional" | structured hierarchy, clear type scale, conservative palette, alignment discipline |
| "modern" | contemporary type pairing, subtle purposeful animation, flat surfaces, tight tracking |
| "premium" / "high-end" | refined micro-details, restrained palette, one accent rationed, light font weights, considered spacing |
| "fun" / "friendly" | warm colors, rounded forms, playful micro-interactions, illustrative touches |
| "powerful" / "serious" | data density, monospace accents, dark instrument-panel surfaces, tabular numbers |
| "trustworthy" | high-contrast legible text, transparency cues, calm spacing, conservative color |

Note: "modern," "nice," and "clean" are exactly the vague descriptors the model fills with its slop defaults if left untranslated. Always convert to specifics; see `references/anti-slop-rules.md` for the slop fingerprint these defaults produce.

---

## The Four Functional Facts That Decide Visual Direction

These four facts settle most of the visual direction **before any aesthetic talk**. Establish them first, then layer emotional tone on top.

1. **Data density** — "a few things" vs "everything at once" → whitespace-led vs instrument-panel.
2. **User expertise** — novice vs power user → visible labels and guidance vs keyboard shortcuts, command palette (`⌘K`), compact rows.
3. **Primary device** — phone-first pushes primary actions into the thumb zone and uses bottom sheets; desktop-first allows sidebars and dense tables.
4. **Content type** — long-form reading (editorial type, comfortable measure `~65–75` chars) vs numeric/financial (tabular figures, aligned columns) vs media (galleries, cropping).

---

## Inherit Conventions Once the Category Is Known

Once the application category is identified (dashboard, landing page, docs, e-commerce, admin, content platform, data-table app, form-heavy app, mobile web app), inherit its default archetype and expected component patterns instead of asking about every screen element. This is how the agent avoids interrogating the user about navigation, tables, modals, etc.

Category → archetype → expected-patterns mapping lives in `references/application-templates.md`. The archetypes themselves are defined in `references/archetype-library.md`.

---

## The Sensible-Defaults Rule — Ask Only the Irreducible Unknowns

**Ask only about the irreducible unknowns. Decide everything else from category conventions and state the decision.**

The irreducible unknowns — the four things the agent genuinely cannot infer:

1. **Emotional tone** (calm vs energetic)
2. **Light / dark / both**
3. **Primary device** (phone / desktop / both)
4. **One reference product** the user admires

For everything else, decide and announce it so the user can veto without having to originate it:

> "I'll use a calm editorial direction with a single warm accent — tell me if you want something bolder."

This mirrors the pin-it-yourself rule from Anthropic's frontend-design skill: if the brief does not pin down the product/subject, the agent names one concrete subject, its audience, and the page's single job, and states that choice rather than asking. Resolve trivia yourself; reserve questions for the four unknowns above.

Optional closing tactic (borrowed from the Lovable plan-mode workflow): end intake with "Ask me anything you need to fully understand what I want" — but the agent should still resolve trivia itself rather than turn that into an interrogation.

Hand the resolved decisions to the brief structure per `references/prompt-structure.md`; persist them as a design-intent file per `assets/design-intent-template.md`.

---

## Reframing Conflicting Desires

When the user states an apparent contradiction, reframe it as a solvable design problem rather than pushing back. The canonical case:

- **"Minimal but feature-rich"** is NOT a contradiction — it is an **information-density challenge** solved by **progressive disclosure**. Reframe it back to the user:

> "We'll keep the surface calm and uncluttered, but make everything reachable through progressive disclosure — a command palette, expandable panels, and good defaults — so it feels simple but does a lot."

Linear is the canonical proof that high density and visual calm coexist; cite it as the existence proof when reassuring the user.

---

## Intake Anti-Patterns

- **No jargon questions.** Never ask "what's your border-radius preference?" / "serif or grotesque?" / "what design system?" The user cannot answer and it erodes trust.
- **Never pass through "make it modern / nice / clean."** That vague descriptor is exactly the gap the model fills with its defaults (Inter, indigo gradient, three rounded cards). Translate it via the table above before it reaches the development LLM.
- **Don't over-interrogate.** More than `~4–5` questions and the senior developer disengages. Ask the irreducible unknowns, decide the rest, state your decisions.
