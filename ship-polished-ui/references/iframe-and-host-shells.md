# Iframes and Host Shells — Visual QA Gotchas

When the app under test runs inside an iframe or embedded host shell (Power Apps Code App, Salesforce Lightning embed, Microsoft Teams app, sandboxed preview, etc.), several visual / debugging behaviors flip. Read this before debugging UI inside such a context.

## Identifying the situation

Common signals that you're inside a host shell:

- The page URL is `apps.powerapps.com/play/...?_localAppUrl=http://localhost:5173/...` or similar (Power Apps local play)
- The address bar shows `lightning.force.com` and the app is in `/lightning/...` (Salesforce Lightning)
- The user references "Teams app", "Power Apps Code App", "Salesforce app", "embed", "iframe"
- A direct visit to `localhost:5173/` shows a loading spinner forever (because the app needs SDK context that only the host shell provides)

If any of these apply, this reference is mandatory before debugging.

## What changes inside a host shell / cross-origin iframe

### 1. You cannot inspect the iframe's DOM from the parent

Host shells almost always render the app in a **cross-origin iframe**. From the parent page (where your browser MCP runs):

- `iframe.contentDocument` throws / returns null — cross-origin policy.
- `document.querySelectorAll('section[aria-label=...]')` doesn't reach inside the iframe.
- The `read_page` accessibility tool doesn't see iframe content (it shows the host shell's outer chrome, not the app).
- Network requests from inside the iframe are not visible to the parent's `read_network_requests`.

**Practical implication**: you cannot use JS-injection-based debugging (e.g., `getBoundingClientRect` on `.surface`). Your debugging is **screenshot-driven**: zoom, scroll, click. Build the discipline to extract layout info from images, not from `getComputedStyle`.

### 2. Vite (or whatever dev server) serves CSS based on the iframe's viewport

If your CSS uses `@media (max-width: ...)`, those queries match the **iframe's** width — not the parent window's width. The iframe might be 1080px even when the host browser is 1920px, depending on host-shell layout.

**Practical implication**:

- Before assuming a `@media` breakpoint isn't firing, measure the iframe's actual width: `document.getElementById('fullscreen-app-host').getBoundingClientRect()` from the parent (this works — element bounds are not cross-origin).
- If a layout looks broken at the user's host-shell width but fine when you visit `localhost:5173` directly in a regular tab, you've crossed a `@media` breakpoint that the iframe-sized viewport triggers.

### 3. `background-attachment: fixed` is unreliable

Inside an iframe, "fixed" anchors to the **iframe's** viewport, not the host page's window. Combined with the iframe's own scrolling behavior and the parent shell's layout, the result is often that fixed-attached backgrounds don't cover what you'd expect.

**The session that birthed this skill spent multiple iterations on this exact bug.** The right fix was to move the background to the **scroll-parent element** (the one with `overflow: auto; height: 100%`) and let the default `background-attachment: scroll` do its thing — the scroll parent's box equals the visible viewport, so `background-size: 100% 100%` always covers the right area.

### 4. The host shell adds its own chrome — strip it from screenshot interpretation

Power Apps shows a top toolbar (~48 px tall), a "Your app is running in local mode" banner (~24 px tall), and a sidebar in some modes. Salesforce embeds show navigation tabs above. Teams adds its own header.

**Practical implication**: when you take a "full screen" screenshot, the first ~50–100 px is host chrome, not your app. Don't waste time trying to fix what's actually the host's banner.

### 5. Direct localhost visits don't work

Visiting `http://localhost:5173/` (or whatever the dev port is) in a fresh tab usually shows a loading state forever — the app is waiting for SDK context that only the host shell provides. Don't try to "skip the iframe" by going direct; you have to debug inside the host shell.

The exception is fetching a specific Vite-served CSS file via curl — that works for inspecting what CSS is actually being served (useful when HMR has been weird).

### 6. CMD+R / page reload kills the SSO session

Reloading the host shell tab usually redirects to a Microsoft / Salesforce / Okta login screen. Avoid `cmd+R`. If you need a "fresh" state, ask the user to refresh; the session restoration is usually painless for them but disruptive for an automated debugging flow.

### 7. The browser MCP may have multiple browsers connected

If the user has Chrome installed on multiple machines (work laptop, home, etc.), the browser MCP may list several. **Don't auto-pick** — ask the user (or use `switch_browser` to broadcast a confirm-prompt to every connected browser; the user clicks Connect on the right one).

## Checklist when debugging UI in a host shell

1. **Confirm the iframe is the right target.** Run `tabs_context_mcp` and verify the URL is the host-shell URL, not a direct `localhost:5173`.
2. **Measure iframe dimensions.** From the parent: `getBoundingClientRect()` on the iframe element. This is your real viewport for `@media` purposes.
3. **Read served CSS via curl.** When in doubt about whether your CSS edit is being served, `curl http://localhost:5173/src/path/to/file.module.css | grep <rule>`. The output shows exactly what Vite is serving, including the hashed class names. (Vite returns CSS module files as `__vite__updateStyle(...)` JS — your CSS is in the string literal.)
4. **Don't reload the host shell tab.** SSO breaks. Use HMR; if HMR is misbehaving, touch the file (`touch <path>`) to re-broadcast.
5. **Take screenshots scoped to the iframe area only.** Crop out the host's top chrome (~50–80 px) when comparing pixel positions.
6. **Test multiple scroll positions inside the iframe.** Scroll happens inside the host shell, anchored to the iframe's own scroll container. Scroll-up to top, scroll-down to bottom — every time.

## When the iframe isn't there

If the app is a regular web app at `localhost:3000` or similar (no host shell), most of this reference doesn't apply. You can use `read_page`, `javascript_tool` to query the DOM, etc. Iframes are the worst case; non-iframed apps are the easy case.

## Debugging anti-patterns specific to iframes

| Anti-pattern | What to do instead |
|---|---|
| "I'll just `document.querySelector` to inspect the bar's height" | Cross-origin → null. Take a screenshot, zoom, measure pixels visually. |
| "I'll reload the page to apply CSS" | Loses SSO. Use HMR; touch the file if HMR is silent. |
| "I'll open localhost:5173 in a new tab to debug without the shell" | App won't bootstrap without SDK. Stay in the host shell. |
| "background-attachment: fixed should work" | Often doesn't in iframes. Use scroll-parent backgrounds. |
| "I'll match `@media (max-width)` based on the host browser width" | Wrong viewport. Measure the iframe's actual width. |
