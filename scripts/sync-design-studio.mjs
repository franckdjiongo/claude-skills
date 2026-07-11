#!/usr/bin/env node
/**
 * sync-design-studio.mjs — keep the `design-studio` plugin a faithful mirror of
 * its source skills + agent so it never silently drifts.
 *
 * Sources of truth
 *   - 3 skills at the repo root:   ship-polished-ui/, design-elevation/, brand-forge/
 *   - 1 agent, per switch state (SWITCH.md):
 *       PRE-switch  (copy present at ~/.claude/agents/visual-qa-inspector.md):
 *         that user-scope file is the source, mirrored with the plugin adaptation.
 *       POST-switch (user-scope copy archived to ~/.claude/_archived-into-design-studio-*):
 *         design-studio/agents/visual-qa-inspector.md IS canonical — edit it
 *         directly; the script only verifies it exists. Missing copy AND no
 *         archive = ambiguous (accidental deletion?) → FATAL.
 *
 * Targets (inside the plugin container)
 *   - design-studio/skills/<skill>/     (full tree)
 *   - design-studio/agents/visual-qa-inspector.md  (pre-switch only)
 *
 * Plugin-context adaptation (applied to the mirrored COPY only, never the source):
 *   the agent's Step-1 checklist reads must resolve under ${CLAUDE_PLUGIN_ROOT}
 *   when installed as a plugin. The source agent (standalone, ~/.claude/agents)
 *   points at ~/.claude/skills/… ; the plugin copy is rewritten to prefer
 *   ${CLAUDE_PLUGIN_ROOT} with a ~/.claude fallback. The skill sources already
 *   carry their own dual-mode wording (${CLAUDE_PLUGIN_ROOT} / ~/.claude), so
 *   they mirror verbatim.
 *
 * Behavior
 *   - Idempotent: a clean tree yields 0 writes on the 2nd run.
 *   - Fails LOUDLY (exit 1) on unexpected divergence:
 *       * a source skill/agent file is missing
 *       * the agent adaptation anchor can't be found (upstream changed shape)
 *   - `--check` : verify-only; exit 1 if any target is stale (no writes). For CI.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const REPO = path.resolve(new URL("..", import.meta.url).pathname);
const PLUGIN = path.join(REPO, "design-studio");
const HOME = os.homedir();
const CHECK = process.argv.includes("--check");

const SKILLS = ["ship-polished-ui", "design-elevation", "brand-forge"];
const AGENT_SRC = path.join(HOME, ".claude/agents/visual-qa-inspector.md");
const AGENT_DST = path.join(PLUGIN, "agents/visual-qa-inspector.md");

let writes = 0;
let stale = 0;
const problems = [];

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

// Post-switch detection: SWITCH.md step 3 moves the user-scope agent into a
// dated ~/.claude/_archived-into-design-studio-<STAMP>/ archive.
async function archivedAgentExists() {
  let entries;
  try {
    entries = await fs.readdir(path.join(HOME, ".claude"), { withFileTypes: true });
  } catch {
    return false;
  }
  for (const e of entries) {
    if (!e.isDirectory() || !e.name.startsWith("_archived-into-design-studio-")) continue;
    if (await exists(path.join(HOME, ".claude", e.name, "agents/visual-qa-inspector.md"))) return true;
  }
  return false;
}

// Recursively list files under dir (relative paths), skipping .DS_Store.
async function listFiles(dir, base = dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === ".DS_Store") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(full, base)));
    else out.push(path.relative(base, full));
  }
  return out;
}

// Write `content` to `dst` only if different. Honors --check (report, don't write).
async function reconcile(dst, content, label) {
  const cur = (await exists(dst)) ? await fs.readFile(dst, "utf8") : null;
  if (cur === content) return;
  if (CHECK) {
    stale++;
    problems.push(`STALE: ${label} (${path.relative(REPO, dst)})`);
    return;
  }
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.writeFile(dst, content);
  writes++;
  console.log(`  wrote  ${path.relative(REPO, dst)}`);
}

// Plugin-context adaptation for the agent's Step-1 checklist reads.
const AGENT_ANCHOR =
  "Read in this order:\n\n" +
  "1. `~/.claude/skills/ship-polished-ui/references/visual-qa-checklist.md` — your operational checklist\n" +
  "2. `~/.claude/skills/ship-polished-ui/references/css-side-effects.md` — only the rows matching CSS properties the parent touched\n" +
  "3. `~/.claude/skills/ship-polished-ui/references/iframe-and-host-shells.md` — only if the app is in an iframe";
const AGENT_REPLACEMENT =
  "Read in this order. When you run as part of the **`design-studio` plugin**, these\n" +
  "files are bundled under `${CLAUDE_PLUGIN_ROOT}/skills/ship-polished-ui/references/`\n" +
  "— read them from there. When you run **standalone** (installed at\n" +
  "`~/.claude/agents/`), they live at `~/.claude/skills/ship-polished-ui/references/`\n" +
  "instead. Try the `${CLAUDE_PLUGIN_ROOT}` path first; fall back to the `~/.claude`\n" +
  "path if `${CLAUDE_PLUGIN_ROOT}` is unset.\n\n" +
  "1. `…/skills/ship-polished-ui/references/visual-qa-checklist.md` — your operational checklist\n" +
  "2. `…/skills/ship-polished-ui/references/css-side-effects.md` — only the rows matching CSS properties the parent touched\n" +
  "3. `…/skills/ship-polished-ui/references/iframe-and-host-shells.md` — only if the app is in an iframe";

function adaptAgent(src) {
  if (src.includes(AGENT_REPLACEMENT)) return src; // already adapted upstream
  if (!src.includes(AGENT_ANCHOR)) {
    problems.push(
      "FATAL: agent Step-1 checklist block changed shape upstream — the sync " +
      "adaptation anchor no longer matches ~/.claude/agents/visual-qa-inspector.md. " +
      "Re-derive AGENT_ANCHOR/AGENT_REPLACEMENT in sync-design-studio.mjs."
    );
    return null;
  }
  return src.replace(AGENT_ANCHOR, AGENT_REPLACEMENT);
}

async function main() {
  console.log(`\n=== sync design-studio ${CHECK ? "(--check)" : ""} ===`);

  // --- Skills: mirror each source tree onto the plugin, deleting extra files ---
  for (const skill of SKILLS) {
    const srcDir = path.join(REPO, skill);
    const dstDir = path.join(PLUGIN, "skills", skill);
    if (!(await exists(srcDir))) {
      problems.push(`FATAL: source skill missing: ${skill}/`);
      continue;
    }
    const srcFiles = await listFiles(srcDir);
    if (srcFiles.length === 0) {
      problems.push(`FATAL: source skill has no files: ${skill}/`);
      continue;
    }
    for (const rel of srcFiles) {
      const content = await fs.readFile(path.join(srcDir, rel), "utf8");
      await reconcile(path.join(dstDir, rel), content, `${skill}/${rel}`);
    }
    // Delete plugin-side files that no longer exist in the source.
    for (const rel of await listFiles(dstDir)) {
      if (!srcFiles.includes(rel)) {
        const orphan = path.join(dstDir, rel);
        if (CHECK) {
          stale++;
          problems.push(`STALE (orphan): ${path.relative(REPO, orphan)}`);
        } else {
          await fs.rm(orphan);
          writes++;
          console.log(`  deleted ${path.relative(REPO, orphan)}`);
        }
      }
    }
  }

  // --- Agent: source depends on the switch state (see header) ---
  if (await exists(AGENT_SRC)) {
    // Pre-switch: mirror from ~/.claude/agents, applying the plugin adaptation.
    const adapted = adaptAgent(await fs.readFile(AGENT_SRC, "utf8"));
    if (adapted !== null) {
      await reconcile(AGENT_DST, adapted, "agents/visual-qa-inspector.md");
    }
  } else if (await archivedAgentExists()) {
    // Post-switch: the plugin copy is canonical — verify presence, mirror nothing.
    if (!(await exists(AGENT_DST))) {
      problems.push(
        `FATAL: post-switch state (user-scope agent archived) but the canonical plugin agent is missing: ${path.relative(REPO, AGENT_DST)}`
      );
    } else {
      console.log(
        "  agent: post-switch — design-studio/agents/visual-qa-inspector.md is canonical (user-scope copy archived); nothing to mirror."
      );
    }
  } else {
    problems.push(
      `FATAL: source agent missing: ${AGENT_SRC} and no ~/.claude/_archived-into-design-studio-*/agents/ archive found — ` +
      "ambiguous state (accidental deletion?). Restore the user-scope agent or the archive before syncing."
    );
  }

  // --- Report / exit ---
  const fatal = problems.filter((p) => p.startsWith("FATAL"));
  if (fatal.length) {
    console.error("\nFATAL divergence — refusing to proceed:");
    for (const p of fatal) console.error("  " + p);
    process.exit(1);
  }
  if (CHECK && stale) {
    console.error(`\n${stale} target(s) STALE — run \`node scripts/sync-design-studio.mjs\`:`);
    for (const p of problems.filter((p) => p.startsWith("STALE"))) console.error("  " + p);
    process.exit(1);
  }
  console.log(
    CHECK
      ? `\nOK — design-studio is in sync (${SKILLS.length} skills + agent).`
      : `\nDone — ${writes} file(s) written (0 on a clean re-run).`
  );
}

main().catch((e) => {
  console.error("sync-design-studio failed:", e);
  process.exit(1);
});
