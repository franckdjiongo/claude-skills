# Performance & Operations Reference

## Indexing Architecture

### Single-Field Indexes (Automatic)

Firestore auto-creates two indexes per field (ascending + descending) plus array-contains for arrays.

**Impact:** 20-field document = 41+ index entries per write.

### Composite Indexes (Manual)

Required when:
- Inequality filter + orderBy on different field
- Multiple field constraints in complex sort order

Created via Firebase Console or error message link.

**Limit:** 200 composite indexes (Spark) / 1000 (Blaze)

### Index Exemptions

**When to exempt:**
- Large text/blob fields never used in queries
- Map fields with dynamic keys
- High-velocity sequential fields (timestamps) on write-heavy collections

**Configure in:** Firebase Console → Firestore → Indexes → Single Field

### Index Limits per Document

| Limit | Value |
|-------|-------|
| Max index entries | 40,000 |
| Max index entry size | 7.5 KiB |
| Max composite indexes | 200/1000 |

**Breach = write failure.** Large arrays or dynamic maps can easily hit 40k limit.

## Query Optimization

### Operator Performance

| Operator | Performance | Notes |
|----------|-------------|-------|
| `==` | Optimal | Direct index lookup |
| `>`, `<`, `>=`, `<=` | Good | Only ONE inequality field per query |
| `array-contains` | Good | Index size grows with array cardinality |
| `in`, `array-contains-any` | Moderate | Executes N parallel queries, max 30 values |
| `!=`, `not-in` | Poor | Scans both sides of excluded value |

### The Inequality Constraint

**Only one field can have inequality filters per query.**

```javascript
// INVALID - two inequality fields
query(collection(db, 'users'), 
  where('age', '>', 18), 
  where('salary', '>', 50000)  // FAILS
);

// VALID - one inequality, one equality
query(collection(db, 'users'), 
  where('age', '>', 18), 
  where('department', '==', 'engineering')
);
```

### Pagination: Cursors vs Offsets

**Never use offset() for deep pagination.**

| Method | Page 500 Cost | Latency |
|--------|---------------|---------|
| `offset(10000).limit(20)` | 10,020 reads | High |
| `startAfter(lastDoc).limit(20)` | 20 reads | Low |

**Cursor implementation:**
```typescript
// Store last doc from previous page
const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

// Next page
const nextQuery = query(
  collection(db, 'posts'),
  orderBy('createdAt', 'desc'),
  startAfter(lastVisible),
  limit(20)
);
```

### Vector Search

```typescript
const embedding = [0.1, 0.5, ...]; // Up to 2048 dimensions
const results = await getDocs(
  collection(db, 'docs').findNearest('embedding_field', embedding, {
    limit: 10,
    distanceMeasure: 'COSINE' // or EUCLIDEAN, DOT_PRODUCT
  })
);
```

**Billing:** 1 read per 100 vector entries scanned + document reads.

### Full-Text Search

Firestore lacks native full-text search. Solutions:

1. **Prefix search** (limited):
```typescript
query(collection(db, 'products'),
  orderBy('name'),
  startAt('app'),
  endAt('app\uf8ff')
);
```

2. **External search** (recommended): Algolia, Elasticsearch, Typesense via Firebase Extensions

## Transactions & Atomic Operations

### Batched Writes

Use when writes don't depend on current values.

```typescript
const batch = writeBatch(db);
batch.set(doc(db, 'users/alice'), { name: 'Alice' });
batch.update(doc(db, 'users/bob'), { status: 'active' });
batch.delete(doc(db, 'users/charlie'));
await batch.commit();
```

**Limits:** 500 operations, 10 MiB total size.

### Transactions

Use when writes depend on current values.

```typescript
await runTransaction(db, async (transaction) => {
  const doc = await transaction.get(accountRef);
  const newBalance = doc.data().balance - amount;
  if (newBalance < 0) throw new Error('Insufficient funds');
  transaction.update(accountRef, { balance: newBalance });
});
```

**Cannot work offline.** Requires real-time connection.

### Concurrency Models

| Environment | Model | Behavior |
|-------------|-------|----------|
| Mobile/Web SDK | Optimistic | Auto-retry on conflict |
| Server SDK | Pessimistic | Locks documents during transaction |

### Field Value Transforms

Atomic server-side operations:

```typescript
// Atomic increment (no read-modify-write race)
updateDoc(docRef, { likeCount: increment(1) });

// Server timestamp (clock-skew safe)
updateDoc(docRef, { updatedAt: serverTimestamp() });

// Array operations
updateDoc(docRef, { 
  tags: arrayUnion('new-tag'),
  removedTags: arrayRemove('old-tag')
});
```

### Distributed Counters

Single document limit: ~1 write/sec sustained.

**Sharding pattern:**
```typescript
const NUM_SHARDS = 10;

// Write to random shard
async function incrementCounter(counterId: string) {
  const shardId = Math.floor(Math.random() * NUM_SHARDS);
  const shardRef = doc(db, `counters/${counterId}/shards/${shardId}`);
  await updateDoc(shardRef, { count: increment(1) });
}

// Read total
async function getCount(counterId: string) {
  const shards = await getDocs(collection(db, `counters/${counterId}/shards`));
  return shards.docs.reduce((sum, doc) => sum + doc.data().count, 0);
}
```

Scale shards as traffic grows.

## Real-time Listeners

### Listener Management

```typescript
// Subscribe
const unsubscribe = onSnapshot(
  query(collection(db, 'messages'), where('roomId', '==', roomId)),
  (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') handleNew(change.doc);
      if (change.type === 'modified') handleUpdate(change.doc);
      if (change.type === 'removed') handleDelete(change.doc);
    });
  },
  (error) => console.error('Listener error:', error)
);

// CRITICAL: Unsubscribe on cleanup
unsubscribe();
```

**Memory leak warning:** Failing to unsubscribe creates "ghost listeners" - accumulating memory and billing.

### Snapshot Metadata

```typescript
onSnapshot(docRef, (snapshot) => {
  if (snapshot.metadata.fromCache) {
    // Data from local cache (optimistic)
  }
  if (snapshot.metadata.hasPendingWrites) {
    // Local changes not yet confirmed by server
  }
});
```

### Offline Persistence

**Enabled by default on mobile.** On web:
```typescript
enableIndexedDbPersistence(db);
```

**Cache size:** 100 MB default (40 MB web), configurable.

**Billing trap:** Without persistence, reconnects re-bill full result set. With persistence, only delta changes are billed.

## Error Handling

| Code | HTTP | Meaning | Action |
|------|------|---------|--------|
| UNAVAILABLE | 503 | Service overload/network down | Retry with exponential backoff |
| DEADLINE_EXCEEDED | 504 | Timeout | Retry, optimize query |
| RESOURCE_EXHAUSTED | 429 | Rate/quota limit | Backoff, check quotas |
| FAILED_PRECONDITION | 400 | Missing index | Create index via error link |
| ABORTED | 409 | Transaction conflict | Retry (SDK handles automatically) |
| PERMISSION_DENIED | 403 | Security rules rejection | Fix rules or app logic |

### Exponential Backoff

```typescript
async function withBackoff<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 'unavailable' && attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

### Cloud Function Idempotency

Prevent infinite retry loops:
```typescript
exports.processOrder = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    // Skip if event is old (retry loop breaker)
    const eventAge = Date.now() - Date.parse(context.timestamp);
    if (eventAge > 60000) return;
    
    // Idempotent operation
    await snap.ref.set({ processed: true }, { merge: true });
  });
```

## Cost Optimization

### Pricing (approximate)

| Operation | Cost per 100k |
|-----------|---------------|
| Reads | $0.06 |
| Writes | $0.18 |
| Deletes | $0.02 |
| Storage | $0.18/GB/month |

**Hidden costs:**
- `count()` aggregations: 1 read per 1000 entries
- `offset()` pagination: charged for skipped docs
- Index storage often exceeds data storage

### Optimization Tactics

1. **Denormalize:** Duplicate data to reduce reads (storage is cheap, reads are expensive)

2. **Aggregation documents:** Maintain counters via `increment()` instead of `count()` queries

3. **Index exemptions:** Reduce storage and write amplification

4. **Cursor pagination:** Never use `offset()` for deep pages

5. **Offline persistence:** Reduces reconnection costs

6. **Listener cleanup:** Prevent ghost listener billing

### Billing Plans

| Plan | Limits | Notes |
|------|--------|-------|
| Spark (Free) | 50k reads/day, 20k writes/day | Hard stop at limit |
| Blaze (Pay-as-you-go) | Essentially unlimited | 20-40% savings with Committed Use Discounts |

### Budget Alerts

Configure in Google Cloud Billing. Alerts at 50%, 90%, 100% of budget.

**No automatic shutoff.** To hard-cap, implement Cloud Function that disables billing via API (takes app offline).

## Monitoring

### Key Visualizer

Diagnoses access patterns:
- **Ramping (uniform brightness):** Healthy growth
- **Diagonal lines:** Sequential key hotspot (bad)
- **Horizontal bands:** Single document hotspot (bad)

### The 500/50/5 Rule

For new collections (cold tablets):
1. Start at 500 ops/sec
2. Increase by 50% every 5 minutes
3. Allows tablet splitting without 503 errors

### Client-Side Monitoring

Use Firebase Performance Monitoring:
```typescript
const trace = perf.trace('load_feed');
await trace.start();
const data = await getDocs(feedQuery);
await trace.stop();
```

## Backup & Recovery

### Scheduled Backups

- Daily/Weekly via Cloud Console
- Retention: up to 14 weeks
- Restore creates NEW database (not rollback)

### Point-in-Time Recovery (PITR)

- Must be enabled (increases storage cost)
- 7-day recovery window
- Restores to new database instance

### Bulk Operations

```bash
# Export to Cloud Storage
gcloud firestore export gs://bucket-name

# Import
gcloud firestore import gs://bucket-name/export-prefix

# Bulk delete (efficient)
gcloud firestore operations bulk-delete --collection-ids=collection1,collection2
```
