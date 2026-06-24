#!/usr/bin/env node
// Template: templates/hooks/precompact-handoff.mjs.tpl
// Variables used: (none — uses lib helpers; VALIDATE_COMMAND comes from lib)
//
// PreCompact hook. Generates HANDOFF.md at project root. Captures branch,
// modified files (top 40), active plans (with unchecked task lists), the
// latest design under docs/specs, the trigger reason, resume instructions,
// and discipline reminders.

import fs from 'node:fs';
import path from 'node:path';
import {
  readJsonStdin,
  projectDir,
  git,
  getCurrentBranch,
  extractGitStatusPath,
  findActivePlans,
  findLatestSpec,
  buildHandoffMarkdown,
  writeLastHookOutput,
} from './lib/hook-utils.mjs';

async function main() {
  const event = await readJsonStdin();
  const triggerReason = event.trigger || event.reason || 'Compaction triggered';

  const branch = getCurrentBranch();
  const modifiedFiles = git('status --short')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(extractGitStatusPath)
    .filter(Boolean)
    .slice(0, 40);

  const activePlans = findActivePlans();
  const latestDesign = findLatestSpec();

  const markdown = buildHandoffMarkdown({
    branch,
    modifiedFiles,
    activePlans,
    latestDesign,
    triggerReason,
    generatedAt: new Date().toISOString(),
  });

  const handoffPath = path.join(projectDir(), 'HANDOFF.md');
  fs.writeFileSync(handoffPath, markdown, 'utf8');

  writeLastHookOutput('precompact-handoff', {
    branch,
    modifiedFilesCount: modifiedFiles.length,
    activePlansCount: activePlans.length,
    latestDesign,
    handoffPath: 'HANDOFF.md',
  });

  process.exit(0);
}

main().catch(() => process.exit(0));
