# Add Data Source — platform details and cloud snapshot

Detail for Step 5 and Step 7b of SKILL.md.

### Step 5: Add Data Source

> **macOS / Linux users — read this first:**
> `pac code add-data-source` has a confirmed packaging bug on macOS and Linux
> (GitHub issue #302) that causes "Could not find the PowerApps CLI script" regardless
> of pac version. Use the workaround script instead (see below).

**Windows:**
```bash
pac code add-data-source -a dataverse -t <table-logical-name>
```
Run once per table. Can batch by looping.

**macOS / Linux — use `pa-generate.mjs`:**

Before running, make sure pac points to the correct environment:
```bash
pac env list                                       # find your environment ID
pac env select --environment <env-id>             # activate it
```

Then regenerate all tables declared in `power.config.json` at once:
```bash
node ~/.claude/scripts/pa-generate.mjs
```

The script:
- Reads all `dataSources` from `power.config.json` automatically
- Resolves the org URL from `pac env list` using the `environmentId`
- Authenticates via MSAL (device code on first run, cached Keychain token after)
- Runs the npm `power-apps` CLI directly, bypassing the broken `pac code` wrapper
- The telemetry 401 errors printed per table are harmless (wrong audience for the PP API analytics call)

**First-time auth on macOS:** The script will print a device code and a URL. Open
`https://microsoft.com/devicelogin` in your browser, enter the code, and sign in.
Subsequent runs use the cached macOS Keychain token silently.

### Step 7b: Refresh the cloud snapshot (only if the project ships one)

Some projects run autonomous cloud sessions (claude.ai routines) that clone the
repo from GitHub — they cannot regenerate the gitignored `src/generated/` SDK
(`pac` requires an authenticated machine), so they restore it from a shuttle
branch. **If `.claude/scripts/push-generated-snapshot.mjs` exists in the
project, run it after EVERY SDK (re)generation:**

```bash
node .claude/scripts/push-generated-snapshot.mjs
```

It force-pushes an orphan commit containing only `src/generated/` to the
`cloud/generated-snapshot` branch (pure git plumbing — never touches your
working tree or branch). Skipping this leaves cloud runs typechecking against
a stale SDK. If the script does not exist in the project, skip this step.
