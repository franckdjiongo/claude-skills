# Environment Adaptation (TEST Mode)

How TEST mode adapts to its host platform. Before any test runs, **detect the environment first** — it dictates which of the 10 phases run Full, need a Workaround, or must be Deferred to a human. For the phases themselves see `references/testing-protocol.md`; for the CLI commands see `references/automated-tools.md`.

> **VOLATILE — re-verify before relying on any claim here.** These are 2026 computer-use capabilities and they change fast (Codex Windows computer use and full-CDP Developer mode both shipped in 2026; Antigravity 2.0 landed at Google I/O May 2026; Claude's computer-use model + beta-header versions rotate). Every platform-specific claim below must be checked against current official docs/changelogs before you assert it. Where this file says "not a documented capability," confirm it has not shipped before reporting it as a limitation.

## Table of Contents
- [Step 0: Detect the environment](#step-0-detect-the-environment)
- [Claude Desktop computer use](#claude-desktop-computer-use)
- [OpenAI Codex app](#openai-codex-app)
- [Google Antigravity 2.0](#google-antigravity-20)
- [Three universal gaps (all platforms)](#three-universal-gaps-all-platforms)
- [Screenshot & coordinate constraints (Claude-specific hard limits)](#screenshot--coordinate-constraints-claude-specific-hard-limits)
- [Phase automatability matrix](#phase-automatability-matrix)
- [Screenshot optimization tactics](#screenshot-optimization-tactics)
- [Fallback strategy](#fallback-strategy)

---

## Step 0: Detect the environment

The three hard constraints that differ per platform are: **(1) exact-pixel viewport resize, (2) DOM/computed-style/console/network inspection, (3) video capture of animation.** Establish which platform you are in before planning the run, then consult the [phase matrix](#phase-automatability-matrix). If the target makes heavy use of `@container` queries, shift Phase 2 emphasis from window resize to resizing the component's parent (see `references/testing-protocol.md`).

---

## Claude Desktop computer use

- **Platform/model:** macOS; Pro/Max; beta header `computer-use-2025-11-24` for Opus 4.8 / 4.7 / 4.6 and Sonnet 4.6.
- **Loop:** client-side screenshot → analyze → act. Full mouse / keyboard / scroll / drag, plus a `zoom` action (set `enable_zoom:true`) to read small text.
- **Pixel resize:** done by the harness / window manager (e.g. the Xvfb virtual display in Anthropic's Docker reference implementation), not by the model directly. Treat as available only when the harness scripts the window/display.
- **DOM / CDP inspection:** **visual only** — open DevTools inside the controlled browser and read panes by screenshot. No native programmatic DOM/console/network feed.
- **Video capture:** none natively → use a **rapid sequential screenshot burst** during a scripted scroll/animation.
- **Auth / interaction surface:** in the Claude **Desktop app**, browsers are **read-only unless the Claude Chrome extension is connected** — once connected it can click/type using your authenticated session. Plan flows (Phase 6) and clicks (Phase 4) around having the extension connected.
- **Terminal / CLI access:** only if a bash tool is enabled in the harness; not guaranteed.
- **Best for:** visual audit, hover/focus screenshotting, user flows.
- **Hard limits:** screenshot resolution and Retina coordinates — see [the Claude-specific constraints below](#screenshot--coordinate-constraints-claude-specific-hard-limits).

---

## OpenAI Codex app

- **Platform/model:** macOS + Windows (in supported regions); GPT-5.5; included with Plus / Pro / Business / Edu / Enterprise — **no free tier.** (OpenAI's static Computer Use doc says macOS-only / ex-EEA-UK-CH while the changelog adds Windows and those regions — treat the **changelog as more recent** and flag the discrepancy inline if it matters to the run.)
- **Three surfaces:**
  - `@Computer` / `@AppName` — background computer use. **macOS runs in the background; Windows takes over the foreground** and cannot run in the background while you use the same session.
  - `@Chrome` — signed-in browser via the Codex Chrome extension (use this for authenticated flows, Phase 6).
  - `@Browser` — in-app browser for local dev: click, type, inspect rendered state, screenshots, run read-only inspection JS.
- **Pixel resize:** **not a documented capability.** The in-app browser width follows the side-panel width (described in an open OpenAI GitHub feature request — verify the exact issue number before citing). For Phase 2, use DevTools **device-emulation presets** via Developer-mode CDP, or defer to manual.
- **DOM / CDP inspection:** **Developer mode → "Enable full CDP access"** unlocks console / network / runtime-error / page-state inspection. Caveats: org admins can disable it; Codex asks for **per-site approval**.
- **Video capture:** none natively → **screenshot burst.**
- **Auth / permission limits:** cannot automate the terminal or Codex itself; cannot authenticate as admin or approve OS security/permission prompts. macOS needs **Screen Recording + Accessibility** permissions; Windows needs the target app kept visible on the active desktop.
- **Terminal / CLI access:** **first-class** — ideal host for running every CLI tool in `references/automated-tools.md`.
- **Best for:** DevTools/CDP inspection plus running automated tools; **defer the Phase 2 pixel sweep to DevTools device emulation.**

---

## Google Antigravity 2.0

- **Platform/model:** macOS / Windows / Linux; free preview; Gemini 3 Pro + Claude / GPT model options.
- **Browser Subagent:** drives Chrome directly over CDP (no extension needed in 2.0 / IDE). Native actions: click, type, scroll, **resize window** (`BrowserResizeWindowToolArgs`), select options, press keys, read console logs, capture DOM / screenshots / markdown.
- **Pixel resize:** **native and reliable** (`BrowserResizeWindowToolArgs` / CDP `setDeviceMetricsOverride`). Phase 2 runs Full.
- **DOM / CDP inspection:** **native** — DOM capture + console logs exposed directly.
- **Video capture:** **first-class.** Every Browser-Subagent session is **auto-recorded as a WebP video artifact** — the only native animation-capture path among the three. Use it for Phase 7/9 motion review and regression evidence. (Per the tool's own description, this is "the ONLY way you can record a browser session video/animation.")
- **Auth / artifacts:** screenshots, recordings, and walkthroughs are first-class artifacts — store them as regression evidence.
- **Terminal / CLI access:** terminal available for `references/automated-tools.md` commands. **Caveat:** the built-in browser agent is **not yet supported in the terminal-first Antigravity CLI (`agy`)** — use the IDE / 2.0 surface for browser QA.
- **Best for:** the full sweep, including the Phase 2 native resize and Phase 7/9 animation review via WebP video.

---

## Three universal gaps (all platforms)

| Gap | Why it matters | What to do instead |
|---|---|---|
| **No real screen reader** | None of the three can run VoiceOver / NVDA / JAWS — they are blind to actual AT output. | Inspect the **accessibility tree** (DevTools → Accessibility pane) and ARIA attributes in the DOM. **Always label this as accessibility-tree inspection, never real AT testing.** Never write "the screen reader announces X." State this gap in every report and recommend manual VoiceOver/NVDA verification. |
| **No haptics** | Cannot feel or verify tactile/vibration feedback. | Note as out of scope; recommend manual device testing if haptics are claimed. |
| **Screenshot / coordinate constraints** | Degrade click accuracy and can hard-fail image submission (Claude-specific limits below). | Capture viewport-region tiles, halve Retina coordinates, use `zoom`. See [next section](#screenshot--coordinate-constraints-claude-specific-hard-limits). |

Additionally, **reduced-motion and device-emulation toggling both depend on reaching the controlled browser's DevTools Rendering panel.** If an environment cannot reach the Rendering panel, flag it as a gap and recommend manual verification.

---

## Screenshot & coordinate constraints (Claude-specific hard limits)

These are hard constraints on **Claude**; apply them whenever the host loop sends screenshots to a Claude model.

| Constraint | Value | Action |
|---|---|---|
| Recommended screenshot resolution | **XGA = 1024×768** or **WXGA = 1280×800** (dimensions defined explicitly in Anthropic's computer-use demo code) | Keep screenshots at or below these; oversized images are downscaled, degrading click accuracy. |
| Retina / HiDPI | device pixel ratio **2** | **Halve coordinates** (or downscale the screenshot 2×) before clicking, or clicks land at the wrong point. |
| Hard image ceiling | **8000px** on any single dimension | The Claude API rejects images where "at least one of the image dimensions exceed max allowed size: 8000 pixels." A stricter **~2000px** limit applies to many-image requests. |
| Long-route capture | — | Full-page screenshots of long pages can hit the 8000px ceiling — **capture viewport-region tiles, not one giant full-page image.** |

---

## Phase automatability matrix

`Full` = native/reliable. `Workaround` = possible via a substitute (note it in the report). `Defer` = recommend manual verification. Phase definitions live in `references/testing-protocol.md`.

| Phase | Claude Desktop | Codex app | Antigravity 2.0 |
|---|---|---|---|
| 1 Recon | Full | Full | Full |
| 2 Viewport sweep | Full (harness resize) | **Workaround** — DevTools emulation; no pixel resize | Full (native resize) |
| 3 Component | Full | Full | Full |
| 4 Interaction | Full (Chrome extension for clicks in Desktop) | Full | Full |
| 5 State | Full | Full | Full |
| 6 Flow | Full (extension / credentials) | Full (`@Chrome` for auth) | Full |
| 7 Stress | Full | Full | Full |
| 8 DevTools | Visual DevTools only | Full (CDP Developer mode) | Full (DOM / console) |
| 8 (a11y tree) | Visual | Full | Full |
| 9 CLI tools | If bash tool enabled | **Full** (native terminal) | Full (terminal) |
| 9 Video / anim | Screenshot burst | Screenshot burst | **Full (WebP video)** |
| Screen reader | Defer to manual | Defer to manual | Defer to manual |

---

## Screenshot optimization tactics

- **Prefer viewport-region captures over giant full-page** on long routes — avoids the 8000px ceiling and downscaling.
- **Capture timed screenshots during transient states:** move-then-screenshot for hover, Tab-then-screenshot for focus.
- **On Claude, keep images ≤ XGA** and use the `zoom` action (`enable_zoom:true`) to read fine text rather than sending a larger image.

---

## Fallback strategy

When a test cannot be performed in the current environment (e.g. pixel resize in Codex, animation video in Claude):

1. **Document the gap explicitly** in the report (which phase, which platform constraint).
2. **Perform the nearest substitute** — DevTools device emulation instead of pixel resize; a screenshot burst instead of WebP video; accessibility-tree inspection instead of real AT.
3. **Recommend manual verification** for the residual that no substitute covers.

Score and format every finding (including documented gaps) per `references/scoring-and-report.md`. Always surface the three structural gaps — no real screen reader, no haptics, and any deferred phase — with a concrete manual-verification recommendation for each.
