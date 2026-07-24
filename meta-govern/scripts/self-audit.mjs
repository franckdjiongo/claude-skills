#!/usr/bin/env node
// scripts/self-audit.mjs
// Audits meta-govern itself for the same anti-patterns it enforces in projects.
//
// Usage:
//   node self-audit.mjs [--json]
//
// Exit codes: 0 (clean) / 1 (findings) / 2 (script error).

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

const SKILL_DIR = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const findings = [];
const asJson = process.argv.includes('--json');

function add(severity, area, message, file = null) {
  findings.push({ severity, area, message, file });
}

// Liste récursive des fichiers (en ignorant .git/ et node_modules/, sans suivre les symlinks).
function listFilesRec(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length > 0) {
    const d = stack.pop();
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out;
}

// === Self-checks ===

const skillMd = path.join(SKILL_DIR, 'SKILL.md');
if (fs.existsSync(skillMd)) {
  const content = fs.readFileSync(skillMd, 'utf8');
  const lines = content.split('\n');
  const wordCount = content.split(/\s+/).length;

  if (wordCount > 5000) {
    add('HIGH', 'budget', `meta-govern SKILL.md is ${wordCount} words (cap: 5000).`, skillMd);
  }
  if (lines.length > 500) {
    add('MEDIUM', 'budget', `meta-govern SKILL.md is ${lines.length} lines (recommended: <300).`, skillMd);
  }
  if (!/^name:\s*meta-govern\s*$/m.test(content)) {
    add('CRITICAL', 'frontmatter', 'meta-govern SKILL.md missing or malformed name: meta-govern.', skillMd);
  }
  if (!/^description:/m.test(content)) {
    add('CRITICAL', 'frontmatter', 'meta-govern SKILL.md missing description.', skillMd);
  }
  // Check for defensive scaffolding in BODY only (after frontmatter).
  const bodyMatch = content.match(/^---[\s\S]*?^---\s*\n([\s\S]+)$/m);
  const body = bodyMatch ? bodyMatch[1] : content;
  // Aggressive markers in body are the anti-pattern; in frontmatter description they're allowed.
  const defensiveRegex = /\b(double-check before returning|verify before returning|do not skip any step|n'oublie pas)\b/i;
  if (defensiveRegex.test(body)) {
    add('MEDIUM', 'anti-pattern', 'meta-govern SKILL.md body contains defensive scaffolding (Claude 4.7+/5-family anti-pattern).', skillMd);
  }
}

// References checks — corpus HTML (doctrine HTML-first).
// Budget porté à 900 lignes: le shell premium (head, TOC, footer) ajoute ~80 lignes
// au contenu équivalent des anciens .md (budget 600).
const refsDir = path.join(SKILL_DIR, 'references');
if (fs.existsSync(refsDir)) {
  for (const file of fs.readdirSync(refsDir).filter(f => f.endsWith('.html'))) {
    const fullPath = path.join(refsDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    if (lines.length > 900) {
      add('LOW', 'budget', `Référence ${file}: ${lines.length} lignes (budget HTML: 900 — envisager un découpage).`, fullPath);
    }
  }
}

// Pointer-integrity: chaque chemin references/*.html mentionné dans SKILL.md doit exister.
if (fs.existsSync(skillMd)) {
  const skillContent = fs.readFileSync(skillMd, 'utf8');
  const refPointers = new Set(skillContent.match(/references\/[A-Za-z0-9._/-]+\.html/g) || []);
  for (const ref of refPointers) {
    if (!fs.existsSync(path.join(SKILL_DIR, ref))) {
      add('HIGH', 'pointer-integrity', `SKILL.md pointe vers ${ref} qui n'existe pas.`, skillMd);
    }
  }
}

// Skill-template pointer integrity: a LOCAL references/<name>.md pointer in a
// skill template must be installed next to that skill by bootstrap-project.mjs.
// (Mirrors the SKILL.md → references/*.html pointer-integrity check above.)
// The negative lookbehind excludes absolute (~/.claude/.../references/...) and
// nested (.claude/.../references/..., docs/references/...) paths, matching only
// bare `references/foo.md` pointers that bootstrap is responsible for installing.
const skillTplDir = path.join(SKILL_DIR, 'templates', 'skills');
const bootstrapPath = path.join(SKILL_DIR, 'scripts', 'bootstrap-project.mjs');
const bootstrapSrc = fs.existsSync(bootstrapPath) ? fs.readFileSync(bootstrapPath, 'utf8') : '';
if (fs.existsSync(skillTplDir)) {
  for (const f of fs.readdirSync(skillTplDir).filter(n => n.endsWith('.SKILL.md.tpl'))) {
    const skill = f.replace(/\.SKILL\.md\.tpl$/, '');
    const body = fs.readFileSync(path.join(skillTplDir, f), 'utf8');
    const refs = new Set(body.match(/(?<![~\w./-])references\/[A-Za-z0-9._-]+\.md/g) || []);
    for (const ref of refs) {
      const expected = `.claude/skills/${skill}/${ref}`; // ref already starts with "references/"
      if (!bootstrapSrc.includes(expected)) {
        add('HIGH', 'pointer-integrity', `Skill template ${f} points to ${ref} but bootstrap-project.mjs does not install ${expected} (dead pointer in every bootstrapped project).`, path.join(skillTplDir, f));
      }
    }
  }
}

// Doctrine HTML-first: aucun .md sous meta-govern HORS allowlist
// (SKILL.md, agents/*.md, templates/** intégralement, scripts/** — .git ignoré).
{
  for (const full of listFilesRec(SKILL_DIR)) {
    if (!full.endsWith('.md')) continue;
    const rel = path.relative(SKILL_DIR, full).split(path.sep).join('/');
    const allowed = rel === 'SKILL.md'
      || rel.startsWith('agents/')
      || rel.startsWith('templates/')
      || rel.startsWith('scripts/');
    if (!allowed) {
      add('HIGH', 'no-markdown', `Markdown hors allowlist (doctrine HTML-first): ${rel} — convertir en .html (scripts/docs-html/).`, full);
    }
  }
}

// Templates checks
const templatesDir = path.join(SKILL_DIR, 'templates');
if (!fs.existsSync(templatesDir)) {
  add('CRITICAL', 'inventory', 'No templates/ directory in meta-govern.');
} else {
  // Chemins relatifs à templates/. Inclut la brique de vérification v1.15.0
  // (bash-write-guard, harnais de tests de hooks, parité multi-runtime, gates
  // locaux de couverture/predeploy, tiers de risque) : ces templates SONT du
  // code de production, leur absence rend l'inventaire ROUGE.
  const expectedTemplates = [
    'CLAUDE.md.tpl',
    'settings.json.tpl',
    'HANDOFF.md.tpl',
    'governance-baseline.md.tpl',
    'risk-tiers.json.tpl',
    'runtime-parity.json.tpl',
    'hooks/bash-write-guard.mjs.tpl',
    'hooks/lib/bash-write-detect.mjs.tpl',
    'hooks/lib/hook-test-util.mjs.tpl',
    'hooks/bash-write-guard.test.mjs.tpl',
    'hooks/hooks-inventory.test.mjs.tpl',
    'hooks/block-docs-markdown.test.mjs.tpl',
    'hooks/enforce-workflow.test.mjs.tpl',
    'scripts/check-runtime-parity.mjs.tpl',
    'scripts/check-runtime-parity.test.mjs.tpl',
    'scripts/diff-coverage.mjs.tpl',
    'scripts/sample-review.mjs.tpl',
    'scripts/loop-sla.mjs.tpl',
    'scripts/predeploy-check.mjs.tpl',
  ];
  for (const tpl of expectedTemplates) {
    if (!fs.existsSync(path.join(templatesDir, tpl))) {
      add('HIGH', 'inventory', `Missing template: ${tpl}`);
    }
  }

  // Required sub-template directories
  for (const sub of ['rules', 'skills', 'agents', 'hooks', 'scripts', 'docs']) {
    const subDir = path.join(templatesDir, sub);
    if (!fs.existsSync(subDir)) {
      add('HIGH', 'inventory', `Missing template subdirectory: ${sub}/`);
      continue;
    }
    const items = fs.readdirSync(subDir);
    if (items.length === 0) {
      add('HIGH', 'inventory', `Template subdirectory ${sub}/ is empty.`);
    }
  }

  // Doctrine HTML-first: les templates de docs produits sont .html.tpl/.json.tpl
  // ou des assets (.css.tpl/.js.tpl) — aucun .md.tpl sous templates/docs/.
  const templatesDocsDir = path.join(templatesDir, 'docs');
  if (fs.existsSync(templatesDocsDir)) {
    for (const full of listFilesRec(templatesDocsDir)) {
      if (!full.endsWith('.tpl')) continue;
      if (!/\.(html|json|css|js)\.tpl$/.test(full)) {
        add('HIGH', 'no-markdown', `Template doc non conforme: ${path.relative(SKILL_DIR, full)} — templates/docs/ n'accepte que .html.tpl, .json.tpl ou assets (.css.tpl/.js.tpl).`, full);
      }
    }
  }
}

// Scripts checks
const scriptsDir = path.join(SKILL_DIR, 'scripts');
const expectedScripts = [
  'analyze-project.mjs',
  'bootstrap-project.mjs',
  'audit-project.mjs',
  'migrate-project.mjs',
  'self-audit.mjs',
  'install-agent-symlinks.mjs',
  'lib/template-renderer.mjs',
  'lib/project-detection.mjs',
  // Moteur docs-html auto-scopé au skill (corpus propre de meta-govern)
  'docs-html/template.mjs',
  'docs-html/make-index.mjs',
  'docs-html/scaffold.mjs',
  'docs-html/no-markdown-guard.mjs',
];
for (const s of expectedScripts) {
  if (!fs.existsSync(path.join(scriptsDir, s))) {
    add('HIGH', 'inventory', `Missing script: ${s}`);
  }
}

// Retired artifacts. A deletion has no memory: v1.7.2 removed two docs-html
// scripts AND their expectedScripts entries in the same commit, which deleted
// the only detector that could have seen them come back — and a319d10 brought
// all three back sixteen days later, two of them no longer even parsing.
// Retiring a file adds it here, so a resurrection is a finding instead of a
// silent regression.
const retiredArtifacts = [
  ['references/opus-4-7-defaults.html', 'v1.7.0 (renamed → references/model-effort-defaults.html)'],
  ['scripts/docs-html/verify.mjs', 'v1.7.2 (one-shot MD→HTML fidelity gate, migration complete)'],
  ['scripts/docs-html/convert-references.mjs', 'v1.7.2 (one-shot corpus converter, unrunnable standalone)'],
];
for (const [rel, retiredIn] of retiredArtifacts) {
  if (fs.existsSync(path.join(SKILL_DIR, rel))) {
    add('MEDIUM', 'inventory', `Retired artifact is back on disk: ${rel} — removed in ${retiredIn}. Delete it, or retire the entry here if it was reinstated on purpose.`);
  }
}

// Corpus propre: hub index.html + registre docs-map.json à la racine du skill.
if (!fs.existsSync(path.join(SKILL_DIR, 'docs-map.json'))) {
  add('HIGH', 'inventory', 'docs-map.json (registre du corpus meta-govern) manquant.');
}
if (!fs.existsSync(path.join(SKILL_DIR, 'index.html'))) {
  add('MEDIUM', 'inventory', 'index.html (hub des références) manquant — lancer node scripts/docs-html/make-index.mjs.');
}

// Master sub-agents — source files in skill bundle
const agentsDir = path.join(SKILL_DIR, 'agents');
const masterAgents = [
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
if (fs.existsSync(agentsDir)) {
  for (const name of masterAgents) {
    if (!fs.existsSync(path.join(agentsDir, `${name}.md`))) {
      add('MEDIUM', 'inventory', `Missing master sub-agent source: ${name}.md`);
    }
  }
}

// Master sub-agent symlinks — Claude Code's Agent tool only loads from
// ~/.claude/agents/ (and project-level). Without symlinks the master
// sub-agents cannot be dispatched as subagent_type values.
const userAgentsDir = path.join(os.homedir(), '.claude/agents');
if (!fs.existsSync(userAgentsDir)) {
  add('HIGH', 'installation', `${userAgentsDir} does not exist — master sub-agents cannot be dispatched. Run scripts/install-agent-symlinks.mjs.`);
} else {
  for (const name of masterAgents) {
    const link = path.join(userAgentsDir, `${name}.md`);
    const source = path.join(agentsDir, `${name}.md`);
    if (!fs.existsSync(source)) continue;
    if (!fs.existsSync(link)) {
      add('HIGH', 'installation', `Master sub-agent ${name} not symlinked into ~/.claude/agents/. Agent({subagent_type: "${name}"}) will fail. Run scripts/install-agent-symlinks.mjs.`);
      continue;
    }
    try {
      const target = fs.readlinkSync(link);
      const resolved = path.isAbsolute(target) ? target : path.resolve(path.dirname(link), target);
      if (resolved !== source) {
        add('MEDIUM', 'installation', `Symlink ~/.claude/agents/${name}.md points to ${target}; expected ${source}.`);
      }
    } catch {
      add('MEDIUM', 'installation', `~/.claude/agents/${name}.md exists but is not a symlink (cannot point to skill bundle).`);
    }
  }
}

// version.json checks
const versionFile = path.join(SKILL_DIR, 'version.json');
if (!fs.existsSync(versionFile)) {
  add('CRITICAL', 'inventory', 'version.json missing.');
} else {
  try {
    const ver = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    if (!ver.version || !/^\d+\.\d+\.\d+$/.test(ver.version)) {
      add('HIGH', 'frontmatter', `version.json has invalid version: ${ver.version}`);
    }
    if (!ver.changelog || !Array.isArray(ver.changelog) || ver.changelog.length === 0) {
      add('MEDIUM', 'frontmatter', 'version.json changelog is empty.');
    }
  } catch (err) {
    add('CRITICAL', 'frontmatter', `version.json parse error: ${err.message}`);
  }
}

// lessons-log.html checks (journal HTML — protocole d'append par <section class="lesson">)
const lessonsLog = path.join(refsDir, 'lessons-log.html');
if (!fs.existsSync(lessonsLog)) {
  add('HIGH', 'inventory', 'references/lessons-log.html manquant.');
} else {
  const content = fs.readFileSync(lessonsLog, 'utf8');
  if (!content.includes('<!-- LESSONS:APPEND -->')) {
    add('HIGH', 'self-evolution', 'lessons-log.html sans marqueur <!-- LESSONS:APPEND --> (protocole d\'append cassé).', lessonsLog);
  }
  if (!/<section[^>]*\bdata-date="\d{4}-\d{2}-\d{2}"/.test(content)) {
    add('LOW', 'self-evolution', 'lessons-log.html sans <section class="lesson" data-date="YYYY-MM-DD"> (au moins les leçons de naissance attendues).', lessonsLog);
  }
}

// === Output ===

const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
findings.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

if (asJson) {
  process.stdout.write(JSON.stringify({ skillDir: SKILL_DIR, findings }, null, 2) + '\n');
} else {
  const lines = [];
  lines.push(`# meta-govern Self-Audit`);
  lines.push(`Path: ${SKILL_DIR}`);
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`Total findings: ${findings.length}`);
  lines.push('');
  for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']) {
    const subset = findings.filter(f => f.severity === sev);
    if (subset.length === 0) continue;
    lines.push(`## ${sev} (${subset.length})`);
    for (const f of subset) {
      lines.push(`- [${f.area}] ${f.message}${f.file ? ` (${path.relative(SKILL_DIR, f.file)})` : ''}`);
    }
    lines.push('');
  }
  if (findings.length === 0) lines.push('Self-audit clean. ✓');
  process.stdout.write(lines.join('\n') + '\n');
}

const blocking = findings.filter(f => SEVERITY_RANK[f.severity] >= 3).length;
process.exit(blocking > 0 ? 1 : 0);
