# Gotchas & the why (hard-won from a real run)

The reasoning behind each step in `scripts/update-toolchain.sh`, and what to do when a
run hits something or the machine differs from the assumed mise + Homebrew + zsh setup.

## Runtimes (mise)

- **Manage Python *and* Node with mise** when the user already uses mise (check
  `mise ls` / whether `node` resolves under `~/.local/share/mise/installs/`). It's the
  idiomatic, reversible way to make `python3`/`node` the new version — cleaner than
  fighting Homebrew's keg-only Python linking. Set the global with
  `mise use -g <tool>@<ver>`; revert with `mise use -g <tool>@<old>` or `@system`.
- **`python3` won't update in a non-interactive shell mid-run.** mise uses *activate*
  (dynamic PATH via a shell hook), so a plain `bash -c` / tool subshell keeps the old
  `python3` until the hook re-fires. **Verify with `mise exec -- python3 --version`**
  (authoritative) or an interactive `zsh -ic '…'`, not a bare `python3`. New terminals
  pick it up automatically; an open one needs `exec $SHELL`.
- **"Current stable" Python is the newest `mise latest python`** (e.g. 3.14.x). If a
  third-party lib lacks wheels for the newest, fall back one minor (`--python 3.13`).
  Pure-Python doc libs (python-docx/pptx, openpyxl, pypdf) are fine on the newest;
  native ones (numpy/pandas/pillow/lxml) usually ship wheels within weeks of release.

## Non-interactive shells can't see mise's runtimes (hooks / GUI apps)

- **mise exposes `node`/`python3` via SHIMS (`~/.local/share/mise/shims`) or its
  activate hook — and NEITHER is on a non-interactive shell's PATH.** A login
  terminal gets them (the rc files fire the hook / add the shims); a GUI or headless
  tool that spawns a command with `/bin/sh -c` does not. So right after a Node bump,
  anything launching `node` that way — **Claude Code hooks**, menubar/GUI apps — can
  fail with `node: command not found`, even though your own terminal is fine.
- **The script probes this** after the runtime updates: `env -i HOME="$HOME"
  /bin/sh -c 'command -v node'` (repeated for each mise-managed runtime). A minimal
  shell with no inherited PATH is the worst case those tools see; if a runtime doesn't
  resolve there it emits a **WARNING** — not a failure, so the exit code stays 0.
- **Remedy (the script never applies it — it's your call):** put the shims dir on a
  PATH those tools inherit. Either add it to `~/.claude/settings.json` so Claude Code's
  own shell sees it — `"env": { "PATH": "<HOME>/.local/share/mise/shims:${PATH}" }`
  (use the absolute home path) — or symlink the runtime where GUI apps already look,
  e.g. `ln -sf ~/.local/share/mise/shims/node /opt/homebrew/bin/node`. The settings.json
  route fixes Claude Code specifically; the symlink helps any GUI app whose PATH already
  includes `/opt/homebrew/bin`. Don't edit settings.json on the user's behalf — warn.

## Packages live PER runtime version — the #1 trap

- **A version bump silently drops the old version's packages.** mise stores global npm
  packages and pip packages under the *exact* version dir, so `node 22→24` or
  `python 3.13→3.14` loses every global CLI / pip package unless you carry them over.
- **Fix:** snapshot the old version's top-level packages by NAME, then reinstall into
  the new version (the script does this for both pip `--not-required` leaves and
  `npm ls -g`). Reinstall by *name at latest*, not pinned, so it also updates them.
- After a Node bump, **verify the global CLIs actually came back** (`wrangler`,
  `vercel`, etc. `--version`), since that's exactly what gets lost.

## npm self-update is a trap

- **Do NOT `npm i -g npm@latest` under a version manager.** npm "retires" (moves
  aside) its own running files mid-install, then can't `require('promise-retry')` →
  `MODULE_NOT_FOUND` → it rolls back. It fails the same way on retry.
- **npm comes bundled with Node.** Want a newer npm? Bump Node (Node 24 LTS bundles
  npm 11). That's the supported, reliable path — which is why the script never touches
  npm directly and leaves it at the bundled version.
- **npm 11 defers dependency postinstall scripts** (you'll see `npm warn allow-scripts`
  for `workerd`/`esbuild`/`sharp`). This is usually harmless: native binaries arrive
  via **optionalDependencies** (e.g. `@cloudflare/workerd-darwin-arm64`,
  `@esbuild/darwin-arm64`, `@img/sharp-darwin-arm64`), not the scripts. Verify by
  *executing* the binary (the script runs `workerd --version`). `npm approve-scripts`
  is **project-only** — it returns `EGLOBAL` for global installs, so there's nothing
  to approve for globals.

## Homebrew

- **`brew uninstall <formula>` can cascade-remove now-orphaned dependencies** (e.g.
  removing `python@3.12` also took `sqlite`, `openssl@3`, `mpdecimal`). That's only
  safe if nothing else needs them. **Always confirm with `brew missing` afterward —
  empty means no broken dependents.** Other CLIs often use LibreSSL/system libs, so
  losing brew's `openssl@3` frequently breaks nothing — but check, don't assume.
- **Casks split into three outcomes** when upgrading:
  - app-bundle casks (`.app`, quicklook plugins) → upgrade fine, no sudo.
  - **`.pkg` casks** (e.g. `dotnet-sdk`) → the installer needs **sudo**; a
    non-interactive shell can't supply the password. It **fails fast** (no hang) — the
    script detects this and reports the exact `brew upgrade --cask <name>` for the user
    to run themselves.
  - **stale casks** — brew records a version but the app was deleted ("It seems the App
    source … is not there"). Can't upgrade a missing app. Offer `brew reinstall --cask`
    (get it back, updated) or `brew uninstall --cask` (clear the dangling reference).

## Shell / portability

- **macOS has no `timeout` command** (it's GNU coreutils → `gtimeout` if `coreutils`
  is installed, else absent). Never wrap commands in `timeout` on macOS — it errors
  `command not found` and the wrapped command silently never runs. The script uses no
  timeout wrapper; non-tty `sudo` fails fast on its own, so nothing hangs.
- **Keep the script bash-3.2-compatible** (macOS `/bin/bash` is 3.2): no associative
  arrays, no `mapfile`/`readarray`, no `${var,,}`. Build arrays with `while read` +
  process substitution.
- **The Anthropic document skills (`docx`/`pdf`/`pptx`/`xlsx`) are server-managed**,
  not local files — so "update the doc tooling" means updating the **Python libraries**
  they drive (the `DOC_LIBS` set), which is what the script ensures.

## When the machine differs

- **No mise** → either install it (`brew install mise` + add `mise activate` to the
  shell rc) or fall back to Homebrew Python / nvm-style Node, but tell the user the
  approach changed. Don't silently no-op.
- **Linux / not zsh** → the mise + pip/npm logic is portable; the Homebrew sections
  won't apply (use the system package manager) and the verification uses the login
  shell's activation hook instead of `zsh -ic`.
- **A Node major jump that could break a pinned project** → if the user has projects
  pinning a specific Node, prefer `--node <thatMajor>` or confirm before jumping
  majors. LTS is the safe default for a general "update".
