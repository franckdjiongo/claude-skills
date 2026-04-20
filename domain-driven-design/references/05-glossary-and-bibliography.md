# Glossary, Bibliography, and Current State of Practice

Use this reference to define DDD vocabulary precisely, to cite authoritative sources when the user asks "where is this written down?", and to place the current (2021–2026) practice in context.

## Table of contents

- 1. Glossary
- 2. Current state of practice (2021–2026)
- 3. Annotated bibliography — books
- 4. Papers, articles, and primary sources
- 5. Conferences, practitioners, courses

---

## 1. Glossary

- **Aggregate.** Cluster of entities and VOs treated as one unit for changes; bounded by transactional consistency.
- **Aggregate root.** The only entity of an aggregate externally addressable; gateway for all modifications.
- **Anemic domain model.** Entities with data and no behavior; logic in services; DDD anti-pattern.
- **Anticorruption Layer (ACL).** Translation boundary insulating your model from another context's.
- **Big Ball of Mud.** Unbounded, tangled system; a context-map classification, not a target.
- **Bounded Context.** Explicit boundary inside which a model and ubiquitous language are consistent.
- **Bounded Context Canvas.** Template (Tune, DDD Crew) describing a context's strategic role, messages, and dependencies.
- **Command.** An instruction to change state; may be rejected; named imperatively.
- **Conformist.** Context mapping where downstream adopts upstream's model as-is.
- **Context Map.** Diagram of bounded contexts and their relationships.
- **Core Domain.** Subdomain where the business differentiates; highest investment priority.
- **Core Domain Chart.** Tune's 2×2 of differentiation × complexity for bounded contexts.
- **CQRS.** Separation of command (write) and query (read) models.
- **Customer/Supplier.** Upstream delivers; downstream has priority input.
- **Domain.** The sphere of knowledge and activity of the business.
- **Domain Event.** Past-tense fact emitted by an aggregate; part of the language.
- **Domain Service.** Stateless domain behavior not belonging to a single entity/VO.
- **Entity.** Object defined by identity; equality by ID.
- **EventStorming.** Workshop technique (Brandolini) using sticky notes to model business processes.
- **Event Sourcing.** Persisting an aggregate as the sequence of events that produced it.
- **Factory.** Object encapsulating complex creation and enforcing invariants at birth.
- **Generic Subdomain.** Solved problem; buy or use OSS.
- **Hexagonal Architecture / Ports & Adapters.** Cockburn's style placing the domain in the center, behind ports.
- **Inbox Pattern.** Consumer-side deduplication table for at-least-once delivery.
- **Integration Event.** Stable, versioned event published across bounded contexts.
- **Module.** Structural unit inside a bounded context.
- **Onion Architecture.** Palermo's concentric-ring layering with dependency-inward rule.
- **Open Host Service (OHS).** Supplier publishing a stable protocol for many consumers.
- **Outbox Pattern.** Writing events in the same DB transaction as state, then dispatching asynchronously.
- **Policy.** Reactive rule: when event X, then Y.
- **Process Manager / Saga.** Stateful coordinator across aggregates or contexts.
- **Published Language.** Well-documented shared schema used for integration.
- **Reference by identity.** Aggregate rule: refer to other aggregates by ID only.
- **Repository.** Collection-like interface for persisting and retrieving aggregates.
- **Shared Kernel.** Small shared model owned by two collaborating teams.
- **Separate Ways.** Explicit non-integration between contexts.
- **Specification.** First-class object representing a boolean domain rule.
- **Strangler Fig.** Migration pattern (Fowler) growing new code around old until the old is retired.
- **Subdomain.** Coherent area within a domain; core, supporting, or generic.
- **Supporting Subdomain.** Needed but not differentiating; build simply.
- **Ubiquitous Language.** Shared vocabulary inside a bounded context, used in conversation, tests, and code.
- **Value Object (VO).** Immutable object defined by attributes; structural equality.

---

## 2. Current state of practice (2021–2026)

### 2.1 Khononov's reframing (2021)

*Learning DDD* replaces the purely intuitive core/supporting/generic split with **differentiation × complexity** heuristics, acknowledges that subdomains *migrate* over time, and integrates DDD with **microservices, event-driven architecture, and data mesh** in Part IV. The book also maps DDD to simpler implementation patterns (Transaction Script, Active Record) for cases where full Domain Model is overkill.

### 2.2 Core Domain Charts and Bounded Context Canvas (Nick Tune, DDD Crew)

Tune's *Core Domain Patterns* (2019+) and the **Bounded Context Canvas** (now v3, 2022) have become the default workshop artifacts for strategic design. The canvas forces a team to state a context's strategic classification, ubiquity, model traits, inbound/outbound messages, and dependencies before writing code. The **Architecture Modernization Enabling Team** pattern (from his Manning book, 2024) scales DDD across legacy portfolios.

### 2.3 Team Topologies intersection

Skelton & Pais (*Team Topologies*, 2019) formalize four team types — **stream-aligned**, **platform**, **enabling**, **complicated-subsystem** — and three interaction modes (collaboration, X-as-a-Service, facilitating). Modern consensus: **one stream-aligned team per bounded context**; platform teams own broker/DB/IaC; enabling teams spread DDD practice; complicated-subsystem teams own specialized cores.

### 2.4 Wardley Mapping + DDD (Susanne Kaiser, 2022–2024)

*Adaptive Systems with Domain-Driven Design, Wardley Mapping, and Team Topologies* (Addison-Wesley) combines three lenses: **Wardley** for *evolution*, **DDD** for *boundaries and language*, **Team Topologies** for *teams*. Used to plan how core subdomains today will become supporting or generic tomorrow.

### 2.5 EventStorming maturation

Brandolini's long-awaited *Introducing EventStorming* (Leanpub, 2021) crystallizes the method. Virtual facilitation on Miro/Mural became normal after 2020; **Domain Message Flow Diagrams** and the Bounded Context Canvas often follow the storm directly.

### 2.6 Domain Storytelling (Hofer & Schwentner, 2021)

A gentler alternative to EventStorming for eliciting workflows; excellent for regulated or non-technical audiences. Free tool: **egon.io**.

### 2.7 Collaborative Modelling (Kenny Baas-Schwegler)

Emphasizes conflict resolution techniques (**Deep Democracy**) during modeling workshops — surfaces hidden disagreements that otherwise become production bugs.

### 2.8 Event Modeling (Adam Dymitruk)

A stricter alternative to EventStorming for specifying systems, with a blueprint-like vocabulary of commands, events, views, and automations. Popular in event-sourced communities.

### 2.9 AI/LLM + DDD (2024–2026)

Emerging practice: LLMs as *co-modelers* during EventStorming (draft glossaries, generate test scenarios, review naming), **not as replacements** for domain experts. Agent skills built on DDD references are increasingly used to keep AI-assisted code consistent with ubiquitous language. This skill is an example of that practice.

---

## 3. Annotated bibliography — books

- **Eric Evans, *Domain-Driven Design: Tackling Complexity in the Heart of Software*, Addison-Wesley, 2003.** The foundational text. Required reading for strategic vocabulary — Part IV ("Strategic Design") is the single most important 100 pages in DDD. Introduces Ubiquitous Language, Bounded Context, Context Map, Entity, Value Object, Aggregate, Repository, Factory, Domain Service, Domain Event (lightly), and strategic distillation of Core/Supporting/Generic subdomains.

- **Vaughn Vernon, *Implementing Domain-Driven Design*, Addison-Wesley, 2013 ("Red Book").** The how-to companion. The only book that treats aggregate design operationally (chapter 10 is canonical — the *four rules*). Concrete CQRS/event-driven patterns.

- **Vaughn Vernon, *Domain-Driven Design Distilled*, Addison-Wesley, 2016.** 150 pages. Give this to managers and onboarding engineers.

- **Vlad Khononov, *Learning Domain-Driven Design*, O'Reilly, 2021.** The clearest modern entry point; reframes subdomain classification with differentiation/complexity heuristics; ties DDD to microservices, EDA, and data mesh. URL: https://www.oreilly.com/library/view/learning-domain-driven-design/9781098100124/

- **Scott Millett & Nick Tune, *Patterns, Principles, and Practices of Domain-Driven Design*, Wrox, 2015.** Long-form; best treatment of context mapping patterns with .NET examples.

- **Alberto Brandolini, *Introducing EventStorming*, Leanpub, 2021.** Definitive guide — by the inventor. Read before facilitating your first workshop.

- **Stefan Hofer & Henning Schwentner, *Domain Storytelling*, Addison-Wesley, 2021.** Complementary discovery technique; lower-ceremony for non-technical stakeholders.

- **Susanne Kaiser, *Adaptive Systems with Domain-Driven Design, Wardley Mapping, and Team Topologies*, Addison-Wesley, 2022–2024.** The synthesis text for strategic design at portfolio scale.

- **Nick Tune & Ömer Uludağ, *Architecture Modernization*, Manning, 2024.** Legacy-to-modern playbook grounded in DDD + Team Topologies + Wardley.

- **Matthew Skelton & Manuel Pais, *Team Topologies*, IT Revolution, 2019.** The team-structure lens that complements bounded contexts.

- **Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns*, Manning, 2020.** The testing book for domain models; chapters on VOs, aggregates, and mocking pair perfectly with DDD.

- **Robert C. Martin, *Clean Architecture*, Prentice Hall, 2017.** The dependency-rule articulation that underwrites hexagonal/onion.

- **Michael Plöd, *Hands-on Domain-Driven Design by Example*, Leanpub.** Workshop-style.

---

## 4. Papers, articles, and primary sources

- **Vaughn Vernon, *"Effective Aggregate Design"* (three parts), dddcommunity.org, 2011.** The canonical aggregate sizing guidance. Free. The *four rules* in their original form.
- **Martin Fowler, martinfowler.com.** Evergreen entries on:
  - *"BoundedContext"*
  - *"UbiquitousLanguage"*
  - *"Domain-Driven Design"*
  - *"AnemicDomainModel"* (2003)
  - *"StranglerFigApplication"* (2004)
  - *"CQRS"*
  - *"DomainEvent"*
  - *"EventSourcing"*
- **Greg Young, *CQRS Documents* (2010) and *"A Decade of DDD, CQRS, Event Sourcing"* talks.** Primary source on CQRS and ES.
- **Alistair Cockburn, *"Hexagonal Architecture"*, 2005.**
- **Jeffrey Palermo, *"The Onion Architecture"*, 2008.**
- **Jimmy Bogard, *"A Better Domain Events Pattern"*, *"Domain Events vs Integration Events"*, jimmybogard.com.** Canonical on the domain/integration distinction.
- **Nick Tune, *Core Domain Patterns*, *Bounded Context Canvas v3*, Medium.** URL: https://medium.com/nick-tune-tech-strategy-blog
- **Chris Richardson, microservices.io.** Saga and outbox patterns with DDD framing.
- **Foote & Yoder, *"Big Ball of Mud"*, 1997.** The classic description of the anti-pattern.

---

## 5. Conferences, practitioners, courses

### Conferences

- **DDD Europe** — annual, Amsterdam/Antwerp. dddeurope.com. Canonical talks by Evans, Vernon, Tune, Brandolini, Baas-Schwegler.
- **Explore DDD** — US-based. exploreddd.com.
- **KanDDDinsky** — Berlin. kandddinsky.com.
- **Virtual DDD** — online community and talks. virtualddd.com.
- **NDC** — multi-topic, significant DDD track.

### Notable talks to watch

- Evans, *"DDD Isn't Done"* (DDD Europe 2019).
- Tune, *"Dissecting Bounded Contexts"* (DDD Europe 2020) — https://www.youtube.com/watch?v=zkRfDw0N4W8
- Brandolini, *"100,000 Orange Stickies Later"*.
- Khononov, talks on Learning DDD.
- Susanne Kaiser, adaptive-systems talks.

### Practitioners to follow

Eric Evans (domainlanguage.com), Vaughn Vernon (kalele.io), Vlad Khononov (vladikk.com), Alberto Brandolini (blog.avanscoperta.it), Nick Tune (nick-tune.me), Mathias Verraes (verraes.net), Kenny Baas-Schwegler (baasie.com), Michael Plöd, Susanne Kaiser, Jimmy Bogard (jimmybogard.com), Vladimir Khorikov (enterprisecraftsmanship.com), Greg Young, Udi Dahan (udidahan.com), Chris Richardson (microservices.io), Martin Fowler (martinfowler.com).

### Courses

- Vaughn Vernon's IDDD Workshop and *DDD Distilled* course.
- Khononov's O'Reilly courses on Learning DDD.
- Khorikov's Pluralsight courses on DDD and testing.
- Virtual DDD — free community sessions.

---

## Closing orientation

When the user asks *where is this written down?*, match the question to the right source:

| Question | Source |
|---|---|
| "What are the four rules of aggregate design?" | Vernon, *"Effective Aggregate Design"* (2011) — free on dddcommunity.org |
| "What is a bounded context?" | Evans 2003, Part IV; Fowler's *"BoundedContext"* for a short read |
| "How do I size an aggregate?" | Vernon 2013, ch. 10 |
| "Domain vs integration events?" | Bogard, *"A Better Domain Events Pattern"* |
| "How do I migrate a Big Ball of Mud?" | Fowler, *"StranglerFigApplication"*; Tune & Uludağ 2024 |
| "Should we use DDD here?" | Khononov 2021, Part I |
| "How do I facilitate EventStorming?" | Brandolini 2021 |
| "How do I align teams to contexts?" | Skelton & Pais 2019 |
| "What's the relationship between DDD, Wardley, Team Topologies?" | Kaiser 2022–2024 |
