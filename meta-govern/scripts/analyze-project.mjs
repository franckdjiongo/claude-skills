#!/usr/bin/env node
// scripts/analyze-project.mjs
// Read-only deep analysis of a project. Reports stack, palier, artifacts, indicators.
// Used as the entry-point for BOOTSTRAP / AUDIT / MIGRATE / ADVISE modes.
//
// Usage:
//   node analyze-project.mjs <project-path> [--json]
//
// Output: human-readable report by default; --json for structured output.
// Exit code: 0 always (read-only; failures don't break callers).

import path from 'node:path';
import fs from 'node:fs';
import { detectProject } from './lib/project-detection.mjs';

const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

const args = process.argv.slice(2);
const target = args.find(a => !a.startsWith('--')) || process.cwd();
const asJson = args.includes('--json');

const projectDir = path.resolve(target);
if (!fs.existsSync(projectDir)) {
  process.stderr.write(`Error: ${projectDir} does not exist.\n`);
  process.exit(2);
}

const result = detectProject(projectDir);

if (asJson) {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
}

// Human-readable report
const lines = [];
lines.push(`# meta-govern Project Analysis`);
lines.push(`Path: ${result.projectDir}`);
lines.push(`Project: ${result.projectName}`);
lines.push(`Git repo: ${result.isGitRepo ? 'yes' : 'no'}`);
lines.push(`Palier: ${result.palier}`);
lines.push(`Bootstrapped by meta-govern: ${result.isMetaGovernBootstrapped ? 'yes' : 'no'}`);
lines.push('');

lines.push(`## Stack`);
lines.push(`- Framework: ${result.stack.framework || '?'}`);
lines.push(`- Runtime: ${result.stack.runtime || '?'}`);
lines.push(`- Package manager: ${result.stack.packageManager}`);
lines.push(`- Test framework: ${result.stack.testFramework || 'none'}`);
lines.push(`- Languages: ${result.stack.languages.join(', ') || 'none detected'}`);
lines.push(`- React: ${result.stack.isReact ? 'yes' : 'no'}`);
lines.push(`- Vite: ${result.stack.isVite ? 'yes' : 'no'}`);
lines.push(`- Power Platform: ${result.stack.isPowerPlatform ? 'yes' : 'no'}`);
lines.push(`- Convex: ${result.stack.isConvex ? 'yes' : 'no'}`);
lines.push(`- Cloudflare: ${result.stack.isCloudflare ? 'yes' : 'no'}`);
lines.push(`- Has UI: ${result.stack.hasUI}`);
lines.push(`- Has i18n: ${result.stack.hasI18n}`);
lines.push(`- Has data layer: ${result.stack.hasDataLayer}`);
lines.push(`- Has backend: ${result.stack.hasBackend}`);
lines.push('');

lines.push(`## Indicators`);
lines.push(`- LOC: ${result.indicators.loc}`);
lines.push(`- FUNC IDs: ${result.indicators.funcIds}`);
lines.push(`- Components: ${result.indicators.components}`);
lines.push(`- Tests: ${result.indicators.tests}`);
lines.push(`- Backend: ${result.indicators.backend}`);
lines.push(`- CI: ${result.indicators.ci}`);
lines.push(`- DEFERRED entries: ${result.indicators.deferred}`);
lines.push(`- Multi-runtime: ${result.indicators.multiRuntime}`);
lines.push(`- CLAUDE.md lines: ${result.indicators.claudeMdLines}`);
lines.push('');

lines.push(`## Artifacts`);
lines.push(`- .claude/ directory: ${result.artifacts.hasClaudeDir ? 'yes' : 'no'}`);
lines.push(`- CLAUDE.md: ${result.artifacts.hasClaudeMd ? 'yes' : 'no'}${result.indicators.claudeMdLines > 120 ? ' ⚠️ over 120 lines' : ''}`);
lines.push(`- AGENTS.md: ${result.artifacts.hasAgentsMd ? 'yes' : 'no'}`);
lines.push(`- HANDOFF.md: ${result.artifacts.hasHandoffMd ? 'yes' : 'no'}`);
lines.push(`- settings.json: ${result.artifacts.hasSettingsJson ? 'yes' : 'no'}`);
lines.push(`- .husky/pre-commit: ${result.artifacts.hasHusky ? 'yes' : 'no'}`);
lines.push(`- Source-of-truth spec: ${result.artifacts.sourceOfTruth.spec || 'NOT FOUND'}`);
lines.push(`- Source-of-truth data-model: ${result.artifacts.sourceOfTruth.dataModel || 'NOT FOUND'}`);
lines.push(`- Source-of-truth catalog: ${result.artifacts.sourceOfTruth.catalog || 'NOT FOUND'}`);
lines.push('');

lines.push(`### Skills (project-level)`);
const expectedCoreSkills = ['brainstorm', 'write-plan', 'execute-plan', 'quality-gate', 'govern-claude', 'test-driven-development'];
for (const name of expectedCoreSkills) {
  const has = result.artifacts.coreSkills.includes(name);
  lines.push(`- ${has ? '✓' : '✗'} ${name}`);
}
if (result.artifacts.extraSkills.length > 0) {
  lines.push(`- Extra: ${result.artifacts.extraSkills.join(', ')}`);
}
lines.push('');

lines.push(`### Agents (project-level)`);
const expectedCoreAgents = [
  'implementer.md',
  'ui-implementer.md',
  'spec-reviewer.md',
  'code-quality-reviewer.md',
  'persona-simulator.md',
  'codebase-reality-check.md',
];
for (const name of expectedCoreAgents) {
  const has = result.artifacts.coreAgents.includes(name);
  lines.push(`- ${has ? '✓' : '✗'} ${name.replace('.md', '')}`);
}
if (result.artifacts.extraAgents.length > 0) {
  lines.push(`- Extra: ${result.artifacts.extraAgents.join(', ')}`);
}
lines.push('');

lines.push(`### Hooks`);
const expectedCoreHooks = ['session-start-env-check.mjs', 'track-workflow.mjs', 'enforce-workflow.mjs', 'precompact-handoff.mjs', 'postcompact-reinject.mjs'];
for (const name of expectedCoreHooks) {
  const has = result.artifacts.coreHooks.includes(name);
  lines.push(`- ${has ? '✓' : '✗'} ${name}`);
}
lines.push('');

lines.push(`### Path-scoped rules`);
const expectedCoreRules = ['clean-code.md', 'file-size-budget.md', 'ui-components.md', 'data-layer.md', 'testing.md', 'spec-protocol.md', 'parallel-dispatch.md', 'claude-config-style.md'];
for (const name of expectedCoreRules) {
  const has = result.artifacts.coreRules.includes(name);
  lines.push(`- ${has ? '✓' : '✗'} ${name}`);
}
lines.push('');

if (result.metaGovernState) {
  lines.push(`## meta-govern state`);
  lines.push(`- Version: ${result.metaGovernState.metaGovernVersion || '?'}`);
  lines.push(`- Last bootstrap: ${result.metaGovernState.lastBootstrap || '?'}`);
  lines.push(`- Last audit: ${result.metaGovernState.lastAudit || '?'}`);
  lines.push(`- DDD score: ${result.metaGovernState.dddScore ?? '?'}`);
  lines.push(`- DDD decision: ${result.metaGovernState.dddDecision || '?'}`);
  lines.push('');
}

lines.push(`## Recommended mode`);
if (!result.artifacts.hasClaudeDir || !result.artifacts.hasClaudeMd) {
  lines.push(`→ BOOTSTRAP — project has no .claude/ or CLAUDE.md`);
} else if (!result.isMetaGovernBootstrapped) {
  lines.push(`→ AUDIT — project has .claude/ but doesn't appear to be meta-govern-bootstrapped. Run AUDIT to assess; consider partial BOOTSTRAP for missing artifacts.`);
} else {
  lines.push(`→ AUDIT — project is bootstrapped; run periodic audit for drift detection.`);
  if (result.metaGovernState) {
    const lastAudit = result.metaGovernState.lastAudit;
    if (lastAudit) {
      const daysSince = Math.floor((Date.now() - new Date(lastAudit).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 28) lines.push(`  (last audit was ${daysSince} days ago — overdue)`);
    }
  }
}
lines.push('');

lines.push(`## Promotion eligibility`);
const palier = result.palier;
const ind = result.indicators;
if (palier === 0) {
  lines.push(`- 0 → 1: BOOTSTRAP this project to install the standard workflow.`);
} else if (palier === 1) {
  if (ind.funcIds >= 30 || ind.components >= 10) {
    lines.push(`- 1 → 2: ELIGIBLE (FUNC IDs ${ind.funcIds}, components ${ind.components}). Run MIGRATE --target=palier-2.`);
  } else {
    lines.push(`- 1 → 2: not yet (need ≥30 FUNC IDs OR ≥10 components; have ${ind.funcIds}/${ind.components}).`);
  }
} else if (palier === 2) {
  lines.push(`- 2 → 3: trigger on multi-dev or worktree need.`);
} else if (palier === 3) {
  if (ind.ci !== 'absent') lines.push(`- 3 → 4: ELIGIBLE (CI present).`);
  else lines.push(`- 3 → 4: trigger on CI requested or PR opened on remote.`);
} else if (palier === 4) {
  lines.push(`- 4 → 5: trigger on dual-runtime needed.`);
} else if (palier === 5) {
  if (ind.deferred >= 30) lines.push(`- 5 → 6: ELIGIBLE (${ind.deferred} DEFERRED entries).`);
}

process.stdout.write(lines.join('\n') + '\n');
process.exit(0);
