# Tactical Design

Tactical design is the *inside* of a bounded context — the building blocks that make the domain model honest. This reference applies equally to new code and to existing codebases being refactored toward stronger models.

## Table of contents

- 1. Entities vs. Value Objects
- 2. Aggregates and aggregate roots (Vernon's four rules)
- 3. Domain events (and the outbox pattern)
- 4. Repositories
- 5. Domain, application, and infrastructure services
- 6. Factories
- 7. Modules (packages)
- 8. Specification pattern
- 9. Policies, process managers, sagas
- 10. Tactical checklists

---

## 1. Entities vs. Value Objects

### Definitions

- **Value Object.** Defined by its attributes. No identity. Immutable. Two VOs with the same attributes are equal. Examples: `Money`, `Address`, `DateRange`, `EmailAddress`, `Coordinates`.
- **Entity.** Has identity that persists across state changes. Two entities are equal iff their IDs are equal, regardless of attributes. Examples: `Customer`, `OrderLine`, `Invoice`.

### Rules for value objects

1. Immutable. Every "change" returns a new instance.
2. Self-validating in the constructor (throws/returns `Result` on invalid input).
3. Structural equality.
4. Side-effect-free methods.
5. Prefer them over primitives (antidote to **primitive obsession**).

### Rules for entities

1. Stable identity assigned at creation.
2. Equality by ID only.
3. Lifecycle-aware (creation, state transitions, deletion/archival).
4. Behavior (methods) expresses business rules; no public setters.
5. Invariants enforced in behavior methods.

### Decision tree — entity or value object?

```
Does the concept need to be tracked over time even if attributes change?
├── Yes → Entity
└── No  →
    Are two instances with identical attributes interchangeable?
    ├── Yes → Value Object
    └── No  → reconsider; probably an Entity
```

Vernon's heuristic: *"When in doubt, start as a value object; promote to entity only when identity is required."*

### Example — Money VO (TypeScript)

```typescript
export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {}

  static of(amount: number, currency: string): Money {
    if (!Number.isFinite(amount)) throw new Error("amount must be finite");
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("ISO-4217 required");
    return new Money(Math.round(amount * 100) / 100, currency);
  }

  add(other: Money): Money {
    if (other.currency !== this.currency) throw new Error("currency mismatch");
    return Money.of(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
```

### Example — Money VO (C# .NET 8+)

```csharp
public readonly record struct Money
{
    public decimal Amount { get; }
    public string Currency { get; }

    private Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }

    public static Money Of(decimal amount, string currency)
    {
        if (!decimal.IsFinite(amount)) throw new ArgumentException("amount");
        if (currency is null || currency.Length != 3)
            throw new ArgumentException("ISO-4217 required");
        return new Money(decimal.Round(amount, 2), currency.ToUpperInvariant());
    }

    public Money Add(Money other)
    {
        if (other.Currency != Currency) throw new InvalidOperationException("currency");
        return Of(Amount + other.Amount, Currency);
    }
}
```

### Pitfalls

- Making VOs mutable ("just a setter for convenience").
- Skipping constructor validation → invalid states.
- Primitive types representing domain concepts (*primitive obsession*).

---

## 2. Aggregates and aggregate roots

An **aggregate** is a cluster of entities and value objects treated as a single unit for data changes. One entity is the **aggregate root** — the only object external code may hold a reference to. All other members are reachable only through the root.

An aggregate is the **transactional consistency boundary**: one aggregate, one transaction, one consistent state.

### Vernon's *Four Rules of Aggregate Design*

Source: Vernon, *"Effective Aggregate Design"* (three-part paper, 2011; reprinted in *Implementing DDD*, 2013, ch. 10).

1. **Model true invariants in consistency boundaries.** Only invariants that *must* be consistent together live in the same aggregate.
2. **Design small aggregates.** Prefer small; "small" is the default.
3. **Reference other aggregates by identity only.** No object references across boundaries; store the `CustomerId`, not the `Customer`.
4. **Use eventual consistency between aggregates.** Coordinate multi-aggregate changes via domain events and process managers, not transactions.

### Finding the right boundary

1. List the invariants: rules that must *always* be true.
2. For each invariant, note which data it touches.
3. Group data touched by the same invariant into an aggregate.
4. If an invariant spans multiple aggregates, either (a) demote it to eventual consistency, (b) rethink your boundaries, or (c) accept it belongs in one aggregate and make that aggregate slightly bigger.

### The transactional rule

**One aggregate per transaction.** A command modifies exactly one aggregate; other effects follow asynchronously via domain events. This is the single most important tactical constraint in DDD; breaking it produces contention, deadlocks, and unclear ownership.

### Size rules

- If the aggregate streams hundreds of child entities to satisfy one invariant, you've likely conflated two aggregates.
- If you keep loading another aggregate *inside* this one, the reference-by-ID rule will guide you to the right split.

### Multi-aggregate coordination

- **Domain events** fired by aggregate A cause handlers/process managers to invoke aggregate B in a *separate* transaction.
- **Process managers / sagas** own the multi-step workflow (see §9).

### Example — Order aggregate (TypeScript)

```typescript
export type OrderId = string & { readonly __brand: "OrderId" };
export type CustomerId = string & { readonly __brand: "CustomerId" };

export interface DomainEvent { readonly occurredAt: Date; readonly type: string; }

export class OrderPlaced implements DomainEvent {
  readonly type = "OrderPlaced";
  readonly occurredAt = new Date();
  constructor(
    public readonly orderId: OrderId,
    public readonly customerId: CustomerId,
    public readonly total: Money,
  ) {}
}

export class Order {
  private readonly _events: DomainEvent[] = [];
  private _status: "Draft" | "Placed" | "Cancelled" = "Draft";
  private readonly _lines: OrderLine[] = [];

  private constructor(
    public readonly id: OrderId,
    public readonly customerId: CustomerId,
  ) {}

  static open(id: OrderId, customerId: CustomerId): Order {
    return new Order(id, customerId);
  }

  addLine(sku: string, qty: number, unitPrice: Money): void {
    if (this._status !== "Draft") throw new Error("order is not editable");
    if (qty <= 0) throw new Error("qty must be > 0");
    this._lines.push(OrderLine.of(sku, qty, unitPrice));
  }

  place(): void {
    if (this._status !== "Draft") throw new Error("already placed");
    if (this._lines.length === 0) throw new Error("empty order");
    this._status = "Placed";
    this._events.push(new OrderPlaced(this.id, this.customerId, this.total()));
  }

  total(): Money {
    return this._lines.reduce(
      (acc, l) => acc.add(l.subtotal()),
      Money.of(0, this._lines[0]?.unitPrice.currency ?? "EUR"),
    );
  }

  pullEvents(): DomainEvent[] {
    const out = [...this._events];
    this._events.length = 0;
    return out;
  }
}
```

### Example — Order aggregate (C# .NET 8+)

```csharp
public readonly record struct OrderId(Guid Value);
public readonly record struct CustomerId(Guid Value);

public interface IDomainEvent { DateTime OccurredAt { get; } }

public sealed record OrderPlaced(OrderId OrderId, CustomerId CustomerId, Money Total)
    : IDomainEvent { public DateTime OccurredAt { get; } = DateTime.UtcNow; }

public sealed class Order
{
    private readonly List<OrderLine> _lines = new();
    private readonly List<IDomainEvent> _events = new();
    public OrderId Id { get; }
    public CustomerId CustomerId { get; }
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;

    private Order(OrderId id, CustomerId customerId) { Id = id; CustomerId = customerId; }

    public static Order Open(OrderId id, CustomerId customerId) => new(id, customerId);

    public void AddLine(string sku, int qty, Money unitPrice)
    {
        if (Status != OrderStatus.Draft) throw new InvalidOperationException("not editable");
        if (qty <= 0) throw new ArgumentOutOfRangeException(nameof(qty));
        _lines.Add(OrderLine.Of(sku, qty, unitPrice));
    }

    public void Place()
    {
        if (Status != OrderStatus.Draft) throw new InvalidOperationException("already placed");
        if (_lines.Count == 0) throw new InvalidOperationException("empty");
        Status = OrderStatus.Placed;
        _events.Add(new OrderPlaced(Id, CustomerId, Total()));
    }

    public IReadOnlyList<IDomainEvent> PullEvents()
    {
        var copy = _events.ToArray();
        _events.Clear();
        return copy;
    }
}

public enum OrderStatus { Draft, Placed, Cancelled }
```

### Pitfalls

- **God aggregate.** One root owns half the domain; every change contends on one row.
- **Chatty aggregate.** Reference-by-object to other aggregates triggers N+1 loads.
- **Leaky collections.** `public List<OrderLine> Lines { get; }` lets callers mutate state bypassing invariants. Expose `IReadOnlyList<>` / `ReadonlyArray<>`.
- **Transaction spanning two aggregates.** Breaks the fourth rule.

---

## 3. Domain events

A **domain event** is something that happened in the domain, named in the past tense, relevant to the business, emitted by an aggregate as part of its state transition. Events are **immutable**, **carry the data needed for consumers**, and are part of the ubiquitous language.

### Modeling rules

- Past tense: `OrderPlaced`, not `PlaceOrder`.
- Contains identifiers and the minimal payload consumers need.
- Timestamped; often include an `eventId` for idempotency.
- Raised *inside* the aggregate behavior method, pulled by infrastructure after persistence.

### Domain events vs. integration events

Jimmy Bogard's distinction (*"A Better Domain Events Pattern"*, jimmybogard.com):

|  | Domain event | Integration event |
|---|---|---|
| Scope | Inside one bounded context | Across bounded contexts |
| Schema | Owned by the context; can change | Stable, versioned public contract |
| Transport | In-process handlers | Message broker |
| Semantic tense | Past, rich domain vocabulary | Past, stable translated vocabulary |
| Delivery | Synchronous or async | Async, at-least-once |

### Publishing — the outbox pattern

Do **not** `await broker.publish(event)` inside the same transaction that saves the aggregate; the double-write can leave DB and broker inconsistent. Instead:

1. In the same DB transaction as the aggregate save, insert rows into an `outbox` table.
2. A separate dispatcher reads the outbox, publishes to the broker, marks dispatched.
3. Consumers deduplicate using the `eventId` (inbox pattern).

This gives **at-least-once** delivery with **effectively-once** processing via idempotency.

### Consumption — sync vs. async

- **Sync in-process handlers** for cross-aggregate reactions within the same context and same transaction scope — acceptable when the second aggregate operation is idempotent and failure is tolerable.
- **Async via outbox + broker** for everything crossing process, context, or trust boundaries.

### Ordering and idempotency

- Never rely on global ordering across streams.
- Per-aggregate ordering is natural if you publish in commit order.
- Make every handler idempotent: check the `eventId` in an inbox table.

### Decision tree — domain event or integration event?

```
Does a consumer live outside this bounded context or outside this process?
├── No  → Domain event; in-process handler is fine.
└── Yes →
    Do consumers need to survive your schema changes?
    ├── Yes → Integration event; define stable versioned contract;
    │        translate domain event → integration event at the edge.
    └── No  → Still integration event, but schema governance can be light.
```

### Pitfalls

- Using the domain-event schema as the integration contract — every internal rename breaks consumers.
- Publishing before commit — ghost events.
- Fat events that carry the entire aggregate — couples consumers to the write model.

---

## 4. Repositories

A **repository** mediates between the domain and the persistence mechanism, presenting a **collection-like interface** for a *single aggregate type*. It hides the storage, returns fully-constituted aggregates, and accepts aggregates for saving.

### Rules

1. **Interface in the domain layer; implementation in infrastructure.**
2. **One repository per aggregate root** — not per entity, not per table.
3. **Methods named in the ubiquitous language** (`findOverdue`, `save`, `ofId`), not CRUD (`get`, `update`).
4. **Return fully-valid aggregates** or nothing.
5. **No query leakage** — do not return `IQueryable`, `Cursor`, or raw rows.

### Example — TypeScript

```typescript
// Domain layer
export interface OrderRepository {
  ofId(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
  findByCustomer(customerId: CustomerId): Promise<Order[]>;
}

// Infrastructure layer (Firestore example)
export class FirestoreOrderRepository implements OrderRepository {
  constructor(private readonly db: Firestore) {}
  async ofId(id: OrderId): Promise<Order | null> {
    const snap = await this.db.collection("orders").doc(id).get();
    return snap.exists ? OrderMapper.toDomain(snap.data()!) : null;
  }
  async save(order: Order): Promise<void> {
    const doc = OrderMapper.toDoc(order);
    await this.db.collection("orders").doc(order.id).set(doc);
  }
  async findByCustomer(customerId: CustomerId): Promise<Order[]> {
    const snaps = await this.db.collection("orders")
      .where("customerId", "==", customerId).get();
    return snaps.docs.map(d => OrderMapper.toDomain(d.data()));
  }
}
```

### Example — C#

```csharp
// Domain layer
public interface IOrderRepository
{
    Task<Order?> OfId(OrderId id, CancellationToken ct);
    Task Save(Order order, CancellationToken ct);
    Task<IReadOnlyList<Order>> FindByCustomer(CustomerId id, CancellationToken ct);
}
```

### In-memory variant for testing

```typescript
export class InMemoryOrderRepository implements OrderRepository {
  private readonly store = new Map<OrderId, Order>();
  async ofId(id: OrderId) { return this.store.get(id) ?? null; }
  async save(o: Order) { this.store.set(o.id, o); }
  async findByCustomer(c: CustomerId) {
    return [...this.store.values()].filter(o => o.customerId === c);
  }
}
```

### Anti-patterns

- **Generic repository (`IRepository<T>`).** Usually signals a missing domain concept; makes every aggregate look like a row store and invites CRUD thinking.
- **Leaky repository.** Exposing `IQueryable`, `DbSet`, or ORM cursors lets callers write arbitrary queries against the write model — goodbye invariants.
- **Repository per entity.** Invites cross-aggregate loads via foreign-key navigation.
- **Repository returning DTOs for reads.** Use a dedicated query/read model instead (see CQRS in `03-architecture-integration.md`).

---

## 5. Domain, application, and infrastructure services

Three distinct kinds of service, each with a clear role. Confusing them produces anemic models.

| Service | Purpose | Contains | Does not contain |
|---|---|---|---|
| **Domain service** | Behavior that is domain logic but doesn't naturally belong to one entity/VO (spans aggregates, or is a pure domain calculation). | Domain rules, pure functions over domain types. | Transactions, I/O, auth. |
| **Application service** | Orchestrates a use case: load aggregate(s), invoke behavior, save, publish events, manage transaction and security. Very thin. | Transaction, security, pagination, DTO mapping. | Business rules. |
| **Infrastructure service** | Technical capability (send email, hash password, call external API). | I/O, protocols. | Domain rules. |

### When a domain service is justified

- A rule operates on multiple aggregate types (e.g., `TransferService` between two `Account`s).
- A computation is inherently stateless and part of the language (e.g., `TaxPolicy.calculate(cart, country)`).
- A domain rule depends on external data that should not be loaded into an aggregate.

### Example — domain service (C#)

```csharp
public sealed class PricingService
{
    private readonly IDiscountPolicy _discounts;
    public PricingService(IDiscountPolicy discounts) => _discounts = discounts;

    public Money Price(Order order, Customer customer)
        => _discounts.Apply(order.Total(), customer.Tier);
}
```

### Example — application service / command handler (TypeScript)

```typescript
export class PlaceOrderHandler {
  constructor(
    private readonly orders: OrderRepository,
    private readonly uow: UnitOfWork,
    private readonly bus: DomainEventDispatcher,
  ) {}
  async handle(cmd: {
    orderId: OrderId;
    customerId: CustomerId;
    lines: Array<{sku: string; qty: number; price: Money}>
  }) {
    await this.uow.run(async () => {
      const order = Order.open(cmd.orderId, cmd.customerId);
      for (const l of cmd.lines) order.addLine(l.sku, l.qty, l.price);
      order.place();
      await this.orders.save(order);
      await this.bus.dispatch(order.pullEvents()); // via outbox
    });
  }
}
```

### Pitfalls

- Putting business rules in application services ("service layer with entities as DTOs") → anemic model.
- Naming a domain service just `OrderService` and dumping all orchestration inside.
- Injecting repositories into domain services when the application service should be orchestrating.

---

## 6. Factories

A factory encapsulates complex creation logic and enforces invariants at birth. Not every aggregate needs one — a static `open`/`create` on the aggregate root is often enough.

### When needed

- Multiple valid creation paths with different inputs.
- Polymorphic creation (which subtype?).
- Creation requires calls to other aggregates or services.
- Reconstitution from persistence (mapper/factory hybrid).

### Where they live

- **Static factory method on the aggregate root** — default.
- **Standalone factory class in the domain** — when creation requires collaborators.
- **Factory on the repository** — for reconstitution from the store.

### Example — standalone factory (TypeScript)

```typescript
export class OrderFactory {
  constructor(
    private readonly pricing: PricingService,
    private readonly inventory: InventoryChecker,
  ) {}
  async create(customer: Customer, cart: Cart): Promise<Order> {
    await this.inventory.assertAvailable(cart);
    const order = Order.open(OrderId.new(), customer.id);
    for (const item of cart.items) {
      const price = this.pricing.priceFor(item.sku, customer.tier);
      order.addLine(item.sku, item.qty, price);
    }
    return order;
  }
}
```

### Pitfalls

- Factories that replicate business logic from the aggregate.
- Factories that persist. (They don't — they create.)
- Overuse when a constructor or static method suffices.

---

## 7. Modules (packages)

Modules are the *internal* structural units of a bounded context. A bounded context is **not** typically one flat namespace.

### Two rival shapes

- **Package by layer** (classic): `domain`, `application`, `infrastructure`, `ui` under each context.
- **Package by feature** (recommended for DDD): top-level folders for each aggregate/use case cluster, with `domain`/`application`/`infra` *inside* each.

### Typical bounded-context layout (package by feature, hexagonal)

```
/order-management                  <- bounded context
  /order                           <- aggregate module
    domain/                        <- entities, VOs, events, repo interface, domain services
    application/                   <- command/query handlers
    infrastructure/                <- repo impl, event publisher, external adapters
  /shipment
    domain/ application/ infrastructure/
  /shared                          <- shared kernel within the context
  composition.ts / Program.cs      <- wiring
```

### Pitfalls

- One "god" module for all entities.
- Cross-module reaching into internals — enforce via module visibility (`internal` in C#, package exports in TS, or linters like `dependency-cruiser`, `ArchUnitNET`).

---

## 8. Specification pattern

Encapsulate a boolean business rule as a first-class object. Useful for:

- **Validation** (does this candidate satisfy the rule?).
- **Selection** (find all items satisfying the rule).
- **Construction** (create the next valid state).

### Example — TypeScript

```typescript
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

export class OverdueInvoice implements Specification<Invoice> {
  constructor(private readonly today: Date) {}
  isSatisfiedBy(i: Invoice) { return i.dueDate < this.today && !i.paid; }
  and(other: Specification<Invoice>)  { return new AndSpec(this, other); }
  or(other: Specification<Invoice>)   { return new OrSpec(this, other); }
  not()                                { return new NotSpec(this); }
}
```

### Example — C#

```csharp
public interface ISpecification<T>
{
    bool IsSatisfiedBy(T candidate);
    ISpecification<T> And(ISpecification<T> other);
    ISpecification<T> Or(ISpecification<T> other);
    ISpecification<T> Not();
}

public sealed class OverdueInvoiceSpec(DateOnly today) : ISpecification<Invoice>
{
    public bool IsSatisfiedBy(Invoice i) => i.DueDate < today && !i.Paid;
    public ISpecification<Invoice> And(ISpecification<Invoice> o) => new AndSpec<Invoice>(this, o);
    public ISpecification<Invoice> Or (ISpecification<Invoice> o) => new OrSpec<Invoice>(this, o);
    public ISpecification<Invoice> Not()                          => new NotSpec<Invoice>(this);
}
```

### Pitfalls

- Specifications that try to be database queries — keep them domain-level; project to an SQL/Firestore filter at the adapter.
- Exposing specifications outside the context as a public API — they are implementation details.

---

## 9. Policies, process managers, sagas

### Definitions

- **Policy.** A named rule that reacts to an event ("*whenever* X happens, *then* Y"). Small, stateless.
- **Process manager (saga).** A stateful coordinator across multiple aggregates (often across contexts) over time.

### Orchestration vs. choreography

- **Orchestration (process manager).** A central object listens for events and issues commands: easier to reason about, explicit state machine, single place to change.
- **Choreography.** Each aggregate reacts to events from others; no central coordinator: more decoupled, harder to visualize, risk of event spaghetti.

Use **orchestration** when the workflow is long, has branches, compensations, SLAs. Use **choreography** when the flow is short, linear, and each step is owned by a different context with autonomy.

### Compensating actions

Distributed workflows cannot use ACID; they use **compensations** — business-meaningful reversals (refund vs. unbook-hotel). Saga design = identify each step and its compensation.

### Fit with DDD

Process managers are first-class domain citizens. Name them in ubiquitous language (`OrderFulfillmentProcess`), version their state, persist them with their own repository. Keep them thin — they orchestrate; aggregates still hold the rules.

---

## 10. Tactical checklists

### 10.1 Is this aggregate well-designed?

- [ ] I can state its invariants on one flipchart.
- [ ] All and only data enforcing those invariants are inside.
- [ ] References to other aggregates are by ID only.
- [ ] A command mutates exactly one aggregate per transaction.
- [ ] Public methods are named in domain language and express intent.
- [ ] No public setters; state changes go through behavior.
- [ ] Collections are exposed read-only.
- [ ] The aggregate raises domain events for significant state transitions.
- [ ] The aggregate loads in < 100 ms for a typical case.

### 10.2 Entity or Value Object? — decision tree

```
Is identity required independently of attributes?                → Entity
Are two with equal attributes interchangeable?                    → Value Object
Does the concept have a lifecycle (created, changed, archived)?   → Entity
Does the concept represent a measurement, quantity, description?  → Value Object
In doubt?                                                         → Value Object; promote later
```

### 10.3 Domain or integration event?

```
Consumer inside this bounded context and process?
├── Yes → Domain event
└── No  → Integration event (versioned schema, outbox, translation at edge)
```

---

## Primary sources for this section

- Evans, *Domain-Driven Design*, Addison-Wesley, 2003 — Part II (tactical patterns).
- Vernon, *Implementing Domain-Driven Design*, Addison-Wesley, 2013 — especially ch. 10.
- Vernon, *"Effective Aggregate Design"* (I–III), dddcommunity.org, 2011.
- Khononov, *Learning Domain-Driven Design*, O'Reilly, 2021 — Part III.
- Bogard, *"A Better Domain Events Pattern"*, jimmybogard.com.
- Khorikov, *Unit Testing Principles, Practices, and Patterns*, Manning, 2020.
- Fowler, *"AnemicDomainModel"*, martinfowler.com, 2003.
