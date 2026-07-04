#!/usr/bin/env node
// Template: templates/hooks/postcompact-reinject.mjs.tpl
// Variables used: (none — uses lib helpers)
//
// SessionStart hook (matcher: compact) — re-injection after a compaction.
// PostCompact is a side-effects-only event and does NOT consume
// additionalContext; SessionStart with source 'compact' is the channel that
// does. Detects whether the session is mid-plan-execution (HANDOFF.md exists,
// branch matches ^plan/, or an active plan has unchecked Pipeline tasks) and, if
// so, returns additionalContext with the 5-rule discipline summary. Else silent.

import fs from 'node:fs';
import path from 'node:path';
import {
  readJsonStdin,
  writeJsonStdout,
  projectDir,
  getCurrentBranch,
  findActivePlans,
  writeLastHookOutput,
} from './lib/hook-utils.mjs';

async function main() {
  const event = await readJsonStdin();
  const root = projectDir();
  const handoffPath = path.join(root, 'HANDOFF.md');

  const hasHandoff = fs.existsSync(handoffPath);
  const branch = getCurrentBranch();
  const isPlanBranch = /^plan\//.test(branch);
  const activePlans = findActivePlans();
  const hasPipelinePlan = activePlans.some((p) => p.hasPipeline);

  const isPlanExecution = hasHandoff || isPlanBranch || hasPipelinePlan;
  if (!isPlanExecution) process.exit(0);

  const planLines =
    activePlans.length > 0
      ? activePlans.map((p) => `\`${p.file}\` (${p.doneTasks}/${p.totalTasks})`).join(', ')
      : 'see HANDOFF.md';

  const additionalContext = [
    'PLAN EXECUTION RECOVERY — You were executing a plan before compaction.',
    `Branch: ${branch}`,
    `Active plan(s): ${planLines}`,
    '',
    'CRITICAL DISCIPLINE RULES (re-injected because they are lost on compaction):',
    '1. Foreground reviews only — never dispatch reviewer subagents (spec-reviewer / code-quality-reviewer) with run_in_background: true. They fail silently.',
    '2. Dispatch != done — read the result, verify PASS, only then mark [x].',
    '3. Groups are barriers — every item in Group N must be [x] before starting Group N+1.',
    '4. Review fix loop — re-run the same check after fixing findings; only mark [x] after a clean pass.',
    '5. Every finding needs a disposition — fixed (commit ref) OR Deferred-XXX in docs/backlog-deferred.html.',
    '',
    'RECOVERY STEPS:',
    '1. Read HANDOFF.md for branch, modified files, and resume instructions.',
    '2. Read the Pipeline Task List in the active plan ([x] = done, [ ] = pending).',
    '3. Run: git log --oneline <base>..HEAD for commit history and revert map.',
    '4. Continue from the first unchecked [ ] pipeline item.',
  ].join('\n');

  writeLastHookOutput('postcompact-reinject', {
    isPlanExecution: true,
    branch,
    activePlansCount: activePlans.length,
  });

  writeJsonStdout({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext },
  });
  process.exit(0);
}

main().catch(() => process.exit(0));
