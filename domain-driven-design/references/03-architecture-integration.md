# Architecture and Integration

DDD says *what* to model; architectural styles say *where* to put it. The shared discipline: **domain at the center; infrastructure at the edge; dependencies point inward.**

## Table of contents

- 1. DDD with architectural styles (Layered, Hexagonal, Onion, Clean)
- 2. CQRS (simple and full)
- 3. Event Sourcing
- 4. Inter-context communication (patterns and at-the-edge discipline)
- 5. DDD in modern contexts (microservices, serverless, multi-tenant SaaS, EDA, TypeScript backends, Power Platform/Dataverse)
- 6. Persistence strategies for aggregates (RDBMS, document, Dataverse, event store, KV)

---

## 1. DDD with architectural styles

The shared rule: **dependencies point inward**. The domain depends on nothing external.

### 1.1 Layered / N-tier

Classic Presentation → Application → Domain → Infrastructure. Works fine for DDD if the **dependency rule** is inverted so Domain depends on nothing. Otherwise the domain ends up coupled to the ORM.

### 1.2 Hexagonal / Ports & Adapters (Cockburn, 2005)

Domain in the center; surrounded by **ports** (interfaces owned by the domain).

- **Primary adapters** (drivers): UI, HTTP, message consumers → call inbound ports.
- **Secondary adapters** (driven): DB, email, external APIs → implement outbound ports.

Swappable, testable, no framework leakage.

### 1.3 Onion Architecture (Palermo, 2008)

Concentric rings. Domain model → Domain services → Application services → Infrastructure/UI. Dependencies point inward. Equivalent in spirit to hexagonal.

### 1.4 Clean Architecture (Martin, 2017)

Entities (enterprise rules) → Use cases → Interface adapters → Frameworks & drivers. Same dependency rule.

### 1.5 Overlap

Hexagonal, Onion, and Clean are **the same idea** at increasing ceremony. Choose one name and stick with it. They all support DDD identically.

### 1.6 Which styles fight DDD?

Any style where the **domain depends on the framework or ORM**: Active Record on every entity, attributes from the persistence framework on aggregates, or UI concerns in domain classes. Classic MVC with "fat controllers" is not wrong *if* the domain is still extracted, but it invites the anemic model.

---

## 2. CQRS (Command Query Responsibility Segregation)

### Definition

Greg Young's CQRS (from Bertrand Meyer's CQS): separate the models that *change* state from the models that *return* data.

### Spectrum

- **Simple CQRS.** Same DB; separate handlers and DTOs. Aggregates handle commands; a read-side service returns projected DTOs. Low cost, high clarity.
- **Full CQRS.** Separate write and read stores; projections built asynchronously from events. Read stores optimized per query (SQL for reports, Elastic for search, Redis for caches).

### When to use

- Asymmetric load (reads ≫ writes or reverse).
- Rich reporting needs across a complex write model.
- Multiple read shapes for one write model.
- Event-sourced write model.

### When *not* to use

- CRUD apps where read and write shapes are identical.
- Small team that can't operate eventual consistency.

### Composition with DDD

- Commands map to aggregate behavior methods via command handlers.
- Queries bypass aggregates entirely and hit read models or projections.
- **Invariants still live in aggregates; queries never enforce rules.**

---

## 3. Event Sourcing

### Definition

Event Sourcing (ES) stores the state of an aggregate **as the sequence of domain events that produced it**. Current state is computed by replaying events; snapshots optimize the replay.

### Mechanics

1. Aggregate processes a command, produces events.
2. Events are appended to an **event store** for that aggregate's stream (optimistic concurrency on stream version).
3. To rehydrate, read the stream and fold events into state.
4. Projections subscribe to streams to build read models.

### Trade-offs

**Pros.** Full audit log, temporal queries, natural integration with CQRS, easy debug/replay.
**Cons.** Schema evolution (event versioning, upcasters), eventual consistency UX, tooling maturity, harder ad-hoc queries.

### Fit with DDD

Highly complementary: events are already part of the model. Combine ES + CQRS when auditability or temporal analysis is a business requirement.

### When to avoid

- Team lacks experience and the domain doesn't demand it.
- Simple CRUD logic.
- Regulatory deletion requirements collide with append-only stores (plan up front: crypto-shredding).

### Pitfalls

- Event-carried state transfer abused as API — events become coupling points.
- No snapshot strategy → long rehydration.
- Using integration events as source of truth between contexts — each context must own its events.

---

## 4. Inter-context communication

### Options

| Option | When appropriate | Notes |
|---|---|---|
| **Sync REST/RPC** | Query-only, synchronous UX, low volume. | Conformist or Open Host Service. |
| **Async messaging** | Commands/notifications across contexts, decoupled scaling. | Requires broker, outbox, idempotent consumers. |
| **Domain events → integration events** | Standard pattern for async. | Translate at context edge; never publish internal events. |
| **Shared database** | Almost never. | Only for read replicas with explicit contract; otherwise anti-pattern. |
| **File/ETL** | Batch integrations. | Treat the file schema as a published language. |
| **Backend for Frontend (BFF)** | UI composition. | Not a bounded context; composition layer. |

### Patterns at the edge

- **Outbox** on the producer → broker → **inbox** on the consumer gives at-least-once + effectively-once processing.
- **Schema registry** (Avro/Protobuf/JSON Schema) for integration events.
- **Consumer-Driven Contract testing** (Pact) to catch schema breakage before deploy.
- **Anti-corruption layer (ACL)** on the consumer side if the upstream language does not match yours.

### The outbox pattern in detail

Do **not** `await broker.publish(event)` inside the same transaction that saves the aggregate; the double-write can leave DB and broker inconsistent. Instead:

1. In the same DB transaction as the aggregate save, insert rows into an `outbox` table.
2. A separate dispatcher reads the outbox, publishes to the broker, marks dispatched.
3. Consumers deduplicate using the `eventId` (inbox pattern).

This gives **at-least-once** delivery with **effectively-once** processing via idempotency.

### Rule of thumb

**Never publish a domain event as an integration event.** Translate at the edge: a context's internal event schema is free to change; the integration contract is not.

---

## 5. DDD in modern contexts

### 5.1 Microservices at scale

- One bounded context per service is the default mapping, **not** one entity per service. Splitting entities across services forces distributed transactions.
- **Team Topologies** (Skelton & Pais, 2019): each stream-aligned team owns one or more bounded contexts end-to-end. Platform teams provide the broker, DB, CI/CD, observability. Complicated-subsystem teams own specialized cores (ML, pricing). Enabling teams spread DDD practice.

### 5.2 Serverless / FaaS

- Functions make great adapters and handlers.
- An aggregate is still an aggregate; it lives in a database, not in a function's memory.
- Cold starts and short timeouts push toward small aggregates and fast replays (snapshots if event-sourced).
- Bun/Node lambdas: keep dependency-injection light; avoid heavy ORMs.

### 5.3 Multi-tenant SaaS

- **Tenancy is cross-cutting.** Model `TenantId` as a value object on every aggregate.
- **Isolation strategies:** per-tenant DB (strongest, highest cost), shared DB with per-tenant schema, shared schema with `tenant_id` column + row-level security (most common).
- **Per-tenant customization.** Don't fork the domain per customer; use **extension points** — policies, feature flags, optional subdomains. If a tenant truly needs a different core, that's a different product.
- **Bounded contexts vs. tenancy.** Tenancy is orthogonal; the same contexts serve all tenants.
- **Billing and usage** are usually their own bounded contexts (often generic/supporting).

### 5.4 Event-driven architectures (EDA)

EDA amplifies DDD: events become the integration language. Discipline: **own your events**, version them, translate at the edge, outbox always. Kafka/Pulsar/Service Bus + outbox + schema registry + CDC on legacy is the modern mainstream.

### 5.5 TypeScript-first backends (Node.js / Bun)

- Strict mode, `readonly` everywhere, private constructors with static factories.
- **Branded types** for IDs (`type OrderId = string & { __brand: "OrderId" }`).
- Prefer explicit `Result<T,E>` or narrow error types for domain rule violations.
- Keep ORM (Prisma/Drizzle) outside the domain; write mappers.
- Test aggregates with in-memory repositories — they run in milliseconds under Bun.

### 5.6 Power Platform / Dataverse

- **Dataverse tables** are the store; **plugins** (C#) are the closest thing to domain behavior. Keep plugin code thin — delegate to pure domain classes in a class library you register with the plugin.
- Plugins run in a sandboxed transaction per message; use that as the aggregate's transactional boundary.
- Power Automate flows are **orchestration** (process managers), not the domain.
- Do not let Dataverse schema shape your aggregates; map.
- Cross-environment/tenant concerns: Dataverse environments often *are* bounded contexts; integrate via Dataverse Web API or Service Bus with an outbox equivalent (use a "dispatch queue" table).

### 5.7 AI/LLM + DDD (2024–2026)

Emerging practice: use LLMs as a *co-modeler* during EventStorming (draft glossaries, generate test scenarios, review naming), but **not as a replacement for domain experts**. Agent skills built on DDD references (like this one) are increasingly used to keep AI-assisted code consistent with ubiquitous language.

---

## 6. Persistence strategies for aggregates

**Invariant across stores:** the aggregate is the unit of consistency; the repository is the only gateway; mappers translate at the edge.

| Store | What changes | Specific guidance |
|---|---|---|
| **Relational + ORM (EF Core, Prisma, Drizzle)** | Schema mapping, owned types, value conversions. | Map VOs to owned types / value converters; avoid lazy loading; one aggregate per transaction; do not expose `DbSet`/`IQueryable` outside repository. |
| **Document store (Firestore, MongoDB)** | Aggregate ≈ document. | Natural fit. Subcollections for child entities when child count is unbounded. Use `updateTime` or a `version` field for optimistic concurrency. |
| **Dataverse** | Aggregate ≈ root table + related tables. | Plugins for domain behavior; keep plugin code thin. Use the plugin execution context as the transaction. |
| **Event store (EventStoreDB, Marten)** | Aggregate ≈ stream. | One stream per aggregate; version for concurrency; snapshots for performance. |
| **Key-value** | Aggregate serialized as JSON. | Works for small aggregates; weak querying — use projections. |

### Firestore persistence sketch (TypeScript)

```typescript
export const OrderMapper = {
  toDoc(o: Order) {
    return {
      customerId: o.customerId,
      status: (o as any)._status,
      lines: (o as any)._lines.map((l: OrderLine) => ({
        sku: l.sku, qty: l.qty, amount: l.unitPrice.amount, currency: l.unitPrice.currency,
      })),
      version: (o as any)._version ?? 1,
      updatedAt: FieldValue.serverTimestamp(),
    };
  },
  toDomain(raw: any): Order { /* rehydrate via a factory */ return null as any; },
};
```

### EF Core sketch (C#)

```csharp
modelBuilder.Entity<Order>(b =>
{
    b.HasKey(o => o.Id);
    b.Property(o => o.Id).HasConversion(v => v.Value, v => new OrderId(v));
    b.OwnsMany<OrderLine>("_lines", lb =>
    {
        lb.Property<Guid>("Id"); lb.HasKey("Id");
        lb.OwnsOne(l => l.UnitPrice, mb =>
        {
            mb.Property(m => m.Amount).HasColumnName("UnitAmount");
            mb.Property(m => m.Currency).HasColumnName("UnitCurrency");
        });
    });
    b.Property(o => o.Status).HasConversion<string>();
    b.Property<byte[]>("RowVersion").IsRowVersion();
});
```

---

## Primary sources for this section

- Cockburn, *"Hexagonal Architecture"*, 2005.
- Palermo, *"The Onion Architecture"*, 2008.
- Martin, *Clean Architecture*, Prentice Hall, 2017.
- Young, *CQRS Documents*, 2010, and *"A Decade of DDD, CQRS, Event Sourcing"* talks.
- Richardson, *microservices.io* — saga and outbox patterns with DDD framing.
- Fowler, *"CQRS"*, *"EventSourcing"*, martinfowler.com.
- Bogard, *"Domain Events vs Integration Events"*, jimmybogard.com.
- Khononov, *Learning DDD*, O'Reilly, 2021 — Part IV (microservices, EDA, data mesh).
- Skelton & Pais, *Team Topologies*, IT Revolution, 2019.
- Kaiser, *Adaptive Systems with DDD, Wardley Mapping, and Team Topologies*, Addison-Wesley, 2022–2024.
