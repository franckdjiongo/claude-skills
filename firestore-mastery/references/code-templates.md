# Code templates, rule snippets, testing and deployment

Snippets moved out of SKILL.md.

## Locked starter rules

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

## Security rule patterns

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
## Code templates

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
