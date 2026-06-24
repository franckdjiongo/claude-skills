---
description: Delta protocol — designs carry a §2 delta block with ADD/MODIFY/REMOVE/RENAME verbs and origin tags; plans apply delta as Task 1
paths:
  - docs/specs/**
  - docs/plans/**
  - docs/{{PROJECT_SLUG}}-spec.html
  - docs/data-model.html
  - docs/composants/catalogue-composants.html
---

# Spec & delta protocol

Loaded when touching `docs/`. Keeps specs, code, and future designs synchronized.

## 1. Source-of-truth (append-only via approved delta)

- `docs/{{PROJECT_SLUG}}-spec.html` — FUNC, RA, VAL identifiers (product behavior).
- `docs/data-model.html` — schema, storage layout, table contracts.
- `docs/composants/catalogue-composants.html` — C-XX visual component catalog.

## 2. Designs end with a delta section

`docs/specs/YYYY-MM-DD-<topic>-design.html` ends with a `Source of truth delta` section (or `No delta — already in FUNC-NN`). Brainstorm rejects designs missing this.

### 2.1 Verbs and origin tag

Verbs (line-prefix, parsed by tooling): `ADD <id>`, `MODIFY <id>`, `REMOVE <id>`, `RENAME <old> → <new>`.

```
- ADD FUNC-21: Cart persists 30 days. <!-- origin: design -->
- MODIFY VAL-07: phone OR email. <!-- origin: client-revision YYYY-MM-DD -->
```

Allowed origin tags: `design`, `client-revision YYYY-MM-DD`, `business-rule-change YYYY-MM-DD`, `bugfix-doc-correction`.

## 3. Plans — Task 1 always applies the delta

Every plan starts with `Task 1: Apply source-of-truth delta`. Subagents reading source-of-truth files during implementation read the post-delta version. `write-plan` rejects plans where Task 1 is anything else.

## 4. Acceptance criteria are observable; plans render them as checkboxes; coverage is proven

Designs state per-behavior pass/fail conditions (the design's acceptance-criteria section), not a test *strategy*. Plans render each as a `[ ]` checkbox citing FUNC/RA/VAL/C-XX — prose acceptance criteria fall out of the executable contract. `write-plan` proves **design→tasks coverage** (every design requirement maps to a task or an explicit out-of-scope) before hand-off; this is the no-omission direction, distinct from the no-invention task→spec check.

## 9. Amendment workflow (spec-only changes)

`docs/specs/YYYY-MM-DD-amendment-<topic>-design.html` with sections 2–6 marked `N/A — amendment spec-only` and a final delta block. Plan has one BATCH task. If the change actually needs code, abort and restart as a regular brainstorm.

## 10. Things to avoid

- Editing source-of-truth files outside an apply-delta commit — open a design instead.
- Writing a design without a delta section — they always rot.
- Writing a delta entry without an `<!-- origin: ... -->` tag.
- Bundling delta apply with implementation in one commit — split via `docs(spec): apply delta from <design>`.
- Recycling a removed id — they're append-only.
