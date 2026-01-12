# Data Architecture Reference

## Core Principle

**Design for queries, not entities.** Schema matches UI requirements, not abstract relationships.

## Storage Hierarchy

```
Project
└── Database (up to 100 per project)
    └── Collection
        └── Document (max 1 MiB)
            └── Subcollection (up to 100 levels deep)
```

**Critical behavior:** Deleting a document does NOT delete its subcollections. They become orphaned.

## Document ID Strategy

### Auto-Generated (Recommended for High Volume)

```typescript
const docRef = await addDoc(collection(db, 'logs'), data);
// ID: statistically unique 20-char string, evenly distributed
```

**Benefits:** Prevents hotspotting, maximizes parallel write throughput.

### Custom IDs (For Direct Lookups)

```typescript
await setDoc(doc(db, 'users', 'john_doe'), data);
```

**Use when:**
- Entity has natural unique key (email, SKU)
- Frequent get-by-ID operations
- Write rate strictly <500/sec

**Never use sequential IDs** (timestamps, auto-increment). Creates hotspots.

## Normalization vs Denormalization

| Factor | Normalize | Denormalize |
|--------|-----------|-------------|
| Write complexity | Low | High (fan-out) |
| Read performance | Slow (N+1 problem) | Fast (1 query) |
| Consistency | Strong | Eventual |
| Storage cost | Low | High |
| Best for | Frequently changing data | Read-heavy, static data |

**Decision rule:** Denormalize data that is frequently read but rarely changed.

## Relationship Patterns

### One-to-One

**Embed** if always accessed together:
```typescript
interface User {
  profile: { bio: string; avatarUrl: string; }
}
```

**Split** if accessed independently or large:
```typescript
// users/{uid}
// userActivity/{uid}  ← Same ID, separate collection
```

### One-to-Many

**Low cardinality (<100):** Embed as array
```typescript
interface User {
  savedAddresses: Address[];  // Max ~50 items
}
```

**High cardinality (>100):** Subcollection
```typescript
// users/{userId}/messages/{messageId}
```

### Many-to-Many

**Array of IDs** (limited scale):
```typescript
interface Post {
  likedBy: string[];  // User IDs
}
// Query: where('likedBy', 'array-contains', userId)
```

**Junction collection** (unlimited scale):
```typescript
// groupMemberships/{id}
interface GroupMembership {
  userId: string;
  groupId: string;
  role: string;
  joinedAt: Timestamp;
}
```

## Fan-Out Architecture

For read-heavy feeds (social media, notifications):

**On Write:**
```typescript
// User creates post
async function createPost(authorId: string, content: string) {
  const postRef = await addDoc(collection(db, 'posts'), {
    authorId, content, createdAt: serverTimestamp()
  });
  
  // Fan out to all followers
  const followers = await getDocs(
    collection(db, `users/${authorId}/followers`)
  );
  
  const batch = writeBatch(db);
  followers.docs.forEach(follower => {
    batch.set(doc(db, `users/${follower.id}/feed`, postRef.id), {
      postId: postRef.id,
      authorId,
      authorName: authorProfile.name,  // Denormalized
      snippet: content.slice(0, 100),
      createdAt: serverTimestamp()
    });
  });
  await batch.commit();
}
```

**On Read:**
```typescript
// O(1) complexity regardless of following count
const feed = await getDocs(
  query(collection(db, `users/${userId}/feed`), 
        orderBy('createdAt', 'desc'), 
        limit(20))
);
```

**Hybrid for celebrities:** Push for normal users, pull for high-follower accounts.

## Hierarchical Data

### Recursive Subcollections

```
comments/{id}/replies/{id}/replies/{id}...
```

**Pros:** Natural isolation, security rules cascade
**Cons:** Cannot query across tree, complex deletion

### Materialized Paths (Recommended)

Flatten hierarchy with path field:

```typescript
interface Comment {
  id: string;
  content: string;
  path: string;  // "/root/parent/this"
  depth: number;
}

// Get all descendants
query(collection(db, 'comments'),
  where('path', '>=', '/commentA/'),
  where('path', '<', '/commentA/~')
);
```

**Trade-off:** Moving nodes requires updating all descendant paths.

## Distributed Counters

**Problem:** 1 write/sec/document limit breaks global counters.

**Solution:**
```typescript
// Structure: counters/{counterId}/shards/{0-9}

const NUM_SHARDS = 10;

async function incrementCounter(counterId: string) {
  const shardId = Math.floor(Math.random() * NUM_SHARDS);
  await updateDoc(
    doc(db, `counters/${counterId}/shards/${shardId}`),
    { count: increment(1) }
  );
}

async function getTotal(counterId: string) {
  const shards = await getDocs(collection(db, `counters/${counterId}/shards`));
  return shards.docs.reduce((sum, d) => sum + d.data().count, 0);
}
```

## Schema Templates by Use Case

### Chat Application

```typescript
// conversations/{conversationId}
interface Conversation {
  type: 'direct' | 'group';
  participantIds: string[];  // For array-contains queries
  lastMessage: {
    content: string;
    senderId: string;
    timestamp: Timestamp;
  };
  metadata: {
    [userId: string]: {
      unreadCount: number;
      lastSeen: Timestamp;
    }
  };
}

// conversations/{conversationId}/messages/{messageId}
interface Message {
  senderId: string;
  content: string;
  timestamp: Timestamp;
  readBy: string[];
}
```

**Inbox query:** `where('participantIds', 'array-contains', myUserId).orderBy('lastMessage.timestamp', 'desc')`

### E-Commerce

```typescript
// products/{productId}
interface Product {
  sku: string;
  name: string;
  price: number;
  attributes: { color: string; size: string; };
  productGroupId: string;  // Links variants
}

// inventory/{productId} - Separate for write isolation
interface Inventory {
  productId: string;
  availableCount: number;
  reservedCount: number;
  reservations: {
    [cartId: string]: {
      quantity: number;
      expiresAt: Timestamp;
    }
  };
}

// users/{userId}/cart/{itemId}
interface CartItem {
  productId: string;
  quantity: number;
  priceAtAdd: number;
  reservedUntil: Timestamp;
}
```

**Inventory transaction:**
```typescript
await runTransaction(db, async (t) => {
  const inv = await t.get(inventoryRef);
  if (inv.data().availableCount < quantity) throw new Error('Out of stock');
  t.update(inventoryRef, {
    availableCount: increment(-quantity),
    [`reservations.${cartId}`]: { quantity, expiresAt }
  });
});
```

### Social Network Feed

```typescript
// posts/{postId}
interface Post {
  authorId: string;
  content: string;
  timestamp: Timestamp;
  visibility: 'public' | 'followers';
  stats: { likeCount: number; commentCount: number; };
}

// users/{userId}/feed/{feedItemId} - Fan-out target
interface FeedItem {
  postId: string;
  authorId: string;
  authorName: string;  // Denormalized
  authorAvatar: string;  // Denormalized
  snippet: string;
  timestamp: Timestamp;
}

// users/{userId}/followers/{followerId}
interface Follower {
  since: Timestamp;
}
```

### CMS with Drafts

```typescript
// articles/{articleId}
interface Article {
  published: {
    title: string;
    body: string;
    updatedAt: Timestamp;
  } | null;
  draft: {
    title: string;
    body: string;
    savedAt: Timestamp;
  };
  status: 'draft' | 'published' | 'archived';
  ownerId: string;
  collaborators: string[];
}

// articles/{articleId}/versions/{versionId}
interface ArticleVersion {
  snapshot: object;
  committedBy: string;
  reason: string;
  timestamp: Timestamp;
}
```

**Publish = copy draft to published atomically.**

### Multi-Tenant

```typescript
// tenants/{tenantId}
interface Tenant {
  plan: 'free' | 'enterprise';
  settings: Record<string, any>;
}

// tenants/{tenantId}/users/{uid}
// tenants/{tenantId}/projects/{projectId}
// tenants/{tenantId}/... (all tenant data nested)
```

**Security rule:**
```javascript
match /tenants/{tenantId}/{document=**} {
  allow read, write: if request.auth.token.tenant_id == tenantId;
}
```

## Anti-Patterns

### Sequential IDs (Hotspot)

```typescript
// WRONG - creates hotspot
doc(db, 'logs', new Date().toISOString())

// CORRECT
addDoc(collection(db, 'logs'), { timestamp: serverTimestamp() })
```

### Unbounded Arrays (Mega-Document)

```typescript
// WRONG - will hit 1 MiB limit
interface User {
  activityLog: Activity[];  // Unbounded
}

// CORRECT - use subcollection
// users/{userId}/activity/{activityId}
```

### Deeply Nested Without Lifecycle

```typescript
// WRONG - orphaned data on delete
orgs/{id}/depts/{id}/teams/{id}/projects/{id}/tasks/{id}

// CORRECT - implement cascade delete via Cloud Function
exports.deleteOrg = functions.firestore
  .document('orgs/{orgId}')
  .onDelete(async (snap) => {
    // Recursively delete all nested collections
  });
```

### Index Explosion

```typescript
// WRONG - dynamic keys create thousands of indexes
interface Analytics {
  visits: {
    [date: string]: number;  // Index per date
  };
}

// CORRECT - exempt from indexing or use subcollection
```

## Schema Migration

### Lazy Migration (Read-Repair)

```typescript
function migrateUser(data: any): User {
  if (data.schemaVersion === 2) return data;
  
  // Migrate v1 to v2
  return {
    ...data,
    name: { first: data.name.split(' ')[0], last: data.name.split(' ')[1] },
    schemaVersion: 2
  };
}

async function getUser(uid: string) {
  const doc = await getDoc(userRef);
  const migrated = migrateUser(doc.data());
  
  // Async write-back
  if (migrated.schemaVersion > doc.data().schemaVersion) {
    updateDoc(userRef, migrated).catch(console.error);
  }
  
  return migrated;
}
```

### Field Rename (Zero Downtime)

1. **Dual write:** Write to both `zipcode` and `postalCode`
2. **Backfill:** Script to copy existing values
3. **Switch read:** Read from `postalCode`, still write both
4. **Cleanup:** Remove old field writes, delete old field

## Decision Trees

### Subcollection vs Root Collection

1. Data exclusively owned by parent? → No: **Root collection**
2. Need cross-parent queries? → Yes: **Root** (or Collection Group with index)
3. Parent would exceed 1 MiB with embedded data? → Yes: **Subcollection**
4. Items < 100 and always loaded together? → **Embed** as array/map

### Index Strategy

1. Field used in queries? → No: **Exempt from indexing**
2. Part of compound query? → Yes: **Create composite index**
3. Otherwise: **Use automatic single-field index**
