#!/usr/bin/env node
// .claude/scripts/setup-worktree.mjs
//
// Dynamically create a git worktree at .claude/.worktrees/<name>/.
//
// Usage:
//   node .claude/scripts/setup-worktree.mjs <name>
//   node .claude/scripts/setup-worktree.mjs <name> --base=<branch>
//   node .claude/scripts/setup-worktree.mjs <name> --branch=<existing-branch>
//   node .claude/scripts/setup-worktree.mjs --list
//   node .claude/scripts/setup-worktree.mjs --remove=<name>
//
// Creates worktree at .claude/.worktrees/<name>/ on a new branch
// `worktree/<name>` (default) or an existing branch (`--branch=`), based on
// `--base=` (default: current HEAD).
//
// .claude/.worktrees/ MUST be in .gitignore (BOOTSTRAP adds it).

import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const worktreesDir = path.join(projectDir, '.claude/.worktrees');

const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  printHelp();
  process.exit(args.length === 0 ? 2 : 0);
}

if (args.includes('--list')) {
  listWorktrees();
  process.exit(0);
}

const removeArg = args.find(a => a.startsWith('--remove='));
if (removeArg) {
  removeWorktree(removeArg.slice('--remove='.length));
  process.exit(0);
}

let name = null;
let baseBranch = null;
let existingBranch = null;
for (const a of args) {
  if (a.startsWith('--base=')) baseBranch = a.slice('--base='.length);
  else if (a.startsWith('--branch=')) existingBranch = a.slice('--branch='.length);
  else if (!a.startsWith('--')) name = a;
}

if (!name) {
  process.stderr.write('Error: name argument required.\n\n');
  printHelp();
  process.exit(2);
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  process.stderr.write(`Error: name "${name}" must be kebab-case (a-z, 0-9, hyphens only; can't start with hyphen).\n`);
  process.exit(2);
}

createWorktree(name, baseBranch, existingBranch);

function createWorktree(name, baseBranch, existingBranch) {
  fs.mkdirSync(worktreesDir, { recursive: true });

  const worktreePath = path.join(worktreesDir, name);

  if (fs.existsSync(worktreePath)) {
    process.stderr.write(`Error: worktree path already exists: ${worktreePath}\n`);
    process.exit(1);
  }

  if (!baseBranch) {
    try {
      baseBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch {
      baseBranch = 'main';
    }
    if (!baseBranch) baseBranch = 'main';
  }

  try {
    if (existingBranch) {
      execSync(`git worktree add "${worktreePath}" ${existingBranch}`, { stdio: 'inherit', cwd: projectDir });
      process.stdout.write(`Worktree ready: ${worktreePath} (existing branch: ${existingBranch})\n`);
    } else {
      const branchName = `worktree/${name}`;
      execSync(`git worktree add -b ${branchName} "${worktreePath}" ${baseBranch}`, { stdio: 'inherit', cwd: projectDir });
      process.stdout.write(`Worktree ready: ${worktreePath} (branch: ${branchName}, from: ${baseBranch})\n`);
    }
  } catch (err) {
    process.stderr.write(`Error creating worktree: ${err.message}\n`);
    process.exit(1);
  }
}

function listWorktrees() {
  try {
    const output = execSync('git worktree list', { encoding: 'utf8', cwd: projectDir });
    process.stdout.write(output);
  } catch (err) {
    process.stderr.write(`Error listing worktrees: ${err.message}\n`);
    process.exit(1);
  }
}

function removeWorktree(name) {
  if (!name) {
    process.stderr.write('Error: --remove=<name> requires a name.\n');
    process.exit(2);
  }
  const worktreePath = path.join(worktreesDir, name);
  if (!fs.existsSync(worktreePath)) {
    process.stderr.write(`Worktree not found: ${worktreePath}\n`);
    process.exit(1);
  }
  try {
    execSync(`git worktree remove "${worktreePath}"`, { stdio: 'inherit', cwd: projectDir });
    process.stdout.write(`Removed worktree: ${worktreePath}\n`);
  } catch (err) {
    process.stderr.write(`Error removing worktree: ${err.message}\n`);
    process.stderr.write(`Try: git worktree remove --force "${worktreePath}"\n`);
    process.exit(1);
  }
}

function printHelp() {
  process.stderr.write(`Usage: setup-worktree.mjs <name> [--base=<branch>] [--branch=<existing-branch>]
       setup-worktree.mjs --list
       setup-worktree.mjs --remove=<name>
       setup-worktree.mjs --help

Creates a git worktree at .claude/.worktrees/<name>/ for parallel feature development.

Options:
  <name>                Kebab-case identifier for the worktree (creates branch worktree/<name>).
  --base=<branch>       Base branch (default: current branch).
  --branch=<branch>     Use an existing branch instead of creating worktree/<name>.
  --list                List all worktrees.
  --remove=<name>       Remove the worktree at .claude/.worktrees/<name>/.

Examples:
  setup-worktree.mjs payment-flow                # → branch: worktree/payment-flow, from current
  setup-worktree.mjs feature-X --base=develop    # → from develop
  setup-worktree.mjs review-pr --branch=pr-123   # → check out existing branch
  setup-worktree.mjs --list
  setup-worktree.mjs --remove=payment-flow

Note: .claude/.worktrees/ must be in .gitignore (BOOTSTRAP adds it).
`);
}
