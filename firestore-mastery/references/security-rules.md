# Security Rules & Authentication Reference

## Authentication Architecture

### The `request.auth` Object

When authenticated, the JWT is exposed as `request.auth`:

| Property | Description |
|----------|-------------|
| `request.auth.uid` | Unique user identifier (primary key for user-centric patterns) |
| `request.auth.token.email` | User's email address |
| `request.auth.token.email_verified` | Boolean - critical for write permissions |
| `request.auth.token.firebase.sign_in_provider` | Auth method: `password`, `google.com`, `anonymous`, `phone` |
| `request.auth.token.{custom_claim}` | Custom claims set via Admin SDK |

### Custom Claims for RBAC

**Preferred over database lookups** - zero latency, no read cost.

Set via Admin SDK (server-side):
```javascript
admin.auth().setCustomUserClaims(uid, { role: 'admin', subscriptionLevel: 'premium' });
```

Access in rules:
```javascript
allow write: if request.auth.token.role == 'admin';
allow read: if request.auth.token.subscriptionLevel in ['premium', 'enterprise'];
```

**Constraints:**
- Max 1000 bytes per token
- Requires token refresh to propagate (user re-auth or `getIdToken(true)`)
- Use for high-level roles; store fine-grained permissions in database

### Claims vs Database Lookup

| Feature | Custom Claims | Database `get()` |
|---------|---------------|------------------|
| Performance | Zero latency | High latency |
| Cost | Free | 1 read per evaluation |
| Consistency | Eventual (token refresh) | Strong (immediate) |
| Size Limit | 1000 bytes | 1 MB per document |

### Anonymous Authentication

- Creates temporary session with valid `uid`
- Gate sensitive operations:
```javascript
allow write: if request.auth.token.firebase.sign_in_provider != 'anonymous';
```
- Account linking preserves `uid` - no data migration needed

### Multi-Factor Authentication

Check for stronger auth methods:
```javascript
allow write: if request.auth.token.firebase.sign_in_provider in ['google.com', 'phone'];
```

## Security Rules Syntax

### Service Declaration

```javascript
rules_version = '2';  // Required for recursive wildcards
service cloud.firestore {
  match /databases/{database}/documents {
    // Rules here
  }
}
```

### Match Statements

**Single-segment wildcard:**
```javascript
match /users/{userId} {
  // userId captures the document ID
}
```

**Recursive wildcard (requires version 2):**
```javascript
match /{document=**} {
  // Matches all documents at any depth
}
```

**Nested matches:**
```javascript
match /cities/{city} {
  match /landmarks/{landmark} {
    // Applies to /cities/SF/landmarks/GoldenGate
  }
}
```

### Allow Methods

| Method | Applies To |
|--------|------------|
| `read` | Both `get` and `list` |
| `get` | Single document fetch by ID |
| `list` | Collection queries |
| `write` | `create`, `update`, and `delete` |
| `create` | Writing to non-existent path |
| `update` | Writing to existing path |
| `delete` | Removing a document |

**Granular control:**
```javascript
allow get: if true;           // Can read known IDs
allow list: if false;         // Cannot browse collection
allow create: if true;        // Can create new
allow update, delete: if false; // Cannot modify existing
```

### Evaluation Logic

Rules use **OR** logic - if ANY matching rule returns true, access is granted.

**Cannot deny specifically** - omission is denial:
```javascript
// WRONG thinking: "allow globally then deny admin"
// If ANY rule passes, access is granted

// CORRECT: Only write specific allowances
match /public/{doc} { allow read: if true; }
match /private/{doc} { allow read: if request.auth != null; }
// /admin has no rule = denied
```

## Access Control Patterns

### Content-Owner Only (Path-Based)

```javascript
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### Content-Owner Only (Field-Based)

```javascript
match /posts/{postId} {
  allow read: if true;
  allow update, delete: if request.auth.uid == resource.data.authorId;
}
```

### Role-Based (Claims)

```javascript
function isAdmin() {
  return request.auth.token.role == 'admin';
}

match /adminData/{doc} {
  allow read, write: if isAdmin();
}
```

### Role-Based (Database Lookup - Fallback)

```javascript
function getUserRole() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
}

match /protected/{doc} {
  allow write: if getUserRole() == 'editor';
}
```

### Group-Based Access

```javascript
match /chat_rooms/{roomId} {
  allow read: if request.auth.uid in resource.data.members;
}

// For subcollections, check parent:
match /chat_rooms/{roomId}/messages/{messageId} {
  allow read: if request.auth.uid in 
    get(/databases/$(database)/documents/chat_rooms/$(roomId)).data.members;
}
```

### Tiered Authentication

```javascript
match /reviews/{reviewId} {
  // Anyone can read
  allow read: if true;
  
  // Only verified email users can write
  allow create: if request.auth != null 
                && request.auth.token.email_verified == true;
  
  // Only owner can update/delete
  allow update, delete: if request.auth.uid == resource.data.authorId;
}
```

## Schema Enforcement in Rules

### Type Validation

```javascript
allow create: if request.resource.data.name is string
              && request.resource.data.age is int
              && request.resource.data.tags is list
              && request.resource.data.metadata is map;
```

### Required Fields

```javascript
allow create: if request.resource.data.keys().hasAll(['title', 'authorId', 'createdAt']);
```

### Value Constraints

```javascript
allow create: if request.resource.data.status in ['draft', 'published', 'archived']
              && request.resource.data.rating >= 1
              && request.resource.data.rating <= 5;
```

### Field Immutability

```javascript
// Prevent field modification
allow update: if request.resource.data.createdAt == resource.data.createdAt
              && request.resource.data.authorId == resource.data.authorId;
```

### Allowed Fields Only (Whitelist)

```javascript
allow update: if request.resource.data.diff(resource.data).affectedKeys()
              .hasOnly(['bio', 'avatarUrl', 'displayName']);
```

### Server Timestamp Enforcement

```javascript
allow create: if request.resource.data.createdAt == request.time;
allow update: if request.resource.data.updatedAt == request.time;
```

## Query Constraints

**Rules are NOT filters.** Query must match rule constraints.

Rule:
```javascript
allow list: if resource.data.visibility == 'public';
```

**Required query:**
```javascript
// This works
db.collection('posts').where('visibility', '==', 'public').get();

// This FAILS with PERMISSION_DENIED (even if all docs are public)
db.collection('posts').get();
```

### Collection Group Queries

Require explicit rule definition:
```javascript
match /{path=**}/comments/{comment} {
  allow read: if request.auth != null;
}
```

## Time-Based Access

```javascript
// Temporary access window
allow read: if request.time < timestamp.date(2025, 12, 31);

// Rate limiting (approximate)
allow update: if request.time > resource.data.lastUpdated + duration.value(1, 'm');
```

## Testing Security Rules

### Emulator Setup

```bash
firebase emulators:start --only firestore
```

### Unit Testing

```typescript
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const testEnv = await initializeTestEnvironment({
  projectId: 'test-project',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') }
});

// Test as authenticated user
const aliceDb = testEnv.authenticatedContext('alice', { 
  email: 'alice@test.com',
  email_verified: true 
}).firestore();

// Test as unauthenticated
const unauthDb = testEnv.unauthenticatedContext().firestore();

// Assertions
await assertSucceeds(getDoc(doc(aliceDb, 'users/alice')));
await assertFails(getDoc(doc(aliceDb, 'users/bob')));
await assertFails(getDoc(doc(unauthDb, 'users/alice')));

// Cleanup
await testEnv.clearFirestore();
```

### Coverage Reports

```bash
# Generate coverage after tests
firebase emulators:exec --only firestore "npm test"
# Coverage report at http://localhost:8080/emulator/v1/projects/test:ruleCoverage.html
```

## Vulnerability Checklist

| Anti-Pattern | Risk | Fix |
|--------------|------|-----|
| `allow read, write: if true` | Full public access | Never deploy to production |
| `allow read, write: if request.auth != null` | Any authenticated user can delete everything | Scope to ownership or roles |
| `request.resource.data.userId == request.resource.data.userId` | Tautology (always true) | Compare to `request.auth.uid` |
| No `email_verified` check on writes | Bot/spam accounts | Add `request.auth.token.email_verified == true` |
| Forgetting subcollection rules | Exposed child data | Use recursive wildcard or explicit rules |

## Admin SDK Bypass

Server-side Admin SDK **bypasses all security rules**. It authenticates via service account IAM roles.

**Implications:**
- Backend must implement its own validation
- Use IAM principle of least privilege (`roles/datastore.user` not `roles/datastore.owner`)
- Never expose Admin SDK credentials to clients
