#!/usr/bin/env node
// scripts/lib/project-detection.mjs
// Detects project stack, palier, and current state.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

/**
 * Comprehensive project detection.
 * @param {string} projectDir - absolute path to project root
 * @returns {object} detection result
 */
export function detectProject(projectDir) {
  const result = {
    projectDir,
    projectName: path.basename(projectDir),
    isGitRepo: isGitRepo(projectDir),
    packageJson: readPackageJson(projectDir),
    stack: {},
    flags: {},
    artifacts: {},
    indicators: {},
    palier: null,
    isMetaGovernBootstrapped: false,
    metaGovernState: null,
    docsDoctrine: null,
  };

  result.stack = detectStack(projectDir, result.packageJson);
  result.flags = computeFlags(result.stack);
  result.artifacts = detectArtifacts(projectDir);
  result.docsDoctrine = detectDocsDoctrine(projectDir);
  result.indicators = computeIndicators(projectDir, result.artifacts, result.packageJson);
  result.palier = detectPalier(result.indicators, result.artifacts);
  result.metaGovernState = readMetaGovernState(projectDir);
  result.isMetaGovernBootstrapped = result.artifacts.hasClaudeDir &&
                                     result.artifacts.coreSkills.length >= 3 &&
                                     result.metaGovernState !== null;

  return result;
}

function isGitRepo(projectDir) {
  return fs.existsSync(path.join(projectDir, '.git'));
}

function readPackageJson(projectDir) {
  try {
    const text = fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function detectStack(projectDir, pkg) {
  const stack = {
    framework: null,
    runtime: null,
    packageManager: 'npm',
    testFramework: null,
    languages: [],
    isReact: false,
    isVite: false,
    isSvelteKit: false,
    isPowerPlatform: false,
    isConvex: false,
    isCloudflare: false,
    hasUI: false,
    hasI18n: false,
    hasDataLayer: false,
    hasBackend: false,
  };

  if (!pkg) return stack;

  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  if (allDeps.react || allDeps['react-dom']) { stack.isReact = true; stack.framework = 'react'; stack.hasUI = true; }
  if (allDeps.vite) { stack.isVite = true; }
  if (allDeps.next) { stack.framework = 'next'; stack.hasUI = true; }
  if (allDeps.svelte) { stack.framework = 'svelte'; stack.hasUI = true; }
  // SvelteKit: detected by @sveltejs/kit in deps — NOT by a svelte.config.js file.
  // sv 0.16 puts adapter + compilerOptions in vite.config.ts via the sveltekit()
  // plugin and ships NO svelte.config.js, so file-based detection is stale.
  if (allDeps['@sveltejs/kit']) { stack.isSvelteKit = true; stack.framework = 'svelte'; stack.hasUI = true; }
  if (allDeps['@microsoft/power-apps'] || allDeps['power-apps'] || fs.existsSync(path.join(projectDir, 'power.config.json'))) {
    stack.isPowerPlatform = true;
    stack.framework = stack.framework || 'power-apps';
  }
  if (allDeps.convex || fs.existsSync(path.join(projectDir, 'convex/schema.ts')) || fs.existsSync(path.join(projectDir, 'convex/_generated'))) {
    stack.isConvex = true;
    stack.hasBackend = true;
    stack.hasDataLayer = true;
  }
  if (allDeps.wrangler || allDeps['@cloudflare/workers-types']) {
    stack.isCloudflare = true;
    stack.framework = stack.framework || 'cloudflare-workers';
    stack.hasBackend = true;
  }

  if (allDeps.vitest) stack.testFramework = 'vitest';
  else if (allDeps.jest) stack.testFramework = 'jest';
  else if (allDeps.mocha) stack.testFramework = 'mocha';

  if (allDeps.typescript) stack.languages.push('typescript');
  if (allDeps.python) stack.languages.push('python');

  if (fs.existsSync(path.join(projectDir, 'bun.lock')) || fs.existsSync(path.join(projectDir, 'bunfig.toml'))) {
    stack.packageManager = 'bun';
    stack.runtime = 'bun';
  } else if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) {
    stack.packageManager = 'pnpm';
    stack.runtime = 'node';
  } else if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
    stack.packageManager = 'yarn';
    stack.runtime = 'node';
  } else if (fs.existsSync(path.join(projectDir, 'package-lock.json'))) {
    stack.packageManager = 'npm';
    stack.runtime = 'node';
  }

  if (allDeps['@convex-dev/r2'] || allDeps['react-i18next'] || allDeps.i18next ||
      allDeps['react-intl'] || allDeps['@inlang/paraglide-js'] || allDeps['@inlang/paraglide-sveltekit'] ||
      (stack.isReact && fs.existsSync(path.join(projectDir, 'src/contexts/AppContext.tsx')))) {
    stack.hasI18n = true;
  }

  if (fs.existsSync(path.join(projectDir, 'src/data-layer')) ||
      fs.existsSync(path.join(projectDir, 'src/repositories')) ||
      fs.existsSync(path.join(projectDir, 'convex'))) {
    stack.hasDataLayer = true;
  }

  return stack;
}

function computeFlags(stack) {
  return {
    IF_STACK_REACT: stack.isReact,
    IF_STACK_VITE: stack.isVite,
    IF_STACK_SVELTEKIT: stack.isSvelteKit,
    IF_STACK_POWER_PLATFORM: stack.isPowerPlatform,
    IF_STACK_CONVEX: stack.isConvex,
    IF_STACK_CLOUDFLARE: stack.isCloudflare,
    IF_STACK_HAS_UI: stack.hasUI,
    IF_STACK_HAS_I18N: stack.hasI18n,
    IF_STACK_HAS_DATA_LAYER: stack.hasDataLayer,
    IF_STACK_HAS_BACKEND: stack.hasBackend,
  };
}

function detectArtifacts(projectDir) {
  const claudeDir = path.join(projectDir, '.claude');
  const artifacts = {
    hasClaudeDir: fs.existsSync(claudeDir),
    hasClaudeMd: fs.existsSync(path.join(projectDir, 'CLAUDE.md')),
    hasAgentsMd: fs.existsSync(path.join(projectDir, 'AGENTS.md')),
    hasHandoffMd: fs.existsSync(path.join(projectDir, 'HANDOFF.md')),
    hasHusky: fs.existsSync(path.join(projectDir, '.husky/pre-commit')),
    hasGitignore: fs.existsSync(path.join(projectDir, '.gitignore')),
    hasSettingsJson: fs.existsSync(path.join(claudeDir, 'settings.json')),
    coreSkills: [],
    coreAgents: [],
    coreHooks: [],
    coreRules: [],
    coreScripts: [],
    extraSkills: [],
    extraAgents: [],
    sourceOfTruth: {
      spec: null,
      dataModel: null,
      catalog: null,
    },
    architectureDocs: [],
  };

  if (!artifacts.hasClaudeDir) return artifacts;

  const skillsDir = path.join(claudeDir, 'skills');
  if (fs.existsSync(skillsDir)) {
    const all = fs.readdirSync(skillsDir).filter(name => fs.statSync(path.join(skillsDir, name)).isDirectory());
    const coreSkillNames = ['brainstorm', 'write-plan', 'execute-plan', 'quality-gate', 'govern-claude', 'test-driven-development'];
    artifacts.coreSkills = all.filter(s => coreSkillNames.includes(s));
    artifacts.extraSkills = all.filter(s => !coreSkillNames.includes(s));
  }

  const agentsDir = path.join(claudeDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    const all = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    const coreAgentNames = [
      'implementer.md',
      'ui-implementer.md',
      'spec-reviewer.md',
      'code-quality-reviewer.md',
      'persona-simulator.md',
      'codebase-reality-check.md',
    ];
    artifacts.coreAgents = all.filter(a => coreAgentNames.includes(a));
    artifacts.extraAgents = all.filter(a => !coreAgentNames.includes(a));
  }

  const hooksDir = path.join(claudeDir, 'hooks');
  if (fs.existsSync(hooksDir)) {
    const all = fs.readdirSync(hooksDir).filter(f => f.endsWith('.mjs') || f.endsWith('.sh'));
    artifacts.coreHooks = all;
  }

  const rulesDir = path.join(claudeDir, 'rules');
  if (fs.existsSync(rulesDir)) {
    artifacts.coreRules = fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'));
  }

  const scriptsDir = path.join(claudeDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    artifacts.coreScripts = fs.readdirSync(scriptsDir);
  }

  // Sources de vérité: le registre docs/docs-map.json est AUTORITATIF (résout les
  // noms non-standards et les sous-dossiers — docs/spec/, docs/architecture/, etc.).
  // On le lit en PREMIER ; on ne retombe sur le globbing (récursif) que pour les
  // entrées absentes/invalides du registre, ou s'il manque (projets legacy).
  const declared = readSourcesOfTruthFromDocsMap(projectDir);
  // Doctrine docs HTML: candidats .html en PREMIER, .md en repli (projets legacy).
  // Globbing RÉCURSIF: les docs vivent souvent en sous-dossiers (docs/spec/, docs/architecture/…).
  artifacts.sourceOfTruth.spec = declared.spec || findFirstMatching(projectDir, [
    'docs/*-spec.html',
    'docs/spec.html',
    'docs/specification.html',
    'docs/document-ui-ux-v1.html',
    'docs/*-spec.md',
    'docs/spec.md',
    'docs/specification.md',
    'docs/brillance-spec.md',
    'docs/document-ui-ux-v1.md',
  ], { recursive: true });
  artifacts.sourceOfTruth.dataModel = declared.dataModel || findFirstMatching(projectDir, [
    'docs/*-data-model.html',
    'docs/data-model.html',
    'docs/brand-system.html',
    'docs/lexique-donnees-dataverse.html',
    'docs/lexique-donnees-dataverse-v1.html',
    'docs/*-data-model.md',
    'docs/data-model.md',
    'docs/brand-system.md',
    'docs/lexique-donnees-dataverse.md',
    'docs/lexique-donnees-dataverse-v1.md',
  ], { recursive: true });
  artifacts.sourceOfTruth.catalog = declared.catalog || findFirstMatching(projectDir, [
    'docs/*-catalog.html',
    'docs/component-catalog.html',
    'docs/composants/catalogue-composants.html',
    'docs/components/catalog.html',
    'docs/*-catalog.md',
    'docs/component-catalog.md',
    'docs/composants/catalogue-composants.md',
    'docs/components/catalog.md',
  ], { recursive: true });

  const archDir = path.join(projectDir, 'docs/architecture');
  if (fs.existsSync(archDir)) {
    artifacts.architectureDocs = fs.readdirSync(archDir).filter(f => f.endsWith('.html') || f.endsWith('.md'));
  }

  return artifacts;
}

function findFirstMatching(projectDir, candidates, { recursive = false } = {}) {
  for (const candidate of candidates) {
    if (candidate.includes('*')) {
      const dir = path.dirname(candidate);
      const pattern = path.basename(candidate);
      const fullDir = path.join(projectDir, dir);
      if (!fs.existsSync(fullDir)) continue;
      if (recursive) {
        const found = findFileRec(fullDir, pattern);
        if (found) return path.relative(projectDir, found).split(path.sep).join('/');
      } else {
        const files = fs.readdirSync(fullDir).sort();
        const match = files.find(f => matchesGlob(f, pattern));
        if (match) return path.join(dir, match);
      }
    } else {
      if (fs.existsSync(path.join(projectDir, candidate))) return candidate;
    }
  }
  return null;
}

// Recherche récursive du premier fichier (ordre déterministe) dont le nom matche
// le glob `pattern`, sous `baseDir`. Ignore assets/ et node_modules/.
function findFileRec(baseDir, pattern) {
  const stack = [baseDir];
  // Parcours en largeur stable: privilégie les correspondances peu profondes.
  while (stack.length > 0) {
    const dir = stack.shift();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    const sorted = entries.slice().sort((a, b) => a.name.localeCompare(b.name));
    const subdirs = [];
    for (const entry of sorted) {
      if (entry.isFile() && matchesGlob(entry.name, pattern)) {
        return path.join(dir, entry.name);
      }
      if (entry.isDirectory() && entry.name !== 'assets' && entry.name !== 'node_modules') {
        subdirs.push(path.join(dir, entry.name));
      }
    }
    stack.push(...subdirs);
  }
  return null;
}

function matchesGlob(filename, pattern) {
  const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return re.test(filename);
}

// Lit docs/docs-map.json (registre canonique du projet) et renvoie les chemins
// des sources de vérité qu'il déclare ET qui existent réellement. Le registre
// fait autorité (résout noms non-standards + sous-dossiers); on ignore une
// entrée pointant vers un fichier absent (laisse le globbing/AUDIT s'exprimer).
// Repli sûr {} si le registre manque, est illisible, ou n'a pas de sourcesOfTruth.
function readSourcesOfTruthFromDocsMap(projectDir) {
  const out = {};
  const mapPath = path.join(projectDir, 'docs', 'docs-map.json');
  let map;
  try {
    map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  } catch {
    return out;
  }
  const sot = map && map.sourcesOfTruth;
  if (!sot || typeof sot !== 'object') return out;
  for (const key of ['spec', 'dataModel', 'catalog']) {
    const rel = sot[key];
    if (typeof rel === 'string' && rel && fs.existsSync(path.join(projectDir, rel))) {
      out[key] = rel;
    }
  }
  return out;
}

// Doctrine docs HTML: état du dossier docs/ et de l'outillage docs-html du projet.
// format: comptage .md vs .html sous docs/ (hors assets/ et node_modules/).
function detectDocsDoctrine(projectDir) {
  const docsDir = path.join(projectDir, 'docs');
  const doctrine = {
    format: 'none', // 'html' | 'md' | 'mixed' | 'none'
    mdCount: 0,
    htmlCount: 0,
    hasDocsMap: fs.existsSync(path.join(docsDir, 'docs-map.json')),
    hasIndexHtml: fs.existsSync(path.join(docsDir, 'index.html')),
    hasBlockMarkdownHook: false,
    hasToolkit: fs.existsSync(path.join(projectDir, '.claude/scripts/docs-html/scaffold.mjs')),
  };

  try {
    const settings = fs.readFileSync(path.join(projectDir, '.claude/settings.json'), 'utf8');
    doctrine.hasBlockMarkdownHook = settings.includes('block-docs-markdown');
  } catch { /* settings.json absent ou illisible */ }

  if (fs.existsSync(docsDir)) {
    const stack = [docsDir];
    while (stack.length > 0) {
      const dir = stack.pop();
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'assets' || entry.name === 'node_modules') continue;
          stack.push(full);
        } else if (entry.isFile()) {
          if (entry.name.endsWith('.md')) doctrine.mdCount++;
          else if (entry.name.endsWith('.html')) doctrine.htmlCount++;
        }
      }
    }
  }

  if (doctrine.mdCount > 0 && doctrine.htmlCount > 0) doctrine.format = 'mixed';
  else if (doctrine.mdCount > 0) doctrine.format = 'md';
  else if (doctrine.htmlCount > 0) doctrine.format = 'html';

  return doctrine;
}

function computeIndicators(projectDir, artifacts, pkg) {
  const indicators = {
    loc: 0,
    funcIds: 0,
    components: 0,
    tests: 0,
    devs: 1,
    backend: 'absent',
    ci: 'absent',
    deferred: 0,
    multiRuntime: false,
    claudeMdLines: 0,
  };

  if (artifacts.sourceOfTruth.spec) {
    try {
      const specContent = fs.readFileSync(path.join(projectDir, artifacts.sourceOfTruth.spec), 'utf8');
      indicators.funcIds = (specContent.match(/\bFUNC-\d+/g) || []).length;
    } catch { /* ignore */ }
  }

  if (artifacts.sourceOfTruth.catalog) {
    try {
      const catalogContent = fs.readFileSync(path.join(projectDir, artifacts.sourceOfTruth.catalog), 'utf8');
      indicators.components = (catalogContent.match(/\bC-\d+/g) || []).length;
    } catch { /* ignore */ }
  }

  if (artifacts.hasClaudeMd) {
    try {
      const claudeMd = fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf8');
      indicators.claudeMdLines = claudeMd.split('\n').length;
    } catch { /* ignore */ }
  }

  const testsDir = path.join(projectDir, 'tests');
  if (fs.existsSync(testsDir)) {
    indicators.tests = countTestFiles(testsDir);
  }

  const ciDir = path.join(projectDir, '.github/workflows');
  if (fs.existsSync(ciDir)) indicators.ci = 'github';
  else if (fs.existsSync(path.join(projectDir, '.gitlab-ci.yml'))) indicators.ci = 'gitlab';

  if (fs.existsSync(path.join(projectDir, 'convex')) || fs.existsSync(path.join(projectDir, 'src/api'))) {
    indicators.backend = 'in-progress';
  }
  if (fs.existsSync(path.join(projectDir, 'convex/schema.ts'))) {
    try {
      const schema = fs.readFileSync(path.join(projectDir, 'convex/schema.ts'), 'utf8');
      if (schema.length > 500) indicators.backend = 'mature';
    } catch { /* ignore */ }
  }

  // Backlog: .html en premier (doctrine), .md en repli, puis variantes en dossier.
  const backlogPath = findFirstMatching(projectDir, [
    'docs/backlog-deferred.html',
    'docs/backlog-deferred.md',
    'docs/backlog-deferred/backlog-deferred-improvements.html',
    'docs/backlog-deferred/backlog-deferred-improvements.md',
  ]);
  if (backlogPath) {
    try {
      const content = fs.readFileSync(path.join(projectDir, backlogPath), 'utf8');
      if (backlogPath.endsWith('.html')) {
        // HTML: compter les IDs DEFERRED-N uniques (les en-têtes md n'existent plus).
        indicators.deferred = new Set(content.match(/\bDEFERRED-\d+\b/g) || []).size;
      } else {
        indicators.deferred = (content.match(/^### DEFERRED-\d+/gm) || []).length;
      }
    } catch { /* ignore */ }
  }

  if (fs.existsSync(path.join(projectDir, '.codex')) || fs.existsSync(path.join(projectDir, '.agents'))) {
    indicators.multiRuntime = true;
  }

  try {
    const srcDir = path.join(projectDir, 'src');
    if (fs.existsSync(srcDir)) {
      indicators.loc = countLoc(srcDir);
    }
  } catch { /* ignore */ }

  return indicators;
}

function countTestFiles(dir) {
  let count = 0;
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist') walk(full);
      } else if (/\.test\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) || /\.spec\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        count++;
      }
    }
  }
  try { walk(dir); } catch { /* ignore */ }
  return count;
}

function countLoc(dir) {
  let total = 0;
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.next') walk(full);
      } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          total += content.split('\n').length;
        } catch { /* ignore */ }
      }
    }
  }
  try { walk(dir); } catch { /* ignore */ }
  return total;
}

function detectPalier(indicators, artifacts) {
  if (!artifacts.hasClaudeDir || !artifacts.hasClaudeMd) return 0;
  if (artifacts.coreSkills.length < 3) return 0;
  if (indicators.deferred >= 30) return 6;
  if (indicators.multiRuntime) return 5;
  if (indicators.ci !== 'absent') return 4;
  if (artifacts.extraAgents.some(a => a.includes('spec-reviewer'))) return 3;
  if (artifacts.extraSkills.includes('spec-tracer') || artifacts.extraSkills.includes('qa-plan')) return 2;
  return 1;
}

function readMetaGovernState(projectDir) {
  const stateFile = path.join(projectDir, '.claude/.meta-govern.json');
  if (!fs.existsSync(stateFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return null;
  }
}

export function writeMetaGovernState(projectDir, state) {
  const claudeDir = path.join(projectDir, '.claude');
  if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });
  const stateFile = path.join(claudeDir, '.meta-govern.json');
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2] || process.cwd();
  const result = detectProject(path.resolve(target));
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
