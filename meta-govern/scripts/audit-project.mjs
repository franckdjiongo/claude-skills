#!/usr/bin/env node
// scripts/audit-project.mjs
// Read-only audit of a project's .claude/ setup against meta-govern standards.
//
// Usage:
//   node audit-project.mjs <project-path> [--json] [--fail-level critical|high|medium|all]
//
// Exit codes: 0 (clean) / 1 (findings at fail-level) / 2 (script error).

import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { detectProject } from './lib/project-detection.mjs';

const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
const FAIL_LEVEL_MAP = { critical: 4, high: 3, medium: 2, all: 1 };

const args = process.argv.slice(2);
const target = args.find(a => !a.startsWith('--')) || process.cwd();
const asJson = args.includes('--json');
const failLevelArg = args.find(a => a.startsWith('--fail-level='))?.slice('--fail-level='.length)
  || (args.includes('--fail-level') ? args[args.indexOf('--fail-level') + 1] : 'high');
const failLevel = FAIL_LEVEL_MAP[failLevelArg] ?? 3;

const projectDir = path.resolve(target);
if (!fs.existsSync(projectDir)) {
  process.stderr.write(`Error: ${projectDir} does not exist.\n`);
  process.exit(2);
}

const detection = detectProject(projectDir);
const findings = [];

// === Inventory checks ===

function add(severity, area, message, file = null) {
  findings.push({ severity, area, message, file });
}

if (!detection.artifacts.hasClaudeDir) {
  add('CRITICAL', 'inventory', 'No .claude/ directory; project not bootstrapped. Run BOOTSTRAP.');
}

if (!detection.artifacts.hasClaudeMd) {
  add('CRITICAL', 'inventory', 'No CLAUDE.md at project root. CLAUDE.md is the only post-compaction survivor.');
} else if (detection.indicators.claudeMdLines > 120) {
  add('HIGH', 'budget', `CLAUDE.md is ${detection.indicators.claudeMdLines} lines (cap: 120).`, 'CLAUDE.md');
}

const expectedSkills = ['brainstorm', 'write-plan', 'execute-plan', 'quality-gate', 'govern-claude', 'test-driven-development'];
for (const skill of expectedSkills) {
  if (!detection.artifacts.coreSkills.includes(skill)) {
    add('HIGH', 'inventory', `Missing core skill: ${skill}`);
  }
}

const expectedAgents = [
  'implementer.md',
  'ui-implementer.md',
  'spec-reviewer.md',
  'code-quality-reviewer.md',
  'persona-simulator.md',
  'codebase-reality-check.md',
];
for (const agent of expectedAgents) {
  if (!detection.artifacts.coreAgents.includes(agent)) {
    add('MEDIUM', 'inventory', `Missing core agent: ${agent.replace('.md', '')}`);
  }
}

const expectedHooks = ['session-start-env-check.mjs', 'track-workflow.mjs', 'enforce-workflow.mjs', 'precompact-handoff.mjs', 'postcompact-reinject.mjs'];
for (const hook of expectedHooks) {
  if (!detection.artifacts.coreHooks.includes(hook)) {
    add('MEDIUM', 'inventory', `Missing core hook: ${hook}`);
  }
}

const expectedRules = ['clean-code.md', 'file-size-budget.md', 'spec-protocol.md', 'claude-config-style.md', 'parallel-dispatch.md', 'testing.md'];
for (const rule of expectedRules) {
  if (!detection.artifacts.coreRules.includes(rule)) {
    add('MEDIUM', 'inventory', `Missing core rule: ${rule}`);
  }
}

if (!detection.artifacts.sourceOfTruth.spec) {
  add('HIGH', 'sources-of-truth', 'No spec doc found at expected paths (docs/*-spec.html, etc.).');
}
if (!detection.artifacts.sourceOfTruth.dataModel) {
  add('HIGH', 'sources-of-truth', 'No data-model doc found at expected paths.');
}
if (!detection.artifacts.sourceOfTruth.catalog) {
  add('MEDIUM', 'sources-of-truth', 'No component catalog found.');
}

// === Doctrine docs HTML ===
// Les docs humains sont en HTML; .md sous docs/ = dérive à migrer.
{
  const doctrine = detection.docsDoctrine || {};
  if (doctrine.format === 'md' || doctrine.format === 'mixed') {
    add('HIGH', 'markdown-docs-drift',
      `docs/ contient ${doctrine.mdCount} fichier(s) .md (doctrine: docs humains = HTML). Lancer node ~/.claude/skills/meta-govern/scripts/migrate-project.mjs <projet> --target=html-docs.`);
  }
  if (detection.artifacts.hasClaudeDir) {
    if (!doctrine.hasToolkit) {
      add('MEDIUM', 'docs-doctrine', 'Toolkit docs-html absent (.claude/scripts/docs-html/scaffold.mjs). BOOTSTRAP ou MIGRATE --target=html-docs.');
    }
    if (!doctrine.hasBlockMarkdownHook) {
      add('MEDIUM', 'docs-doctrine', 'Hook block-docs-markdown non câblé dans .claude/settings.json (les .md sous docs/ ne sont pas bloqués).');
    }
    if (!doctrine.hasDocsMap) {
      add('MEDIUM', 'docs-doctrine', 'docs/docs-map.json absent (registre canonique des docs).');
    }
    if (!doctrine.hasIndexHtml) {
      add('MEDIUM', 'docs-doctrine', 'docs/index.html absent (hub — générer via node .claude/scripts/docs-html/make-index.mjs).');
    }
  }
}

// === Delta-protocol commit-message lint ===
// The 3 source-of-truth docs may only change via an apply-delta / amendment /
// bugfix-doc-correction commit (spec-protocol.md §3, §9, §9.1). A commit that
// edits one of them with any other message bypassed the delta protocol.
{
  const sotFiles = [
    detection.artifacts.sourceOfTruth.spec,
    detection.artifacts.sourceOfTruth.dataModel,
    detection.artifacts.sourceOfTruth.catalog,
  ].filter(Boolean);
  if (detection.isGitRepo && sotFiles.length > 0) {
    for (const sot of sotFiles) {
      let subjects = [];
      try {
        subjects = execSync(`git log --follow --format=%s -- "${sot}"`, {
          cwd: projectDir,
          encoding: 'utf8',
        })
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
      } catch {
        continue;
      }
      for (const subj of subjects) {
        const compliant =
          /^docs\(spec\):\s*(apply delta|amendment)/i.test(subj) ||
          /bugfix-doc-correction/i.test(subj);
        if (!compliant) {
          add(
            'LOW',
            'delta-protocol',
            `Source-of-truth doc changed outside the delta protocol — commit "${subj}"`,
            sot,
          );
        }
      }
    }
  }
}

// === Wiring checks ===

if (detection.artifacts.hasSettingsJson) {
  try {
    const settings = JSON.parse(fs.readFileSync(path.join(projectDir, '.claude/settings.json'), 'utf8'));
    const declared = extractDeclaredHooks(settings);
    for (const declaredHook of declared) {
      const scriptPath = declaredHook.replace('${CLAUDE_PROJECT_DIR}', projectDir);
      if (!fs.existsSync(scriptPath)) {
        add('CRITICAL', 'wiring', `Hook declared in settings.json but script missing: ${scriptPath}`);
      }
    }
  } catch (err) {
    add('HIGH', 'wiring', `settings.json parse error: ${err.message}`);
  }
}

// === Anti-pattern checks ===

if (detection.artifacts.hasClaudeMd) {
  const content = fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf8');
  if (/@[\w./-]+\.md/.test(content)) {
    add('HIGH', 'anti-pattern', 'CLAUDE.md contains @-file imports. Use declarative pointers instead.');
  }
  if (/\b(MUST|ALWAYS|NEVER|n'oublie pas|verify before returning|double-check before returning|do not skip)\b/i.test(content)) {
    add('MEDIUM', 'anti-pattern', 'CLAUDE.md contains defensive scaffolding (Opus 4.7 anti-pattern). Rewrite as positive statements.');
  }
}

const rulesDir = path.join(projectDir, '.claude/rules');
if (fs.existsSync(rulesDir)) {
  for (const ruleFile of fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'))) {
    const rulePath = path.join(rulesDir, ruleFile);
    const content = fs.readFileSync(rulePath, 'utf8');
    const lines = content.split('\n');
    if (lines.length > 200) {
      add('MEDIUM', 'budget', `Rule ${ruleFile} is ${lines.length} lines (recommended: ≤150; hard cap: 200).`, rulePath);
    } else if (lines.length > 150) {
      add('LOW', 'budget', `Rule ${ruleFile} is ${lines.length} lines (recommended: ≤150).`, rulePath);
    }
    // A rule is correctly scoped if it declares paths:, or opts into global
    // load on purpose via alwaysActive: true. Only neither is drift.
    const fmMatch = content.match(/^---[\s\S]*?^---/m);
    const frontmatter = fmMatch ? fmMatch[0] : '';
    const hasPaths = /^paths\s*:/m.test(frontmatter);
    const isAlwaysActive = /^alwaysActive\s*:\s*true\b/m.test(frontmatter);
    if (!hasPaths && !isAlwaysActive) {
      add('MEDIUM', 'anti-pattern', `Rule ${ruleFile} missing paths: frontmatter (loads globally). Add paths:, or declare alwaysActive: true if the global load is intentional.`, rulePath);
    }
  }
}

const agentsDir = path.join(projectDir, '.claude/agents');
if (fs.existsSync(agentsDir)) {
  for (const agentFile of fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'))) {
    const agentPath = path.join(agentsDir, agentFile);
    const content = fs.readFileSync(agentPath, 'utf8');
    if (!/^effort:\s*(low|medium|high|xhigh)/m.test(content)) {
      const fmMatch = content.match(/^---[\s\S]*?^---/m);
      if (!fmMatch || !/effort\s*:/.test(fmMatch[0])) {
        add('MEDIUM', 'anti-pattern', `Agent ${agentFile} missing effort: frontmatter (will inherit session xhigh).`, agentPath);
      }
    }
  }
}

const skillsDir = path.join(projectDir, '.claude/skills');
if (fs.existsSync(skillsDir)) {
  for (const skillName of fs.readdirSync(skillsDir)) {
    const skillDir = path.join(skillsDir, skillName);
    if (!fs.statSync(skillDir).isDirectory()) continue;
    if (fs.existsSync(path.join(skillDir, 'README.md'))) {
      add('HIGH', 'anti-pattern', `Skill ${skillName} has README.md (forbidden by Anthropic).`, skillDir);
    }
    if (!fs.existsSync(path.join(skillDir, 'SKILL.md'))) {
      add('CRITICAL', 'anti-pattern', `Skill ${skillName} missing SKILL.md.`, skillDir);
    }
    // Reserved keyword check: skill name should not BE "claude" or "anthropic" (or start with them).
    // Project-skill names like "govern-claude" or "claude-md-improver" are allowed because they
    // describe a skill ABOUT Claude, not impersonate Claude itself.
    if (/^(claude|anthropic)(-|$)/i.test(skillName)) {
      add('HIGH', 'anti-pattern', `Skill name "${skillName}" starts with reserved prefix "claude" or "anthropic".`, skillDir);
    }
    if (skillName !== skillName.toLowerCase() || skillName.includes('_') || skillName.includes(' ')) {
      add('HIGH', 'anti-pattern', `Skill folder "${skillName}" not in kebab-case.`, skillDir);
    }
  }
}

const hooksDir = path.join(projectDir, '.claude/hooks');
if (fs.existsSync(hooksDir)) {
  for (const hookFile of fs.readdirSync(hooksDir).filter(f => f.endsWith('.mjs') || f.endsWith('.sh'))) {
    if (hookFile.startsWith('lib')) continue; // skip lib subdir entries
    const hookPath = path.join(hooksDir, hookFile);
    const content = fs.readFileSync(hookPath, 'utf8');
    // Hook hardens PATH if any of: declares PATH_PREFIX itself, mutates process.env.PATH, OR imports from ./lib/hook-utils (which does both).
    const hasOwnHardening = /PATH_PREFIX|process\.env\.PATH\s*=/.test(content);
    const importsLib = /from\s+['"]\.\/lib\/hook-utils(\.mjs)?['"]/.test(content) || /require\(['"]\.\/lib\/hook-utils/.test(content);
    if (hookFile.endsWith('.mjs') && !hasOwnHardening && !importsLib) {
      add('HIGH', 'macos-hardening', `Hook ${hookFile} missing PATH_PREFIX export (Apple Silicon).`, hookPath);
    }
    if (/\bnvm\s/.test(content)) {
      add('HIGH', 'macos-hardening', `Hook ${hookFile} depends on nvm (will fail in non-interactive subprocess).`, hookPath);
    }
  }
  // Also verify lib/hook-utils.mjs has PATH_PREFIX (the linchpin)
  const libPath = path.join(hooksDir, 'lib/hook-utils.mjs');
  if (fs.existsSync(libPath)) {
    const libContent = fs.readFileSync(libPath, 'utf8');
    if (!/PATH_PREFIX|process\.env\.PATH\s*=/.test(libContent)) {
      add('HIGH', 'macos-hardening', `lib/hook-utils.mjs missing PATH_PREFIX (other hooks depend on it).`, libPath);
    }
  }
}

// === Output ===

findings.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

if (asJson) {
  process.stdout.write(JSON.stringify({ projectDir, palier: detection.palier, findings }, null, 2) + '\n');
} else {
  const lines = [];
  lines.push(`# meta-govern Audit — ${detection.projectName}`);
  lines.push(`Path: ${projectDir}`);
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`Palier: ${detection.palier}`);
  lines.push(`Total findings: ${findings.length}`);
  lines.push('');
  for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']) {
    const subset = findings.filter(f => f.severity === sev);
    if (subset.length === 0) continue;
    lines.push(`## ${sev} (${subset.length})`);
    for (const f of subset) {
      lines.push(`- [${f.area}] ${f.message}${f.file ? ` (${path.relative(projectDir, f.file)})` : ''}`);
    }
    lines.push('');
  }
  if (findings.length === 0) lines.push('No findings. Setup is clean. ✓');
  process.stdout.write(lines.join('\n') + '\n');
}

const blocking = findings.filter(f => SEVERITY_RANK[f.severity] >= failLevel).length;
process.exit(blocking > 0 ? 1 : 0);

function extractDeclaredHooks(settings) {
  const out = [];
  if (!settings.hooks) return out;
  for (const event of Object.keys(settings.hooks)) {
    const declarations = Array.isArray(settings.hooks[event]) ? settings.hooks[event] : [settings.hooks[event]];
    for (const decl of declarations) {
      const hooks = Array.isArray(decl.hooks) ? decl.hooks : [decl];
      for (const hook of hooks) {
        if (hook.command) {
          const match = hook.command.match(/["']([^"']+\.(mjs|sh|js))["']/);
          if (match) out.push(match[1]);
        }
      }
    }
  }
  return out;
}
