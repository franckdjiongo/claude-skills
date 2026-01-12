---
name: firestore-mastery
description: Expert guidance for Firebase/Firestore development including project setup, security rules, data modeling, performance optimization, and troubleshooting. Use when working with Firebase, Firestore, Cloud Firestore for (1) Setting up new Firebase projects, (2) Writing or debugging security rules, (3) Designing data schemas and collections, (4) Optimizing queries and indexes, (5) Implementing authentication flows, (6) Troubleshooting performance issues or errors, (7) Cost optimization, (8) Real-time listeners and offline persistence, (9) Migrations and schema evolution. Triggers on mentions of Firebase, Firestore, security rules, NoSQL schema design, real-time database, document database, or Firebase Authentication.
---

# Firestore Mastery

Expert guidance for Cloud Firestore architecture, security, and operations.

## Core Philosophy

Firestore is read-optimized. Design schemas to match UI queries, not entity relationships. Accept denormalization as the norm.

**Key constraints to internalize:**
- 1 MiB max document size
- 1 write/sec sustained per document (soft limit)
- No server-side JOINs
- Security rules are NOT filters
- Queries scale with result size, not dataset size

## Reference Files

Load these based on the task:

| Task | Reference File |
|------|----------------|
| Security rules, auth, RBAC | `references/security-rules.md` |
| Indexing, queries, transactions, costs | `references/performance-ops.md` |
| Schema design, relationships, patterns | `references/data-architecture.md` |
| Limits, error codes, decision trees | `references/quick-reference.md` |

## Workflow by Task Type

### Project Setup

1. Choose database mode:
   - **Native Mode** (default): Mobile/web apps, real-time sync, offline support
   - **Datastore Mode**: Server-only, massive write throughput, no real-time

2. Initialize:
```bash
firebase init firestore
```

3. Start with locked rules, then add specific allowances:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Security Rules Development

**Always load `references/security-rules.md` for detailed patterns.**

Core pattern - Content-Owner Access:
```javascript
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

RBAC with Custom Claims (preferred over database lookups):
```javascript
allow write: if request.auth.token.role == 'admin';
```

Schema enforcement:
```javascript
allow create: if request.resource.data.name is string
              && request.resource.data.age is int
              && request.resource.data.age >= 0;
```

**Critical: Rules are not filters.** Query constraints must match rule constraints.

### Schema Design

**Always load `references/data-architecture.md` for patterns.**

Decision flow for child data:
1. Owned exclusively by parent? → Consider subcollection
2. Need cross-parent queries? → Root collection or Collection Group
3. <100 items and always loaded together? → Embed as array/map
4. Unbounded growth? → Subcollection (never embed unbounded arrays)

### Performance Optimization

**Always load `references/performance-ops.md` for details.**

Quick wins:
- Use cursor pagination (`startAfter`), never `offset(n)`
- Exempt large/sequential fields from indexing
- Use `FieldValue.increment()` for counters
- Enable offline persistence to avoid re-billing on reconnects

### Troubleshooting

| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| PERMISSION_DENIED | Security rules | Check rules logic, verify auth token |
| FAILED_PRECONDITION | Missing index | Create index via console link in error |
| High latency on writes | Hotspotting | Check Key Visualizer, exempt sequential indexes |
| 429/RESOURCE_EXHAUSTED | Rate limit | Check quotas, implement backoff |
| Document too large | >1 MiB | Move data to subcollection |

## Anti-Patterns (Never Do)

1. **Sequential IDs**: Never use timestamps or auto-increment as doc IDs
2. **Unbounded arrays**: Move to subcollection if >50 items
3. **Test mode in production**: Never deploy `allow read, write: if true`
4. **Auth-only access**: `if request.auth != null` alone is insufficient
5. **Missing unsubscribe**: Always clean up `onSnapshot` listeners

## Code Templates

### Basic CRUD with Auth
```typescript
// Read user's own data
const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));

// Write with server timestamp
await setDoc(doc(db, 'posts', postId), {
  content,
  authorId: auth.currentUser.uid,
  createdAt: serverTimestamp()
});
```

### Cursor Pagination
```typescript
const firstPage = await getDocs(
  query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20))
);
const lastDoc = firstPage.docs[firstPage.docs.length - 1];

const nextPage = await getDocs(
  query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(20))
);
```

### Real-time Listener with Cleanup
```typescript
const unsubscribe = onSnapshot(
  query(collection(db, 'messages'), where('roomId', '==', roomId)),
  (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') handleNewMessage(change.doc.data());
    });
  }
);
// On cleanup
unsubscribe();
```

### Distributed Counter
```typescript
// Write to random shard
const shardId = Math.floor(Math.random() * NUM_SHARDS);
await updateDoc(doc(db, `counters/${counterId}/shards/${shardId}`), {
  count: increment(1)
});

// Read total
const shards = await getDocs(collection(db, `counters/${counterId}/shards`));
const total = shards.docs.reduce((sum, doc) => sum + doc.data().count, 0);
```

### Transaction for Atomic Updates
```typescript
await runTransaction(db, async (transaction) => {
  const fromDoc = await transaction.get(fromRef);
  const toDoc = await transaction.get(toRef);
  
  if (fromDoc.data().balance < amount) throw new Error('Insufficient funds');
  
  transaction.update(fromRef, { balance: increment(-amount) });
  transaction.update(toRef, { balance: increment(amount) });
});
```

## Testing Security Rules

Use Firebase Emulator Suite:
```bash
firebase emulators:start --only firestore
```

Test with `@firebase/rules-unit-testing`:
```typescript
const testEnv = await initializeTestEnvironment({ projectId: 'test' });
const alice = testEnv.authenticatedContext('alice');

await assertSucceeds(getDoc(doc(alice.firestore(), 'users/alice')));
await assertFails(getDoc(doc(alice.firestore(), 'users/bob')));
```

## Deployment

```bash
# Deploy rules only
firebase deploy --only firestore:rules

# Deploy indexes only
firebase deploy --only firestore:indexes
```

Rules propagate within minutes; edge caching may cause up to 10-minute inconsistency window.
