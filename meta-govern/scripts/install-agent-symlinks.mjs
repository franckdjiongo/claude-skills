#!/usr/bin/env node
// scripts/install-agent-symlinks.mjs
// Installs symlinks from ~/.claude/skills/meta-govern/agents/<name>.md
// to ~/.claude/agents/<name>.md so the Agent tool can dispatch them
// as subagent_type values.
//
// Usage:
//   node install-agent-symlinks.mjs            # install (default)
//   node install-agent-symlinks.mjs --check    # verify only, exit 1 if missing/broken
//   node install-agent-symlinks.mjs --repair   # remove broken/wrong-target links and re-create

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

const HOME = os.homedir();
const SKILL_AGENTS = path.join(HOME, '.claude/skills/meta-govern/agents');
const USER_AGENTS = path.join(HOME, '.claude/agents');

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const repair = args.includes('--repair');

const MASTER_AGENTS = [
  'architect',
  'project-analyzer',
  'source-of-truth-scaffolder',
  'hook-generator',
  'scaffolder',
  'workflow-validator',
  'governance-auditor',
  'evolution-orchestrator',
  'coherence-validator',
];

if (!fs.existsSync(SKILL_AGENTS)) {
  process.stderr.write(`error: meta-govern agents directory not found at ${SKILL_AGENTS}\n`);
  process.exit(2);
}
if (!fs.existsSync(USER_AGENTS)) {
  fs.mkdirSync(USER_AGENTS, { recursive: true });
}

const results = { ok: [], missing: [], broken: [], created: [], removed: [] };

for (const name of MASTER_AGENTS) {
  const source = path.join(SKILL_AGENTS, `${name}.md`);
  const link = path.join(USER_AGENTS, `${name}.md`);

  if (!fs.existsSync(source)) {
    results.missing.push({ name, reason: `source ${source} not found` });
    continue;
  }

  let linkExists = false;
  let linkTarget = null;
  try {
    linkTarget = fs.readlinkSync(link);
    linkExists = true;
  } catch {
    if (fs.existsSync(link)) {
      if (repair) {
        fs.unlinkSync(link);
        results.removed.push({ name, oldTarget: '<regular file>' });
      } else {
        results.broken.push({ name, reason: `${link} exists but is not a symlink` });
        continue;
      }
    }
  }

  if (linkExists) {
    const resolved = path.isAbsolute(linkTarget) ? linkTarget : path.resolve(path.dirname(link), linkTarget);
    if (resolved === source) {
      results.ok.push({ name });
      continue;
    }
    if (repair) {
      fs.unlinkSync(link);
      results.removed.push({ name, oldTarget: linkTarget });
    } else {
      results.broken.push({ name, reason: `points to ${linkTarget} (expected ${source})` });
      continue;
    }
  }

  if (!checkOnly) {
    fs.symlinkSync(source, link);
    results.created.push({ name });
  } else {
    results.missing.push({ name, reason: 'symlink absent' });
  }
}

const problems = results.missing.length + results.broken.length;

process.stdout.write(`# meta-govern agent symlinks\n`);
process.stdout.write(`User agents dir:  ${USER_AGENTS}\n`);
process.stdout.write(`Skill agents dir: ${SKILL_AGENTS}\n\n`);
process.stdout.write(`OK:       ${results.ok.length}\n`);
process.stdout.write(`Created:  ${results.created.length}\n`);
process.stdout.write(`Removed:  ${results.removed.length}\n`);
process.stdout.write(`Missing:  ${results.missing.length}\n`);
process.stdout.write(`Broken:   ${results.broken.length}\n\n`);

if (results.created.length) {
  process.stdout.write(`Created symlinks:\n`);
  for (const r of results.created) process.stdout.write(`  + ${r.name}.md\n`);
  process.stdout.write(`\n`);
}
if (results.missing.length) {
  process.stdout.write(`Missing:\n`);
  for (const r of results.missing) process.stdout.write(`  - ${r.name}.md  (${r.reason})\n`);
  process.stdout.write(`\n`);
}
if (results.broken.length) {
  process.stdout.write(`Broken:\n`);
  for (const r of results.broken) process.stdout.write(`  ! ${r.name}.md  (${r.reason})\n`);
  process.stdout.write(`\n`);
}

if (checkOnly) {
  process.exit(problems > 0 ? 1 : 0);
} else {
  process.exit(results.broken.length > 0 ? 1 : 0);
}
