# Strategic Design

Strategic design answers: *what are the parts of this system, what does each mean, and how do they relate to each other and to the business?* It is the **first** pass; tactical DDD applied to wrong boundaries amplifies pain.

## Table of contents

- 1. The problem strategic DDD solves
- 2. Domain and subdomains — classification and heuristics
- 3. Bounded contexts
- 4. Ubiquitous Language
- 5. Context Mapping (nine patterns + decision tree)
- 6. Discovery practices — EventStorming, Domain Storytelling, Example/Story/Impact/Wardley Mapping
- 7. Strategic checklists

---

## 1. The problem strategic DDD solves

Large software systems fail not because algorithms are wrong but because **the team and the code disagree about what words mean**. "Order" means one thing to sales, another to fulfillment, another to billing. Mapping all of them onto a single database table produces the *Big Ball of Mud* (Foote & Yoder, 1997). DDD accepts that large domains contain *multiple models* and makes that multiplicity explicit via **bounded contexts**, each with its own **ubiquitous language**.

---

## 2. Domain and subdomains

- **Domain** — the sphere of knowledge and activity the business operates in (e.g., "online retail").
- **Subdomain** — a coherent area inside the domain (e.g., Catalog, Pricing, Checkout, Shipping, Loyalty).

### Evans' classic trichotomy

- **Core subdomain.** What the business does differently from competitors. Your differentiator. Build in-house with your best people.
- **Supporting subdomain.** Necessary for the core to function, but not differentiating. Build in-house *simply*, or outsource.
- **Generic subdomain.** Solved problems (authentication, payments, email). Buy or use OSS; do not reinvent.

### Khononov's 2021 reframing — differentiation × complexity

Khononov keeps the three names but adds heuristics on two axes:

|  | Low complexity | High complexity |
|---|---|---|
| **High differentiation** | Beware: "hidden core" — commoditize quickly or automate further | **Core** — invest heavily |
| **Low differentiation** | **Generic** — buy | **Supporting** — build simply; don't over-engineer |

Nick Tune's **Core Domain Charts** place each bounded context on this 2×2 to guide investment (Tune, *"Core Domain Patterns"*, Medium, 2019–2023).

### How to identify subdomains

1. Interview stakeholders; list business capabilities.
2. Classify each on differentiation vs. complexity.
3. Look for cohesive knowledge clusters with their own vocabulary.
4. Ask: *would a competitor doing this identically still be the same business?* If yes → supporting/generic; if no → core.

### Example — Khononov's *WolfDesk* (B2B SaaS help-desk)

- **Core:** ticket-routing ML.
- **Supporting:** organizational hierarchy.
- **Generic:** OAuth, billing.

### Subdomains migrate

Subdomains are not frozen. A generic subdomain can become core when you innovate on it (Tune calls this a **Black Swan core**). A core that everyone copies can drift to supporting. Revisit classification every 6–12 months.

### Pitfalls

- Treating every subdomain as core.
- Locking classification — subdomains migrate.
- Confusing **subdomain (problem space)** with **bounded context (solution space)**.

---

## 3. Bounded contexts

A **bounded context** is an explicit boundary inside which a particular model, with a particular ubiquitous language, is consistent. "Customer" in Sales ≠ "Customer" in Support — each context owns its own model.

Subdomains live in the **problem space**. Bounded contexts live in the **solution space**. They usually align 1:1 but do not have to — a large subdomain may split into multiple contexts for team or scalability reasons.

### Discovery — greenfield

1. EventStorm the business process (see §6).
2. Mark **pivotal events** — state transitions with strategic meaning.
3. Group commands/events/aggregates by *linguistic coherence* — do the same words mean the same thing?
4. Draw tentative boundaries where language shifts.
5. Validate with domain experts; iterate.
6. Record each context on a **Bounded Context Canvas v3** (Tune, DDD Crew).

### Discovery — existing systems

1. Map modules, services, repos, databases as-is.
2. Interview teams; note where the *same entity* has different schemas or semantics.
3. Identify **seams** (Feathers, *Working Effectively with Legacy Code*) — natural refactoring fault lines.
4. Draw the current context map (often *Big Ball of Mud*).
5. Prioritize extraction using a Core Domain Chart.

### Bounded context vs. microservice vs. module

Khononov's formulation: *"All microservices are bounded contexts, but not all bounded contexts are necessarily microservices. A microservice defines the smallest valid service boundary; a bounded context defines the widest valid model boundary."*

A bounded context can be a module in a modular monolith, one microservice, or a cluster of microservices.

### Signs a bounded context is wrong

- Two "Customer" classes fighting over meaning inside it.
- Team constantly coordinates with another team to ship.
- Ubiquitous language is inconsistent in the same codebase.
- Deploys require cross-team sync.

### Pitfalls

- Aligning contexts to database tables rather than language.
- Making contexts too small ("nanoservices").
- Making contexts so large they contain multiple languages.
- Confusing bounded context with layer/tier.

---

## 4. Ubiquitous Language

A shared vocabulary used by developers and domain experts **inside a single bounded context**, consistent across conversation, documents, tests, and code.

### How to build it

1. In workshops (EventStorming, Domain Storytelling), write down every domain term spoken.
2. Clarify ambiguous ones on the spot.
3. Maintain a **living glossary** per context (wiki page or repo file).
4. Include examples, not just definitions.

### How to enforce in code

- Class, method, event, and variable names match the glossary literally.
- Tests read like business scenarios (Gherkin, or plain xUnit with `Given/When/Then`).
- Code review checks for jargon drift.
- Lint rules or custom analyzers for banned/required terms where valuable.
- Rename PRs are welcome, not rejected.

### How to evolve it

- When domain experts coin a better word, change the code. Breaking renames are cheap compared to ambiguity.
- Version the glossary alongside the code.
- Deprecate old terms with a note for at least one release.

### Pitfalls

- Allowing "technical" vocabulary to leak into the domain (`UserDTO`, `OrderEntity`).
- Maintaining a glossary that nobody reads.
- Trying to impose one language across multiple bounded contexts.

---

## 5. Context Mapping

A **context map** shows how bounded contexts relate technically and organizationally. Evans defined the original patterns; Vernon and later authors refined them. They **combine freely** (e.g., Partnership + Shared Kernel).

### The nine patterns

| Pattern | What it is | When to apply | Team implication | Typical anti-pattern |
|---|---|---|---|---|
| **Partnership** | Two teams succeed or fail together; coordinated planning and releases. | Co-evolving cores, tight coupling unavoidable. | High communication; joint planning. | Declared but not practiced → silent drift. |
| **Shared Kernel** | A small, shared subset of the model (library) owned jointly. | Concepts genuinely shared (e.g., `Money`, `TenantId`). | Must change by consensus. | Shared kernel that grows to contain everything. |
| **Customer/Supplier** | Upstream supplies; downstream is a customer with real input on priorities. | Clear producer/consumer with negotiation power. | Supplier accepts backlog input from customer. | Customer with no voice → becomes *Conformist*. |
| **Conformist** | Downstream adopts upstream's model as-is. | You have no power and the upstream model is tolerable. | Low effort, high coupling. | Adopting an upstream model that poisons your language. |
| **Anticorruption Layer (ACL)** | Translation layer insulating your model from an external one. | Upstream model is legacy, chaotic, or conflicting. | Dedicated translation code/team ownership. | ACL that leaks upstream concepts through. |
| **Open Host Service (OHS)** | Supplier exposes a published protocol for many consumers. | You have many downstream consumers. | Stable API contracts, versioning. | Ad-hoc per-consumer endpoints. |
| **Published Language** | Well-documented shared schema/protocol (often with OHS). | Cross-org integrations; industry standards (HL7, ISO 20022). | Schema governance. | Undocumented "published" language. |
| **Separate Ways** | Don't integrate at all. | Integration cost > value. | Duplication accepted on purpose. | Integration imposed by management despite no value. |
| **Big Ball of Mud** | Unbounded, tangled legacy. | *Recognize it*, wall it off with an ACL, don't extend it. | Contain and strangle. | Trying to "fix in place." |

### Choosing a pattern — decision tree

```
Is the other context inside your organization?
├── No → Published Language + OHS if you produce,
│         ACL on your side if you consume.
└── Yes →
    Do the teams cooperate willingly?
    ├── Yes →
    │   Do they share a tiny model core?
    │   ├── Yes → Shared Kernel
    │   └── No  → Partnership
    └── No →
        Is there a power imbalance?
        ├── You control upstream → Customer/Supplier
        ├── They do, model is OK → Conformist
        └── They do, model is bad → Anticorruption Layer
```

If integrating is simply not worth it → **Separate Ways**.

### Rendering the context map

- **Nick Tune's Context Map notation** (DDD Crew).
- **Bounded Context Canvas v3** per context.
- **Domain Message Flow Diagram** across contexts to show commands/events/queries.

### Pitfalls

- Drawing a context map once and never updating it.
- Treating patterns as exclusive — you can have Partnership *with* a Shared Kernel.
- Declaring a Partnership politically when reality is Customer/Supplier.

---

## 6. Discovery practices

### 6.1 EventStorming (Alberto Brandolini)

A workshop where participants map a business process as a sequence of **domain events** (orange sticky notes, past tense) on an unbounded wall. Three formats:

- **Big Picture EventStorming.** Whole business process end-to-end. Broad, messy, exploratory. Audience: business + devs.
- **Process-level EventStorming.** Adds commands (blue), actors (small yellow), policies (lilac), read models (green), external systems (pink), aggregates (large yellow), hotspots (red). Drives context discovery and aggregate design.
- **Design-level EventStorming.** Zooms into a single aggregate; drives tactical code design.

**Facilitation heuristics.**

- Start with events on a timeline. Refuse premature solutions.
- Enforce past tense for events (`OrderPlaced`, not `PlaceOrder`).
- Use **hotspots** (red) for questions, disagreements, unknowns — they are gold.
- **Pivotal events** mark phase boundaries and often align with bounded context seams.
- Do it standing up, on paper or a large Miro/Mural board, in time-boxed passes.

**Legacy vs greenfield EventStorming.** On greenfield: explore the desired process. On legacy: map the *as-is* process then the *to-be*; the delta drives the modernization roadmap (Tune, *Architecture Modernization*, 2024).

Canonical reference: Brandolini, *Introducing EventStorming*, Leanpub, 2021.

### 6.2 Domain Storytelling (Hofer & Schwentner, 2021)

Stakeholders narrate concrete scenarios while a modeler draws actors, work objects, and numbered activities in a pictographic notation. Outputs: a small set of stories showing the real workflow; uni-directional flows often indicate context boundaries. Free tool: **egon.io** (browser-based). Gentler than EventStorming for regulated or non-technical audiences.

### 6.3 Example Mapping (Matt Wynne)

For a *single user story*: rule cards (blue), example cards (green), question cards (red). A story with too many rules or questions is not ready. Runs 25–30 minutes. Best used *after* big-picture discovery, just before implementation.

### 6.4 User Story Mapping (Jeff Patton)

Organizes user activities horizontally (backbone) and tasks/details vertically (spine). Orthogonal to DDD but excellent for planning releases across bounded contexts.

### 6.5 Impact Mapping (Gojko Adzic)

Goal → Actors → Impacts → Deliverables. Keeps the team honest about *why* a feature exists before modeling it.

### 6.6 Wardley Mapping (Simon Wardley)

Value chain plotted against evolution (genesis → custom → product → commodity). Complements DDD by exposing which subdomains are headed toward commodity (generic) and which require innovation (core). Kaiser (2022) ties Wardley directly to DDD.

### 6.7 Event Modeling (Adam Dymitruk)

A stricter alternative to EventStorming, with a blueprint-like vocabulary of commands, events, views, and automations. Popular in event-sourced communities.

### 6.8 Which technique when

| Goal | Primary tool |
|---|---|
| Understand an unknown domain end-to-end | Big-picture EventStorming |
| Identify bounded contexts | Process-level EventStorming + Domain Storytelling |
| Clarify a specific user story | Example Mapping |
| Align architecture with business strategy | Wardley + Core Domain Charts |
| Plan a release | User Story Mapping |
| Clarify *why* | Impact Mapping |
| Specify an event-sourced system formally | Event Modeling |

---

## 7. Strategic checklists

### 7.1 Is this project a DDD candidate? (score 0–2 per item)

- Business logic is a competitive differentiator.
- Rules are contested and change often.
- Expected lifespan > 2 years.
- More than one team will contribute.
- Domain experts are reachable.
- Domain has non-trivial invariants.
- Integration with multiple other systems.
- Multi-tenant or multi-market.

**≥ 10** → full DDD. **5–9** → strategic DDD + light tactical. **< 5** → Transaction Script / Active Record.

### 7.2 Have I correctly identified bounded contexts?

- [ ] Each context has its own ubiquitous language, documented.
- [ ] Language does not conflict inside a context.
- [ ] Each context maps to a subdomain (or explicit split with rationale).
- [ ] Ownership is unambiguous: one team per context, not two.
- [ ] Integration with other contexts is explicit (Context Map).
- [ ] No shared database tables across contexts.
- [ ] A developer can read the Bounded Context Canvas and know what's inside in 5 minutes.

### 7.3 Which context-mapping pattern?

Use the decision tree in §5.

---

## Primary sources for this section

- Evans, *Domain-Driven Design*, Addison-Wesley, 2003 — Part IV, *Strategic Design*.
- Vernon, *Implementing Domain-Driven Design*, Addison-Wesley, 2013.
- Khononov, *Learning Domain-Driven Design*, O'Reilly, 2021 — Parts I–II.
- Brandolini, *Introducing EventStorming*, Leanpub, 2021.
- Hofer & Schwentner, *Domain Storytelling*, Addison-Wesley, 2021.
- Tune, *Core Domain Patterns*, *Bounded Context Canvas v3*, Medium, 2019–2023.
- Tune & Uludağ, *Architecture Modernization*, Manning, 2024.
- Kaiser, *Adaptive Systems with DDD, Wardley Mapping, and Team Topologies*, Addison-Wesley, 2022–2024.
- Fowler, *"BoundedContext"*, *"UbiquitousLanguage"*, martinfowler.com.
- Foote & Yoder, *"Big Ball of Mud"*, 1997.
- Feathers, *Working Effectively with Legacy Code*, Prentice Hall, 2004.
