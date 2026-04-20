# Anti-patterns and Adoption

This reference gives you the diagnostic patterns for *existing* codebases (anti-patterns with symptoms/cause/remediation) and the playbooks for *adopting* DDD — greenfield minimum viable, brownfield strangler fig, and team onboarding. Use it whenever the user says "our code is a mess", "we have an anemic model", "how do we introduce DDD here?", "we can't rewrite — how do we migrate?", or when reviewing a PR for design drift.

## Table of contents

- 1. Anti-patterns (fifteen of them, with remediation)
- 2. Code-review signals of anemic drift
- 3. Greenfield — minimum viable DDD (4-week roadmap)
- 4. Brownfield — Strangler Fig + ACL + incremental extraction
- 5. Team onboarding sequence

---

## 1. Anti-patterns

For each: **symptoms**, **root cause**, **remediation**.

### 1.1 Anemic Domain Model (Fowler, 2003)

- **Symptoms.** Entities with only getters/setters; logic lives in `*Service` classes; validation in controllers.
- **Cause.** Database-first thinking; framework scaffolding; fear of "real" OO.
- **Remediation.** Move rules into aggregate methods; make setters private; start with value objects for every domain concept.

### 1.2 God Aggregate

- **Symptoms.** One aggregate with dozens of collections; contention hotspots; deadlocks; long loads.
- **Cause.** Transactional fear; copying the ER model.
- **Remediation.** Split along invariant boundaries; replace object refs with IDs; coordinate via events.

### 1.3 Generic Repository

- **Symptoms.** `IRepository<T>` with CRUD; everything treated identically.
- **Cause.** Premature abstraction; framework tutorial copy.
- **Remediation.** One repository per aggregate; methods named in ubiquitous language.

### 1.4 Leaky Repository

- **Symptoms.** Callers write `orders.Query().Where(...)` outside the repository.
- **Cause.** Returning `IQueryable` / ORM cursors.
- **Remediation.** Return materialized results; specifications at the domain layer; projections at the query side.

### 1.5 Infrastructure leaking into the domain

- **Symptoms.** ORM attributes on aggregates; `DbContext` in the domain; framework inheritance.
- **Cause.** Convenience; tutorials.
- **Remediation.** Keep the domain a pure module; map at the edge; use owned types/value converters in the infra layer.

### 1.6 Framework coupling

- **Symptoms.** Domain classes inherit from MediatR, ASP.NET, NestJS base classes.
- **Cause.** Generator-driven code.
- **Remediation.** Invert the dependency — frameworks call your domain, not the other way round.

### 1.7 DDD-Lite

- **Symptoms.** Tactical patterns (Entity/Aggregate) without bounded contexts or ubiquitous language.
- **Cause.** Reading only chapter 5 of the Blue Book.
- **Remediation.** Do the strategic work first; tactical patterns on the wrong boundary amplify pain.

### 1.8 Premature abstraction

- **Symptoms.** Interfaces with one implementation; mediators and buses for a 5-entity app.
- **Cause.** Cargo culting architecture.
- **Remediation.** Start concrete; extract abstractions when a second implementation or a real seam appears.

### 1.9 Entity-per-table thinking

- **Symptoms.** Aggregate names match table names; changes require cross-aggregate transactions.
- **Cause.** Database-first modeling.
- **Remediation.** Model invariants first, then map.

### 1.10 Primitive obsession

- **Symptoms.** `string customerId`, `decimal amount` everywhere; same value validated in many places.
- **Cause.** Skipping VOs.
- **Remediation.** Create VOs for every domain concept with rules.

### 1.11 Smart UI / Transaction Script masquerading as DDD

- **Symptoms.** Business logic in controllers or UI callbacks; "DDD" decoration names but no model.
- **Cause.** Pressure to ship; no domain expert.
- **Remediation.** Either accept Transaction Script and stop pretending, or invest in the model.

### 1.12 Shared database across contexts

- **Symptoms.** Two services SELECT from the same table.
- **Cause.** "Efficiency."
- **Remediation.** Replicate via events/projections; give each context its own schema.

### 1.13 Event sprawl / event soup

- **Symptoms.** Hundreds of vaguely-named events; unclear ownership; cyclic subscriptions.
- **Cause.** No event governance; domain events used as integration events.
- **Remediation.** Document event ownership; split domain vs. integration events; version them; introduce schema registry.

### 1.14 Double write without outbox

- **Symptoms.** Message broker has events that the DB doesn't reflect, or vice versa.
- **Cause.** `save()` + `publish()` in sequence without atomicity.
- **Remediation.** Outbox table written in the same transaction, dispatcher process.

### 1.15 CRUD-as-DDD

- **Symptoms.** Commands named `UpdateOrder` with every field optional; no business vocabulary.
- **Cause.** Form-driven design.
- **Remediation.** Name commands by intent (`ShipOrder`, `ApplyDiscount`); map UI to intent.

---

## 2. Code-review signals of anemic drift

Use this on any PR in any existing project. Any one of these is yellow; several are red:

- Public setters or public fields on aggregates.
- Behavior in `*Service` that should be on an aggregate or VO.
- Validation duplicated across layers.
- Primitive parameters for domain concepts (`string email`).
- Getters exposing mutable collections.
- Lazy-load navigation across aggregate boundaries.
- Tests verifying only property round-trips, not behavior.
- Commands shaped like DTOs (`UpdateXyzRequest` with every field).

Checklist form:

- [ ] No public setters on aggregates.
- [ ] No primitive types where a VO exists.
- [ ] Validation is inside constructors/behavior, not in controllers.
- [ ] Commands are named by intent, not by resource.
- [ ] `*Service` classes do not contain invariant enforcement.
- [ ] Collections exposed as read-only.
- [ ] Events are past tense.
- [ ] Tests exercise behavior, not property setters.
- [ ] No ORM or framework types in the domain namespace.
- [ ] No lazy-loaded navigation across aggregate boundaries.

---

## 3. Greenfield — minimum viable DDD

First iteration focuses on **language and boundaries**, not ceremony.

1. **Week 1.** Big-picture EventStorm with stakeholders. Produce a first draft context map and glossary.
2. **Week 2.** For the first 1–2 contexts: process-level EventStorm. Identify 2–4 aggregates.
3. **Week 3.** Write value objects for every domain term with rules. Write the first aggregate with its invariants. In-memory repository. Application service. Test with Given/When/Then.
4. **Week 4.** Choose persistence. Build mappers. Wire one end-to-end command + query through the real adapter.
5. **Ongoing.** Keep the glossary and context map next to the code; update both in every PR that changes language.

**Defer**: event sourcing, full CQRS, process managers, sagas, broker, message bus — until a concrete need appears.

Why defer? Khononov: *"Strategic DDD always pays off at system-of-systems scale; tactical DDD is optional."* Fancy patterns before clarity on boundaries = premature abstraction.

---

## 4. Brownfield — introducing DDD progressively

The standard recipe — **Strangler Fig + ACL + incremental extraction** (Martin Fowler, *StranglerFigApplication*, 2004):

### 4.1 The sequence

1. **Map the current reality.** Context map of the legacy system (often a Big Ball of Mud). Identify seams (Feathers).
2. **Pick a thin slice with high business value.** Use a Core Domain Chart to find a high-differentiation, high-complexity slice.
3. **Wrap the legacy with an ACL.** New code talks to the ACL only; the ACL translates to the legacy's language.
4. **Build the new context beside the old.** Dual-write via outbox; reconcile.
5. **Flip traffic gradually.** Feature flags or routing rules.
6. **Retire the old slice.** Delete legacy code once it's dark.
7. **Repeat** on the next slice.

### 4.2 Supporting techniques

- **Branch by Abstraction** — introduce an interface, switch implementations behind it, delete the old implementation when safe.
- **Expand/contract** for database changes — add the new column/table, dual-write, backfill, read from the new place, drop the old.
- **Feature toggles** for runtime switching — route a percentage of traffic, roll forward or back quickly.

### 4.3 EventStorming on legacy vs. greenfield

- **Legacy.** Storm the *as-is* first: discover the undocumented process, surface hotspots, then storm the *to-be*. The delta is your modernization backlog (Tune, *Architecture Modernization*, Manning, 2024).
- **Greenfield.** Skip straight to the *to-be* but use concrete examples to keep the storm honest.

### 4.4 What *not* to do

- Do not "fix in place" a Big Ball of Mud. Recognize it, wall it off with an ACL, strangle it.
- Do not rewrite the whole system at once.
- Do not let the new context inherit the legacy's vocabulary.
- Do not skip the context map on the as-is — you will lose the argument for budget without it.

---

## 5. Team onboarding sequence

A tested sequence (from the reference):

1. **Reading.** Vernon's *DDD Distilled* (1–2 days). Khononov's *Learning DDD* Parts I–III (week 1).
2. **Vocabulary kata.** Take the team's product and write the glossary together.
3. **EventStorming workshop.** Half-day big picture, half-day process level on one subdomain.
4. **Code kata.** Implement one aggregate with VOs, events, in-memory repo, and tests.
5. **Pair on a real slice.** Mix senior/junior.
6. **Establish reviews** for anemic drift (see §2).
7. **Maintain living artifacts** — glossary, context map, ADRs for boundary decisions.

### Artifacts produced at each step

| Step | Artifact |
|---|---|
| Big Picture ES | Photographed timeline + list of domain events |
| Process ES | Aggregate candidates, hotspots, policies |
| Context mapping | Context map + Bounded Context Canvas per context |
| Modeling | Glossary, aggregate list, invariant list |
| Implementation | Tests, ADRs, code |

### How to keep artifacts alive

- Glossary and context map live **next to the code**, not on a wiki.
- Update them in any PR that changes domain language or boundaries.
- Teach every reviewer to block PRs where code language drifts from the glossary without a glossary update.
- Run a **quarterly re-classification** of subdomains (core/supporting/generic) — subdomains migrate, especially during market shifts.

---

## Primary sources for this section

- Fowler, *"AnemicDomainModel"*, martinfowler.com, 2003.
- Fowler, *"StranglerFigApplication"*, martinfowler.com, 2004.
- Feathers, *Working Effectively with Legacy Code*, Prentice Hall, 2004.
- Tune & Uludağ, *Architecture Modernization*, Manning, 2024.
- Vernon, *Domain-Driven Design Distilled*, Addison-Wesley, 2016 (for onboarding).
- Khononov, *Learning Domain-Driven Design*, O'Reilly, 2021.
- Brandolini, *Introducing EventStorming*, Leanpub, 2021.
- Bogard, *jimmybogard.com* — domain vs integration events and outbox posts.
