# Monetization and StoreKit

Monetization is an entitlement problem before it is a purchase-button problem: the app must answer "what is this user allowed to do right now?" correctly at every launch, offline, after a refund, after a restore on a new Mac, and after a subscription lapses. Purchasing is one input to that answer. Which store you can use is fixed by the distribution channel (`references/distribution-security.md`): StoreKit and in-app purchase exist only for Mac App Store builds; direct distribution needs your own licensing.

## Choose the business model first

| Model | Fits when | Watch out for |
|---|---|---|
| Paid upfront | Simple utility, clear value at first launch, no trial needed | No trial on the App Store without extra work; upgrades are hard to charge for |
| Free + one-time unlock (non-consumable) | Try-before-buy, single "Pro" tier, value does not grow monthly | Lifetime support cost for one payment; plan a paid upgrade path |
| Paid upgrades (new product or version-based unlock) | Major versions with real new value; existing customers keep what they paid for | On the App Store this means a separate product or non-consumable per major version; direct licensing handles it more naturally |
| Subscription | Genuine recurring value: ongoing service, sync/server cost, continuously updated content | Users resent subscriptions for static tools; requires grace periods, lapse handling, and clear cancellation; App Review scrutiny |
| Direct license outside the App Store | Developer ID distribution; you want control of pricing, trials, site licenses, education pricing | You own payment, tax, refunds, key delivery, updates, fraud handling |

Do not default to subscriptions. Pick the model that matches how value is delivered, write it in `PRODUCT_BRIEF.md`, and record the decision as an ADR together with the distribution channel. Trial length, device limits, grace periods, and refund policy are business decisions the user makes; the skill implements them and asks when they are unspecified.

## StoreKit as an entitlement system

The pipeline every paid feature passes through, in order:

```
Purchase initiated
  → Transaction verified          (cryptographic verification result, never trust "success" alone)
  → Entitlement determined        (from verified transaction + current entitlements + revocation/expiry)
  → Feature granted               (UI reads the entitlement state, not the purchase result)
  → Transaction completed         (finish only after the entitlement is durably recorded)
  → Entitlement reconstructed on next launch  (from current entitlements, works offline from cache)
```

Confirm API names against the exported Apple skill or current StoreKit documentation; the shape is stable, signatures evolve.

- **Verified results.** Every transaction and product entitlement comes back as a verification result. Only the verified case grants anything; the unverified case is logged (`references/debugging-observability.md`, no user data) and treated as absent. Do not ship code that unwraps the payload regardless of verification.
- **Current entitlements.** At launch and on demand, iterate current entitlements to rebuild the entitlement state from scratch. This is the source of truth; purchase callbacks are events that update it.
- **Transaction updates listener.** Start a long-lived task at launch that listens for transaction updates (purchases completed elsewhere, renewals, revocations, Ask to Buy approvals). Process each: verify, update entitlement state, finish. An app without this listener strands purchases made outside the current process.
- **Finishing.** Finish a transaction only after the grant is recorded; an unfinished transaction is redelivered, which is the recovery mechanism, not a bug.
- **Restore/recovery.** Provide a visible "Restore Purchases" action (App Review expects it) that syncs with the App Store and re-derives entitlements; recovery on a new Mac must work without the user contacting support.
- **Revoked and expired.** Refunds produce revocation; subscriptions expire or enter grace/billing-retry states. The entitlement derivation reads revocation date and expiration/renewal info and demotes features accordingly, with a humane UI (data stays readable; export always works).
- **Offline startup.** Current entitlements are cached by the system; the app must launch and grant the last-known entitlement without network. Never block launch on a product fetch or a receipt/server round trip. If the cache is empty and the network is down, show the free tier with a "checking…" state rather than an error.
- **Error handling.** Distinguish user cancellation (silent), pending (Ask to Buy — show waiting state), network failures (retry later, keep last state), and verification failure (log, treat as no entitlement). Product fetch failures must not hide the purchase UI forever; show a retry.

## The entitlement gate lives in one place

All feature checks go through a single type; nothing else in the app asks StoreKit or the license service directly.

```swift
// verify against installed SDK
enum Feature: CaseIterable { case export, unlimitedItems, sync }

@MainActor @Observable
final class EntitlementGate {
    private(set) var state: EntitlementState = .unknown
    private let provider: any EntitlementProvider     // StoreKitProvider or LicenseProvider

    func allows(_ feature: Feature) -> Bool { state.tier.includes(feature) }

    func refresh() async { state = await provider.currentState() }   // launch, foreground, after purchase/restore
}
```

Views read `gate.allows(.export)`; the provider behind it is the only code touching StoreKit or licensing, which makes App Store and direct builds share the same feature code, keeps tests simple (inject a fake provider, `references/testing-quality.md`), and makes the grant logic auditable in one file. Feature-flag checks scattered across views are how refunded users keep Pro and paying users lose it.

## Testing purchases

- **StoreKit configuration file** in the project (synced from App Store Connect or hand-written) attached to the scheme's Run and Test actions. It enables local purchases without an account, and lets you simulate refunds, renewals, expiration, Ask to Buy, interrupted purchases, and failing transactions from Xcode's transaction manager.
- **Automated tests**: purchase → entitlement granted; restore on empty state; revocation → demoted; expiry → demoted; offline launch with cached entitlement; unverified transaction → not granted; listener handles an update arriving before the UI is ready. Use the StoreKit testing framework in tests where the toolchain supports it (confirm against the installed Xcode).
- **Sandbox testers**: App Store Connect sandbox accounts exercise the real App Store sandbox with the exported Release build — subscription time is accelerated there. Test the Release build against the sandbox before submission; a StoreKit configuration only applies when run from Xcode, which is a classic release-only difference (`references/debugging-observability.md`).
- **App Review**: reviewers purchase in the sandbox; include the restore path and make gated features discoverable.

## Direct-distribution licensing architecture

Outside the App Store you own the whole loop. Keep the same pipeline shape: license presented → validated → entitlement determined → feature granted → entitlement reconstructed on launch.

- **License key format and validation.** Prefer keys that carry a signed payload (customer, tier, issue date, optional expiry, device limit) verified offline with a public key embedded in the app; the private key never ships. Pure server-side validation is simpler to revoke but fails offline and adds a network destination; a hybrid (offline verification, periodic online confirmation with a grace window) is the common production choice. Record which in the ADR.
- **Storage.** The license and any activation token go in the Keychain (`references/data-network-security.md`), never in `UserDefaults` or a plist; the cached entitlement state can be in preferences because it is re-derived from the license.
- **Trial policy.** Time-based trials need a tamper-resistant start date (Keychain item plus server record when online); feature-limited trials avoid the clock problem. Decide with the user.
- **Device limits and activation.** Limits require a server and an activation/deactivation UI; deactivation must work from the app so users can move Macs without support tickets. Identify devices with a stable, privacy-respecting identifier you generate and store, not hardware serials.
- **Revocation and refunds.** Server-driven; the app checks on a schedule with a grace window so a temporary outage never locks a paying customer out.
- **Payment provider.** Merchant-of-record services handle tax and invoicing; others leave that to you. Evaluate; the app only needs a way to receive a key or a token.
- **Updates** are part of the paid promise; see the update section of `references/distribution-security.md`.

## Privacy inventory implications

Each of these becomes an entry in `PRIVACY_INVENTORY.md` (template in `templates/PRIVACY_INVENTORY.md`) with purpose, storage, network destination, retention, user control, and Apple declarations:

- App Store transaction identifiers and entitlement cache (Apple-managed, but your cache is data you hold).
- License key, activation token, device identifier, trial start (Keychain; licensing server destination; retention while the license exists; user control via deactivation/sign-out).
- Any receipt or license-check telemetry — declare it or do not collect it.
- Logging: transaction and license identifiers are private-level in `Logger`; never log keys.

`scripts/privacy-audit.sh` cross-checks the inventory against the network client entitlement and the privacy manifest; run it after adding any licensing or StoreKit code.
