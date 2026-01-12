# Quick Reference

## Technical Limits

| Limit | Value | Impact |
|-------|-------|--------|
| Max document size | 1 MiB | Move large data to subcollections |
| Max field depth | 20 levels | Flatten deep nesting |
| Max index entries/doc | 40,000 | Exempt dynamic maps, large arrays |
| Max index entry size | 7.5 KiB | Exempt large text fields |
| Max composite indexes | 200 (Spark) / 1000 (Blaze) | Design queries carefully |
| Sustained write rate/doc | ~1/sec | Use distributed counters |
| Max subcollection depth | 100 levels | Prefer shallow hierarchies |
| Transaction timeout | 270 seconds | Keep transactions short |
| Batch operation limit | 500 ops | Split larger batches |
| Batch size limit | 10 MiB | Split by size if needed |
| `in` / `array-contains-any` | 30 values max | Split into multiple queries |
| Inequality filters | 1 field per query | Combine into composite values |
| Max databases/project | 100 | Usually sufficient |

## Error Code Reference

| Code | HTTP | Retryable | Cause | Fix |
|------|------|-----------|-------|-----|
| UNAVAILABLE | 503 | Yes | Service/network issue | Exponential backoff |
| DEADLINE_EXCEEDED | 504 | Yes | Timeout | Retry, optimize query |
| RESOURCE_EXHAUSTED | 429 | Delayed | Rate/quota limit | Backoff, check quotas |
| FAILED_PRECONDITION | 400 | No | Missing index | Create via error link |
| ABORTED | 409 | Auto | Transaction conflict | SDK retries automatically |
| PERMISSION_DENIED | 403 | No | Security rules | Fix rules or auth state |
| NOT_FOUND | 404 | No | Document doesn't exist | Check path |
| ALREADY_EXISTS | 409 | No | Document exists on create | Use set() or update() |
| INVALID_ARGUMENT | 400 | No | Bad query/data | Fix request structure |

## Security Rules Variables

| Variable | Description |
|----------|-------------|
| `request.auth` | Auth context (null if unauthenticated) |
| `request.auth.uid` | User ID |
| `request.auth.token` | JWT payload with claims |
| `request.auth.token.email` | User email |
| `request.auth.token.email_verified` | Email verification status |
| `request.auth.token.{claim}` | Custom claims |
| `request.auth.token.firebase.sign_in_provider` | Auth method |
| `request.resource.data` | Proposed document state (writes) |
| `request.time` | Server timestamp |
| `resource.data` | Current document state |

## Type Checking in Rules

```javascript
request.resource.data.field is string
request.resource.data.field is int
request.resource.data.field is float
request.resource.data.field is number  // int or float
request.resource.data.field is bool
request.resource.data.field is list
request.resource.data.field is map
request.resource.data.field is timestamp
request.resource.data.field is path
request.resource.data.field is latlng
```

## Common Rule Patterns

### Authenticated Only
```javascript
allow read, write: if request.auth != null;
```

### Owner Only
```javascript
allow read, write: if request.auth.uid == userId;
```

### Verified Email
```javascript
allow write: if request.auth.token.email_verified == true;
```

### Role Check (Claims)
```javascript
allow write: if request.auth.token.role == 'admin';
```

### Field Whitelist
```javascript
allow update: if request.resource.data.diff(resource.data)
              .affectedKeys().hasOnly(['bio', 'avatar']);
```

### Immutable Field
```javascript
allow update: if request.resource.data.createdAt == resource.data.createdAt;
```

### Required Fields
```javascript
allow create: if request.resource.data.keys().hasAll(['title', 'authorId']);
```

### Server Timestamp
```javascript
allow create: if request.resource.data.createdAt == request.time;
```

### Group Membership
```javascript
allow read: if request.auth.uid in resource.data.members;
```

## Query Operators

| Operator | Example | Notes |
|----------|---------|-------|
| `==` | `where('status', '==', 'active')` | Exact match |
| `!=` | `where('status', '!=', 'deleted')` | Expands to two range queries |
| `<`, `<=`, `>`, `>=` | `where('age', '>', 18)` | Only ONE field per query |
| `in` | `where('status', 'in', ['a', 'b'])` | Max 30 values |
| `not-in` | `where('status', 'not-in', ['x'])` | Max 10 values |
| `array-contains` | `where('tags', 'array-contains', 'featured')` | Single value |
| `array-contains-any` | `where('tags', 'array-contains-any', ['a', 'b'])` | Max 30 values |

## Field Value Transforms

```typescript
import { increment, serverTimestamp, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';

// Atomic increment
updateDoc(ref, { count: increment(1) });
updateDoc(ref, { count: increment(-1) });

// Server timestamp
updateDoc(ref, { updatedAt: serverTimestamp() });

// Array operations
updateDoc(ref, { tags: arrayUnion('new-tag') });
updateDoc(ref, { tags: arrayRemove('old-tag') });

// Delete field
updateDoc(ref, { obsoleteField: deleteField() });
```

## CLI Commands

```bash
# Initialize Firestore
firebase init firestore

# Start emulators
firebase emulators:start --only firestore

# Deploy rules only
firebase deploy --only firestore:rules

# Deploy indexes only
firebase deploy --only firestore:indexes

# Export database
gcloud firestore export gs://bucket/path

# Import database
gcloud firestore import gs://bucket/path

# Bulk delete collection
gcloud firestore operations bulk-delete --collection-ids=collectionName
```

## SDK Initialization

### Web (v9 Modular)
```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// For local development
if (location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

### Enable Offline Persistence (Web)
```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open
  } else if (err.code === 'unimplemented') {
    // Browser doesn't support
  }
});
```

### Admin SDK (Node.js)
```typescript
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
// Admin SDK bypasses security rules
```

## Cost Quick Reference

| Operation | Cost (per 100k) |
|-----------|-----------------|
| Reads | $0.06 |
| Writes | $0.18 |
| Deletes | $0.02 |
| Storage | $0.18/GB/month |

**Hidden costs:**
- `count()`: 1 read per 1000 entries
- `offset(n)`: charged for n skipped docs
- Index storage: often > data storage

## Decision Flowchart: Data Location

```
Should data be embedded or in subcollection?

1. Unbounded growth possible?
   YES → Subcollection
   NO → Continue

2. Data size could push doc > 1 MiB?
   YES → Subcollection
   NO → Continue

3. Need to query across parents?
   YES → Root collection (or Collection Group)
   NO → Continue

4. Always loaded with parent?
   YES → Embed
   NO → Subcollection
```

## Decision Flowchart: Index Strategy

```
Should field be indexed?

1. Used in where() or orderBy()?
   NO → Exempt from indexing
   YES → Continue

2. Contains dynamic keys (user-generated)?
   YES → Exempt from indexing
   NO → Continue

3. Large text/blob field?
   YES → Exempt from indexing
   NO → Continue

4. Part of compound query?
   YES → Create composite index
   NO → Use automatic single-field index
```

## Firestore vs Realtime Database

| Feature | Firestore | Realtime Database |
|---------|-----------|-------------------|
| Data model | Documents/Collections | JSON tree |
| Queries | Rich compound queries | Limited |
| Scaling | Automatic, global | Manual sharding |
| Offline | Full support | Full support |
| Pricing | Per operation | Bandwidth + storage |
| Best for | Complex queries, large scale | Simple data, low latency |

## Project Checklist

### Before Launch
- [ ] Security rules tested with emulator
- [ ] No `if true` rules in production
- [ ] Index exemptions configured for large/dynamic fields
- [ ] Composite indexes created for all queries
- [ ] Offline persistence enabled (if needed)
- [ ] Listener cleanup implemented
- [ ] Budget alerts configured

### Performance Review
- [ ] No `offset()` pagination
- [ ] Distributed counters for hot documents
- [ ] Denormalized data for read-heavy paths
- [ ] No sequential document IDs
- [ ] No unbounded arrays
- [ ] 500/50/5 ramp-up for new collections
