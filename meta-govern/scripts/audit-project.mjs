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
import os from 'node:os';
import { execSync, execFileSync } from 'node:child_process';
import { detectProject } from './lib/project-detection.mjs';

const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
const FAIL_LEVEL_MAP = { critical: 4, high: 3, medium: 2, all: 1 };

// Hooks meta-govern installs and owns the proofs for. Two audit checks
// grandfather them: the inverse wiring inventory (a canonical hook may land on
// disk ahead of its settings entry on a ≤1.14.1 project) and the hook-tests
// discipline (the canon ships their own block/allow tests). Project-authored
// guards are held to both.
const CANONICAL_HOOKS = new Set([
  'session-start-env-check.mjs', 'track-workflow.mjs', 'enforce-workflow.mjs',
  'precompact-handoff.mjs', 'postcompact-reinject.mjs', 'block-docs-markdown.mjs',
  'docs-index-refresh.mjs', 'subagent-plan-edit-guard.mjs', 'agent-dispatch-preflight.mjs',
  'plan-closeout-guard.mjs', 'validate-plan.mjs', 'daily-drift-alert.mjs',
  'bash-write-guard.mjs',
]);

// A `.claude/hooks/*.test.mjs` (or .spec/.sim) sibling is a vitest suite, not a
// hook the Claude Code harness executes — it never runs standalone under the
// harness's own PATH, so it is not a macos-hardening subject. Shared by the
// macos-hardening loop AND the hook-tests discipline loop below, which already
// excluded these files (the macos-hardening loop used to not, and flagged 3/4
// of the canon's own test templates HIGH — see version.json changelog).
const HOOK_TEST_FILE_RE = /\.(test|spec|sim)\.[cm]?[jt]sx?$/;

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

// Inventaire coeur. `inventoryPolicy:'lean-by-design'` dans .claude/.meta-govern.json
// déclare que les skills/agents lourds vivent au scope USER et sont invoqués à la
// demande — leur absence de .claude/ est un CHOIX, pas une lacune. Sans cette lecture,
// un projet lean récolte ~23 findings d'absence à chaque passage et un BOOTSTRAP
// « correctif » écraserait une doctrine maison délibérée (workstation, 2026-08-10).
// On n'éteint pas la mesure : on la rend en UNE ligne INFO, auditable, plutôt qu'en
// 23 findings actionnables qui noient le vrai signal.
const leanByDesign = detection.metaGovernState?.inventoryPolicy === 'lean-by-design';

const expectedSkills = ['brainstorm', 'write-plan', 'execute-plan', 'quality-gate', 'govern-claude', 'test-driven-development'];
const expectedAgents = [
  'implementer.md',
  'ui-implementer.md',
  'spec-reviewer.md',
  'code-quality-reviewer.md',
  'persona-simulator.md',
  'codebase-reality-check.md',
];
const expectedHooks = ['session-start-env-check.mjs', 'track-workflow.mjs', 'enforce-workflow.mjs', 'precompact-handoff.mjs', 'postcompact-reinject.mjs', 'bash-write-guard.mjs'];
const expectedRules = ['clean-code.md', 'file-size-budget.md', 'spec-protocol.md', 'claude-config-style.md', 'parallel-dispatch.md', 'testing.md'];

const missingSkills = expectedSkills.filter((s) => !detection.artifacts.coreSkills.includes(s));
const missingAgents = expectedAgents.filter((a) => !detection.artifacts.coreAgents.includes(a));
const missingHooks = expectedHooks.filter((h) => !detection.artifacts.coreHooks.includes(h));
const missingRules = expectedRules.filter((r) => !detection.artifacts.coreRules.includes(r));

if (leanByDesign) {
  const total = missingSkills.length + missingAgents.length + missingHooks.length + missingRules.length;
  if (total > 0) {
    add('INFO', 'inventory',
      `Inventaire déclaré « lean-by-design » (.claude/.meta-govern.json) : ${total} artefact(s) du canon absent(s) par CHOIX, pas par dérive — ` +
      `skills [${missingSkills.join(', ') || '—'}] · agents [${missingAgents.map((a) => a.replace('.md', '')).join(', ') || '—'}] · ` +
      `hooks [${missingHooks.join(', ') || '—'}] · règles [${missingRules.join(', ') || '—'}]. ` +
      `Portée déclarée des skills coeur : ${detection.metaGovernState?.coreSkillsScope || 'non précisée'}. Ne pas BOOTSTRAPPER pour « combler ».`);
  }
} else {
  for (const skill of missingSkills) add('HIGH', 'inventory', `Missing core skill: ${skill}`);
  for (const agent of missingAgents) add('MEDIUM', 'inventory', `Missing core agent: ${agent.replace('.md', '')}`);
  for (const hook of missingHooks) add('MEDIUM', 'inventory', `Missing core hook: ${hook}`);
  for (const rule of missingRules) add('MEDIUM', 'inventory', `Missing core rule: ${rule}`);
}

// Sources de vérité. Un projet peut DÉCLARER des sources non documentaires dans
// .claude/.meta-govern.json → sourcesOfTruth : un schéma zod validé côté serveur à
// chaque écriture est un contrat plus fort qu'un doc HTML, parce qu'il est EXÉCUTABLE.
// Chercher uniquement docs/*-spec.html rend alors un « absent » qui est un décalage de
// chemins, pas une absence (workstation, 2026-08-10). On vérifie que les chemins
// déclarés existent VRAIMENT — une déclaration n'est pas une dispense.
{
  const declaredSot = detection.metaGovernState?.sourcesOfTruth || null;
  const declaredPaths = declaredSot
    ? Object.entries(declaredSot).filter(([k, v]) => k !== 'note' && typeof v === 'string')
    : [];

  if (declaredPaths.length > 0) {
    const missing = declaredPaths.filter(([, rel]) => !fs.existsSync(path.join(projectDir, rel)));
    for (const [key, rel] of missing) {
      add('HIGH', 'sources-of-truth',
        `.claude/.meta-govern.json déclare la source de vérité « ${key} » → ${rel}, mais le fichier est INTROUVABLE. Une déclaration périmée est pire qu'aucune : corriger le chemin ou retirer l'entrée.`);
    }
    if (missing.length < declaredPaths.length) {
      add('INFO', 'sources-of-truth',
        `Sources de vérité déclarées et présentes : ${declaredPaths.filter(([, rel]) => fs.existsSync(path.join(projectDir, rel))).map(([k, rel]) => `${k}=${rel}`).join(' · ')}.`);
    }
  } else {
    if (!detection.artifacts.sourceOfTruth.spec) {
      add('HIGH', 'sources-of-truth', 'No spec doc found at expected paths (docs/*-spec.html, etc.). Si la source de vérité de ce projet est du CODE (schéma zod, types), la déclarer dans .claude/.meta-govern.json → sourcesOfTruth.');
    }
    if (!detection.artifacts.sourceOfTruth.dataModel) {
      add('HIGH', 'sources-of-truth', 'No data-model doc found at expected paths. Idem : un schéma exécutable se déclare dans .meta-govern.json → sourcesOfTruth.');
    }
    if (!detection.artifacts.sourceOfTruth.catalog) {
      add('MEDIUM', 'sources-of-truth', 'No component catalog found.');
    }
  }
}

// === Doctrine docs HTML ===
// Les docs humains sont en HTML; .md sous docs/ = dérive à migrer.
{
  const doctrine = detection.docsDoctrine || {};
  // Carve-out DÉCLARÉ : « agent instructions stay in Markdown » ne se limite pas à
  // CLAUDE.md/AGENTS.md/SKILL.md — un docs/<sous-système>.md dont le LECTEUR réel est
  // un agent (protocole, contrat d'outil, rubrique) est légitimement en Markdown. Un
  // projet enregistre ce choix via docsDoctrine:'markdown-agent-facing' dans
  // .claude/.meta-govern.json ; l'audit le lit AVANT de compter des .md, sinon chaque
  // passage re-litige une décision déjà prise (workstation, audit 2026-08-10 : 21 .md
  // signalés en dérive alors que 48 des 56 HTML étaient des plans, doctrine respectée).
  const docsDoctrineDeclared = detection.metaGovernState?.docsDoctrine || null;
  const mdAgentFacing = docsDoctrineDeclared === 'markdown-agent-facing';

  if (mdAgentFacing) {
    add('INFO', 'docs-doctrine',
      `Doctrine docs déclarée « markdown-agent-facing » (.claude/.meta-govern.json) : les .md sous docs/ sont des protocoles lus par les agents, pas une dérive. ${doctrine.mdCount ?? 0} .md / ${doctrine.htmlCount ?? 0} .html. Ne PAS lancer migrate --target=html-docs sur ce projet.`);
  } else if (doctrine.format === 'md' || doctrine.format === 'mixed') {
    add('HIGH', 'markdown-docs-drift',
      `docs/ contient ${doctrine.mdCount} fichier(s) .md (doctrine: docs humains = HTML). Lancer node ~/.claude/skills/meta-govern/scripts/migrate-project.mjs <projet> --target=html-docs. Si ces .md sont des protocoles lus par des AGENTS, ce n'est pas une dérive — enregistrer docsDoctrine:'markdown-agent-facing' dans .claude/.meta-govern.json.`);
  }
  if (detection.artifacts.hasClaudeDir && !mdAgentFacing) {
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

// === Convex frugality contract ===
// Enforcement déterministe des deux garde-fous machine-vérifiables de
// references/stack-convex.html#frugality-contract (différé en v1.6.0 ;
// calibré contre les projets Convex réels avant d'être shippé, v1.7.1).
if (detection.stack.isConvex) {
  // (a) Chaque cron enregistré porte un marqueur `cost-justified` — sur la
  // ligne d'enregistrement ou dans le bloc de commentaire contigu au-dessus.
  const cronsPath = path.join(projectDir, 'convex/crons.ts');
  if (fs.existsSync(cronsPath)) {
    const cronsContent = fs.readFileSync(cronsPath, 'utf8');
    const cronsLines = cronsContent.split('\n');
    const registrationRe = /\bcrons\.(cron|interval|hourly|daily|weekly|monthly)\s*\(/g;
    let reg;
    while ((reg = registrationRe.exec(cronsContent)) !== null) {
      const lineIdx = cronsContent.slice(0, reg.index).split('\n').length - 1;
      const tail = cronsContent.slice(reg.index + reg[0].length, reg.index + reg[0].length + 200);
      const nameMatch = tail.match(/^\s*['"`]([^'"`]+)['"`]/);
      const label = nameMatch ? `« ${nameMatch[1]} »` : `entrée ligne ${lineIdx + 1}`;
      let justified = /cost-justified/i.test(cronsLines[lineIdx]);
      for (let i = lineIdx - 1; !justified && i >= 0 && /^\s*(\/\/|\/\*|\*)/.test(cronsLines[i]); i--) {
        if (/cost-justified/i.test(cronsLines[i])) justified = true;
      }
      if (!justified) {
        add('MEDIUM', 'convex-frugality',
          `convex/crons.ts : cron ${label} sans marqueur // cost-justified (zéro cron sans justification de coût). Vérifier le coût en function calls dans le design puis annoter // cost-justified: <réf design>. Voir stack-convex.html#frugality-contract.`,
          cronsPath);
      }
    }
  }

  // (b) Aucun fichier de test ne touche un déploiement réel : le signal exige
  // soit l'import de ConvexHttpClient (convex/browser), soit un slug de
  // déploiement RÉEL (<token>-<token>-<digits>.convex.cloud|site — les hôtes
  // factices type example.convex.site ne matchent pas) CONJOINT à un fetch(.
  // Les suites convex-test (in-memory) sont conformes par définition.
  // .claude est exclu du walk (les copies sous .claude/worktrees dupliqueraient
  // les constats) ; le contenu n'est lu que pour les basenames de test.
  const TEST_FILE_RE = /\.(test|spec)\.[cm]?[jt]sx?$/;
  const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.vercel', '.wrangler', '_generated', '.claude']);
  const DEPLOY_URL_RE = /\b(?:https?|wss?):\/\/[a-z0-9]+(?:-[a-z0-9]+)*-\d+\.convex\.(?:cloud|site)\b/i;
  const testFiles = [];
  (function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (entry.isFile() && TEST_FILE_RE.test(entry.name)) {
        testFiles.push(path.join(dir, entry.name));
      }
    }
  })(projectDir);
  for (const testFile of testFiles) {
    let testContent;
    try { testContent = fs.readFileSync(testFile, 'utf8'); } catch { continue; }
    if (/['"]convex-test['"]/.test(testContent)) continue;
    const importsHttpClient = /\bConvexHttpClient\b/.test(testContent) && /['"]convex\/browser['"]/.test(testContent);
    const hitsDeployUrl = DEPLOY_URL_RE.test(testContent) && /\bfetch\s*\(/.test(testContent);
    if (importsHttpClient || hitsDeployUrl) {
      const why = importsHttpClient ? 'import de ConvexHttpClient' : 'URL de déploiement réel + fetch';
      add('HIGH', 'convex-frugality',
        `Fichier de test touchant un déploiement Convex réel (${why}) sans convex-test — les boucles de test contre un déploiement brûlent les quotas. Migrer la suite sur convex-test (in-memory) ; un déploiement ne sert qu'aux sondes ponctuelles. Voir stack-convex.html#frugality-contract.`,
        testFile);
    }
  }
}

// === Convex mutation-arg casts ===
// Un cast de type sur les args d'un handle useMutation/useAction masque un
// mismatch de payload que le validateur Convex rejette à l'EXÉCUTION
// (ArgumentValidationError) — incident personal-budget-app : 36 casts
// `as never` masquaient 3 payloads CRITICAL pendant que 213 tests mockés
// restaient verts. Heuristique liée-au-callee : seul un cast DANS les args
// d'un appel du handle (ou d'un appel inline useMutation(api.x)(…)) compte —
// les `as never` d'exhaustivité TS, les mocks de test et les commentaires
// sont structurellement exclus. Différé en v1.10.0, promu en v1.11.0 après
// calibrage contre les 5 projets Convex réels de la machine.
if (detection.stack.isConvex) {
  const SRC_FILE_RE = /\.[cm]?[jt]sx?$/;
  const CAST_RE = /\bas\s+(?:never|any|unknown)\b/;
  const WALK_SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.vercel', '.wrangler', '_generated', '.claude']);
  const srcFiles = [];
  (function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!WALK_SKIP.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (entry.isFile() && SRC_FILE_RE.test(entry.name)) {
        srcFiles.push(path.join(dir, entry.name));
      }
    }
  })(projectDir);

  // Index (exclusif) de la parenthèse fermante appariée à text[openIdx] === '('.
  // Ignore les parenthèses dans les chaînes (heuristique) ; borné à 5000 chars.
  const balancedClose = (text, openIdx) => {
    let depth = 0;
    for (let i = openIdx; i < text.length && i < openIdx + 5000; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') { depth--; if (depth === 0) return i; }
    }
    return -1;
  };
  const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

  for (const srcFile of srcFiles) {
    let content;
    try { content = fs.readFileSync(srcFile, 'utf8'); } catch { continue; }
    if (!/use(?:Mutation|Action)\s*\(/.test(content)) continue;
    // Strip des commentaires en préservant les numéros de ligne (un bind ou un
    // cast commenté ne doit jamais compter).
    const stripped = content
      .replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

    // Pattern A — handle lié : const m = useMutation(...) puis m(<args castés>).
    const handles = new Set();
    const bindRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*use(?:Mutation|Action)\s*\(/g;
    let bind;
    while ((bind = bindRe.exec(stripped)) !== null) handles.add(bind[1]);
    for (const handle of handles) {
      const callRe = new RegExp(`\\b${handle}\\s*\\(`, 'g');
      let call;
      while ((call = callRe.exec(stripped)) !== null) {
        const open = call.index + call[0].length - 1;
        const close = balancedClose(stripped, open);
        if (close === -1) continue;
        if (CAST_RE.test(stripped.slice(open + 1, close))) {
          add('HIGH', 'convex-mutation-casts',
            `Cast de type (as never/any/unknown) sur les args de « ${handle}(…) » (handle useMutation/useAction, ligne ${lineOf(stripped, call.index)}) — le cast masque un mismatch de payload que le validateur Convex rejette à l'exécution (ArgumentValidationError). Corriger le contrat client↔validateur, jamais caster. Voir stack-convex.html#mutation-payload-casts.`,
            srcFile);
        }
      }
    }

    // Pattern B — appel inline : useMutation(api.x.y)(<args castés>).
    const inlineRe = /\buse(?:Mutation|Action)\s*\(/g;
    let inline;
    while ((inline = inlineRe.exec(stripped)) !== null) {
      const open = inline.index + inline[0].length - 1;
      const close = balancedClose(stripped, open);
      if (close === -1) continue;
      let j = close + 1;
      while (j < stripped.length && /\s/.test(stripped[j])) j++;
      if (stripped[j] !== '(') continue;
      const close2 = balancedClose(stripped, j);
      if (close2 === -1) continue;
      if (CAST_RE.test(stripped.slice(j + 1, close2))) {
        add('HIGH', 'convex-mutation-casts',
          `Cast de type (as never/any/unknown) sur les args d'un appel inline useMutation/useAction (ligne ${lineOf(stripped, inline.index)}) — le cast masque un mismatch de payload que le validateur Convex rejette à l'exécution. Corriger le contrat client↔validateur, jamais caster. Voir stack-convex.html#mutation-payload-casts.`,
          srcFile);
      }
    }
  }
}

// === Env parity (.env.local ↔ import.meta.env.*) ===
// Dérive locale : une clé VITE_* lue par src/ sans être déclarée dans
// .env.local casse au premier run (personal-budget-app : dev server remis au
// propriétaire sans VITE_FIREBASE_* → auth/invalid-api-key). Porté du
// preflight-setup-check.envparity de personal-budget-app ; read-only (le
// preflight lui-même reste émis par le plan, décision v1.10.0). Ne tourne QUE
// si .env.local existe : gitignoré, absent sur un clone frais ≠ constat.
// Une clé est optionnelle si TOUS ses sites de lecture testent la valeur —
// fallback || / ??, comparaison, garde if (même ligne, if contigu sur la même
// clé, ou test de l'identifiant affecté dans les 3 lignes suivantes : le
// pattern flag `const f = import.meta.env.K;` puis `f === '1' || …`) — ou si
// elle est déclarée dans optionalEnvKeys de docs/docs-map.json (clés
// build-time injectées par trigger, ex. Cloudflare Workers Builds).
// Aucune VALEUR n'est jamais imprimée — noms de clés seulement.
if (detection.stack.isVite) {
  const envLocalPath = path.join(projectDir, '.env.local');
  const srcDir = path.join(projectDir, 'src');
  if (fs.existsSync(envLocalPath) && fs.existsSync(srcDir)) {
    const SRC_FILE_RE = /\.[cm]?[jt]sx?$/;
    const WALK_SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '_generated']);
    const OPTIONAL_LINE_RE = /(\|\||\?\?|===|!==|==|!=|\btypeof\b|\bif\s*\(|\?\s)/;
    // clé -> a-t-elle au moins un site de lecture NON testé (= requise) ?
    const bareReads = new Map();
    (function walk(dir) {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!WALK_SKIP.has(entry.name)) walk(path.join(dir, entry.name));
        } else if (entry.isFile() && SRC_FILE_RE.test(entry.name)) {
          let content;
          try { content = fs.readFileSync(path.join(dir, entry.name), 'utf8'); } catch { continue; }
          if (!content.includes('import.meta.env.')) continue;
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const readRe = /import\.meta\.env\.(VITE_[A-Z0-9_]+)/g;
            let read;
            while ((read = readRe.exec(lines[i])) !== null) {
              const key = read[1];
              let guarded = OPTIONAL_LINE_RE.test(lines[i]);
              // Garde if contiguë sur la MÊME clé (lecture dans le corps du if).
              for (let k = i - 1; !guarded && k >= 0 && k >= i - 3; k--) {
                if (new RegExp(`\\bif\\s*\\([^)]*import\\.meta\\.env\\.${key}\\b`).test(lines[k])) guarded = true;
              }
              // Pattern flag : affectation nue puis test de l'identifiant
              // dans les 3 lignes suivantes (const f = …K; / f === '1' || …).
              if (!guarded) {
                const assign = lines[i].match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
                if (assign) {
                  const identRe = new RegExp(`\\b${assign[1]}\\b`);
                  for (let k = i + 1; !guarded && k < lines.length && k <= i + 3; k++) {
                    if (identRe.test(lines[k]) && OPTIONAL_LINE_RE.test(lines[k])) guarded = true;
                  }
                }
              }
              if (!bareReads.has(key)) bareReads.set(key, false);
              if (!guarded) bareReads.set(key, true);
            }
          }
        }
      }
    })(srcDir);

    let declaredOptional = [];
    try {
      const docsMap = JSON.parse(fs.readFileSync(path.join(projectDir, 'docs/docs-map.json'), 'utf8'));
      const declared = docsMap.optionalEnvKeys ?? docsMap.conventions?.optionalEnvKeys;
      if (Array.isArray(declared)) declaredOptional = declared.filter((k) => typeof k === 'string');
    } catch { /* pas de docs-map ou illisible : pas d'échappatoire, fail-soft */ }

    const envKeys = new Set();
    try {
      for (const line of fs.readFileSync(envLocalPath, 'utf8').split('\n')) {
        const m = line.match(/^\s*(VITE_[A-Z0-9_]+)\s*=/);
        if (m) envKeys.add(m[1]);
      }
    } catch { /* illisible : fail-soft, pas de constat sur du bruit */ }

    const optionalSet = new Set(declaredOptional);
    const missing = [...bareReads.entries()]
      .filter(([key, bare]) => bare && !optionalSet.has(key) && !envKeys.has(key))
      .map(([key]) => key)
      .sort();
    if (missing.length > 0) {
      add('MEDIUM', 'env-parity',
        `Clé(s) VITE_* lue(s) par src/ (import.meta.env.*, sans fallback ni garde) absente(s) de .env.local : ${missing.join(', ')} — le premier run local casse (cf. incident auth/invalid-api-key). Ajouter les clés à .env.local, ou les déclarer dans optionalEnvKeys de docs/docs-map.json si elles sont injectées au build (trigger Cloudflare Workers Builds…). Voir workflow-blueprint.html#phase-0.`,
        envLocalPath);
    }
  }
}

// === Delta-protocol commit-message lint ===
// The 3 source-of-truth docs may only change via an apply-delta / amendment /
// bugfix-doc-correction commit (spec-protocol.md §3, §9, §9.1). A commit that
// edits one of them with any other message bypassed the delta protocol.
//
// Escape hatch for pre-bootstrap history: a project may declare
// `deltaProtocolBaselineCommit` (a commit SHA) in docs/docs-map.json — top-level
// or under conventions.*. Every SoT commit reachable from that baseline (= it and
// all its ancestors) is skipped: the delta protocol is prospective, and rewriting
// history to satisfy it would itself be a violation.
{
  const sotFiles = [
    detection.artifacts.sourceOfTruth.spec,
    detection.artifacts.sourceOfTruth.dataModel,
    detection.artifacts.sourceOfTruth.catalog,
  ].filter(Boolean);
  if (detection.isGitRepo && sotFiles.length > 0) {
    // Optional baseline: hashes reachable from it are pre-bootstrap history and
    // exempt. Fail-soft — an absent/invalid key leaves the set empty, so the
    // check behaves exactly as before. The SHA guard also blocks shell injection.
    let preBaselineSet = new Set();
    let baseline = null;
    try {
      const map = JSON.parse(fs.readFileSync(path.join(projectDir, 'docs/docs-map.json'), 'utf8'));
      baseline = map?.deltaProtocolBaselineCommit || map?.conventions?.deltaProtocolBaselineCommit || null;
    } catch { /* no docs-map or unreadable: no escape hatch */ }
    if (baseline && /^[0-9a-f]{7,40}$/i.test(baseline)) {
      try {
        preBaselineSet = new Set(
          execFileSync('git', ['rev-list', baseline], { cwd: projectDir, encoding: 'utf8' })
            .split('\n').map((s) => s.trim()).filter(Boolean),
        );
      } catch { /* bad ref: fail-soft, exempt nothing */ }
    }
    for (const sot of sotFiles) {
      let commits = [];
      try {
        commits = execSync(`git log --follow --format=%H%x1f%s -- "${sot}"`, {
          cwd: projectDir,
          encoding: 'utf8',
        })
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const idx = line.indexOf('\x1f');
            return { hash: line.slice(0, idx), subj: line.slice(idx + 1).trim() };
          });
      } catch {
        continue;
      }
      for (const { hash, subj } of commits) {
        if (preBaselineSet.has(hash)) continue;
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

// === Runtime parity (.claude ↔ .agents) ===
// Multi-runtime projects (palier 5) mirror governance files between .claude/
// (Claude Code) and .agents/ (Codex). Any pair declared sync:"exact" in
// .claude/runtime-parity.json that has drifted means one runtime's copy is stale
// — a governance lie, exactly the failure the parity gate exists to catch. This
// is the read-only mirror of .claude/scripts/check-runtime-parity.mjs (that
// script is the enforcing gate; this only surfaces the drift in the audit).
// Fail-soft: absent/invalid manifest = nothing to check. Documented-divergence
// and malformed pairs are the gate script's concern, not the audit's.
if (detection.indicators.multiRuntime) {
  const parityManifest = path.join(projectDir, '.claude/runtime-parity.json');
  if (fs.existsSync(parityManifest)) {
    let manifest = null;
    try { manifest = JSON.parse(fs.readFileSync(parityManifest, 'utf8')); } catch { manifest = null; }
    const pairs = Array.isArray(manifest?.pairs) ? manifest.pairs : [];
    const readNorm = (rel) => {
      try { return fs.readFileSync(path.join(projectDir, rel), 'utf8').replace(/\r\n/g, '\n'); } catch { return null; }
    };
    for (const pair of pairs) {
      const claudePath = pair && typeof pair.claudePath === 'string' ? pair.claudePath : null;
      const agentsPath = pair && typeof pair.agentsPath === 'string' ? pair.agentsPath : null;
      const sync = pair && typeof pair.sync === 'string' ? pair.sync : 'exact';
      if (!claudePath || !agentsPath || sync !== 'exact') continue;
      const claudeContent = readNorm(claudePath);
      const agentsContent = readNorm(agentsPath);
      if (claudeContent === null && agentsContent === null) continue; // declared but neither side exists yet
      if (claudeContent === null || agentsContent === null) {
        add('HIGH', 'runtime-parity',
          `Paire de parité « exact » présente d'un seul côté — ${claudeContent === null ? claudePath : agentsPath} manquant. Les miroirs .claude/ ↔ .agents/ doivent rester alignés ; resynchroniser puis vérifier via node .claude/scripts/check-runtime-parity.mjs.`,
          parityManifest);
      } else if (claudeContent !== agentsContent) {
        add('HIGH', 'runtime-parity',
          `Divergence de parité runtime (paire « exact ») — ${claudePath} ≠ ${agentsPath} : une copie de gouvernance est périmée. Resynchroniser les deux runtimes puis vérifier via node .claude/scripts/check-runtime-parity.mjs.`,
          parityManifest);
      }
    }
  }
}

// === CI policy (leçon 7) ===
// Server-side CI is a recommended OPTION at palier 4+, not a fixed requirement. A
// project may instead record ciPolicy:'local-compensation' in
// .claude/.meta-govern.json and carry the coverage locally (the Stop gate under
// MG_HEADLESS_RUN + predeploy-check.mjs). Under that policy the missing CI is
// surfaced as an OPTION (INFO), never a manquement. Policy undecided at palier 4+
// with no CI → a nudge to decide (LOW). Policy says server-ci but none is wired →
// a real drift (MEDIUM). Read-only; no value is ever executed.
{
  const hasServerCi = detection.indicators.ci === 'github' || detection.indicators.ci === 'gitlab';
  const ciPolicy = detection.metaGovernState?.ciPolicy || null;
  if (!hasServerCi && detection.palier >= 4) {
    if (ciPolicy === 'local-compensation') {
      const compensation = detection.indicators.localDeployGate
        ? 'gate Stop sous MG_HEADLESS_RUN + predeploy-check.mjs'
        : 'gate Stop sous MG_HEADLESS_RUN (predeploy-check.mjs absent — le poser via migrate palier 4)';
      add('INFO', 'ci-policy',
        `Pas de CI serveur — politique assumée ciPolicy:'local-compensation'. Compensation locale : ${compensation}. Une CI serveur (GitHub Actions / GitLab + branch protection) reste une OPTION, pas un manquement. Voir evolution-roadmap.html.`);
    } else if (ciPolicy === 'server-ci') {
      add('MEDIUM', 'ci-policy',
        `.claude/.meta-govern.json déclare ciPolicy:'server-ci' mais aucun workflow CI n'est présent (.github/workflows ou .gitlab-ci.yml). Poser la CI serveur, ou basculer la politique en 'local-compensation' (compensation locale documentée). Voir evolution-roadmap.html.`);
    } else {
      add('LOW', 'ci-policy',
        `Pas de CI serveur au palier ${detection.palier} et aucune politique de release enregistrée. Décider : soit poser une CI serveur (GitHub Actions / GitLab + branch protection), soit enregistrer ciPolicy:'local-compensation' dans .claude/.meta-govern.json (compensation locale = gate Stop + predeploy-check.mjs). Voir evolution-roadmap.html.`);
    }
  }
}

// === Wiring checks ===

if (detection.artifacts.hasSettingsJson) {
  try {
    const settings = JSON.parse(fs.readFileSync(path.join(projectDir, '.claude/settings.json'), 'utf8'));
    const declared = extractDeclaredHooks(settings);
    for (const declaredHook of declared) {
      // Both shell forms are valid and BOTH appear in real projects: `${CLAUDE_PROJECT_DIR}`
      // and the unbraced `$CLAUDE_PROJECT_DIR`. Substituting only the braced form left the
      // literal `$CLAUDE_PROJECT_DIR/...` in the path, existsSync failed, and a false
      // CRITICAL fired on a hook that was present and working (workstation, audit 2026-08-10).
      // Also expand $HOME/~ so a hook declared by absolute home path resolves.
      const scriptPath = declaredHook
        .replace(/\$\{CLAUDE_PROJECT_DIR\}/g, projectDir)
        .replace(/\$CLAUDE_PROJECT_DIR\b/g, projectDir)
        .replace(/\$\{HOME\}/g, os.homedir())
        .replace(/\$HOME\b/g, os.homedir())
        .replace(/^~(?=\/)/, os.homedir());
      if (!fs.existsSync(scriptPath)) {
        add('CRITICAL', 'wiring', `Hook declared in settings.json but script missing: ${scriptPath}`);
      }
    }
  } catch (err) {
    add('HIGH', 'wiring', `settings.json parse error: ${err.message}`);
  }
}

// Inverse inventory (disk → settings/agents): the forward check above catches a
// settings entry whose script is missing; this catches the dead matcher — a hook
// .mjs on disk wired nowhere, neither in settings(.local).json nor in an agent
// frontmatter, so it never fires. Canonical hooks are grandfathered (a ≤1.14.1
// project may carry one on disk ahead of its wiring). The vitest
// hooks-inventory.test.mjs is the strict proof where installed; this is its
// read-only, fail-soft audit-side mirror.
{
  const hooksDirInv = path.join(projectDir, '.claude/hooks');
  if (fs.existsSync(hooksDirInv)) {
    let wired = '';
    for (const name of ['settings.json', 'settings.local.json']) {
      try { wired += '\n' + fs.readFileSync(path.join(projectDir, '.claude', name), 'utf8'); } catch { /* absent: skip */ }
    }
    const agentsDirInv = path.join(projectDir, '.claude/agents');
    if (fs.existsSync(agentsDirInv)) {
      for (const agentFile of fs.readdirSync(agentsDirInv).filter(f => f.endsWith('.md'))) {
        try { wired += '\n' + fs.readFileSync(path.join(agentsDirInv, agentFile), 'utf8'); } catch { /* fail-soft */ }
      }
    }
    let diskHooks = [];
    try { diskHooks = fs.readdirSync(hooksDirInv).filter(f => f.endsWith('.mjs')); } catch { /* fail-soft */ }
    for (const hookFile of diskHooks) {
      if (hookFile.startsWith('lib') || /\.(test|spec|sim)\.[cm]?[jt]sx?$/.test(hookFile)) continue;
      if (CANONICAL_HOOKS.has(hookFile)) continue;
      if (!wired.includes(hookFile)) {
        add('MEDIUM', 'wiring',
          `Hook ${hookFile} present on disk but wired nowhere — absent from settings.json/settings.local.json and from every agent frontmatter (dead matcher: it never fires). Declare it (a matcher in settings.json, or an agent hooks: block) or remove it.`,
          path.join(hooksDirInv, hookFile));
      }
    }
  }
}

// === Anti-pattern checks ===

if (detection.artifacts.hasClaudeMd) {
  const content = fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf8');
  // Strip machine-generated vendor fences before the prose anti-pattern scans.
  // A tool like `npx convex ai-files` injects a block delimited by paired HTML
  // comment markers (<!-- convex-ai-start -->…<!-- convex-ai-end -->) whose text
  // ("**always read**") trips the defensive-scaffolding regex on a token no human
  // can fix (it is regenerated on the next install). The backreference \1 requires
  // the MATCHING end marker, so an unmatched opener strips nothing (no EOF runaway).
  // Scope: the two CLAUDE.md anti-pattern checks only — the volatile-state block
  // below keeps scanning raw `content` (generated fences never carry palier/version
  // literals, and stripping there could mask a real stale-state lie).
  const scanContent = content.replace(/<!--\s*([\w.-]+?)-(?:start|generated)\s*-->[\s\S]*?<!--\s*\1-end\s*-->/gi, '');
  if (/@[\w./-]+\.md/.test(scanContent)) {
    add('HIGH', 'anti-pattern', 'CLAUDE.md contains @-file imports. Use declarative pointers instead.');
  }
  if (/\b(MUST|ALWAYS|NEVER|n'oublie pas|verify before returning|double-check before returning|do not skip)\b/i.test(scanContent)) {
    add('MEDIUM', 'anti-pattern', 'CLAUDE.md contains defensive scaffolding (Claude 4.7+/5-family anti-pattern). Rewrite as positive statements.');
  }

  // === Volatile state in standing context (durable-only doctrine, v1.9.0) ===
  // CLAUDE.md/AGENTS.md carry only durable invariants. State (palier,
  // meta-govern version) lives in .claude/.meta-govern.json — the standing
  // context POINTS, never duplicates. A stored value that DIVERGES from the
  // literal in CLAUDE.md is worse than duplication: it lies. See
  // references/anti-pattern-catalog.html#claude.md-anti-patterns.
  {
    const state = detection.metaGovernState || {};
    const standingFiles = [{ name: 'CLAUDE.md', body: content, file: path.join(projectDir, 'CLAUDE.md') }];
    const agentsMdPath = path.join(projectDir, 'AGENTS.md');
    if (fs.existsSync(agentsMdPath)) {
      standingFiles.push({ name: 'AGENTS.md', body: fs.readFileSync(agentsMdPath, 'utf8'), file: agentsMdPath });
    }
    for (const { name, body, file } of standingFiles) {
      const verMatch = body.match(/meta-govern version:\s*([0-9]+\.[0-9]+\.[0-9]+)/i);
      if (verMatch) {
        if (state.metaGovernVersion && verMatch[1] !== state.metaGovernVersion) {
          add('HIGH', 'stale-state', `${name} hardcodes « meta-govern version: ${verMatch[1]} » but .claude/.meta-govern.json says ${state.metaGovernVersion} — remove the line and point to .meta-govern.json (durable-only doctrine).`, file);
        } else {
          add('LOW', 'state-duplication', `${name} duplicates meta-govern version from .claude/.meta-govern.json — replace with a pointer (durable-only doctrine).`, file);
        }
      }
      const palierMatch = body.match(/Current palier:\s*(\d+)/i);
      if (palierMatch) {
        if (state.palier != null && Number(palierMatch[1]) !== Number(state.palier)) {
          add('HIGH', 'stale-state', `${name} hardcodes « Current palier: ${palierMatch[1]} » but .claude/.meta-govern.json says ${state.palier} — remove and point to .meta-govern.json.`, file);
        } else {
          add('LOW', 'state-duplication', `${name} duplicates palier from .claude/.meta-govern.json — replace with a pointer.`, file);
        }
      }
    }
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
// Commandes brutes déclarées dans settings(.local).json — servent à détecter un
// durcissement PATH posé au site d'invocation plutôt que dans le script.
const declaredHookCommands = (() => {
  const cmds = [];
  for (const f of ['.claude/settings.json', '.claude/settings.local.json']) {
    const p = path.join(projectDir, f);
    if (!fs.existsSync(p)) continue;
    try {
      cmds.push(...extractDeclaredHookCommands(JSON.parse(fs.readFileSync(p, 'utf8'))));
    } catch { /* parse error already reported by the wiring check */ }
  }
  return cmds;
})();
if (fs.existsSync(hooksDir)) {
  for (const hookFile of fs.readdirSync(hooksDir).filter(f => f.endsWith('.mjs') || f.endsWith('.sh'))) {
    if (hookFile.startsWith('lib')) continue; // skip lib subdir entries
    if (HOOK_TEST_FILE_RE.test(hookFile)) continue; // a test file is not a hook the harness runs
    const hookPath = path.join(hooksDir, hookFile);
    const content = fs.readFileSync(hookPath, 'utf8');
    // Hook hardens PATH if any of: declares PATH_PREFIX itself, mutates process.env.PATH,
    // imports ./lib/hook-utils (which does both), OR — third valid location — has the PATH
    // inlined at its INVOCATION SITE in settings.json (`PATH="…" bun "$CLAUDE_PROJECT_DIR/…"`).
    // Same guarantee, different place; only checking inside the script yielded a false HIGH
    // on hooks that were correctly hardened at the call site (workstation, 2026-08-10).
    const hasOwnHardening = /PATH_PREFIX|process\.env\.PATH\s*=/.test(content);
    const importsLib = /from\s+['"]\.\/lib\/hook-utils(\.mjs)?['"]/.test(content) || /require\(['"]\.\/lib\/hook-utils/.test(content);
    const hardenedAtCallSite = declaredHookCommands.some(
      (cmd) => cmd.includes(hookFile) && /(^|\s)PATH\s*=\s*["']?[^"']*\/(usr\/bin|opt\/homebrew\/bin|shims)/.test(cmd),
    );
    if (hookFile.endsWith('.mjs') && !hasOwnHardening && !importsLib && !hardenedAtCallSite) {
      add('HIGH', 'macos-hardening', `Hook ${hookFile} missing PATH_PREFIX export (Apple Silicon) — ni dans le script, ni inliné au site d'invocation dans settings.json.`, hookPath);
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

// === Hook / guard test discipline ===
// A hook that throws or mis-parses fails SILENTLY (exit 0, blocks nothing) — a
// broken guard is worse than no guard (lesson 2026-07-02, class tooling-self-
// reference: 3 findings were guards that shipped untested). Every PROJECT-AUTHORED
// guard ships its simulation/test in the same commit. Canonical hooks are
// grandfathered (the canon owns their proofs). Fail-soft, absolute paths.
if (fs.existsSync(hooksDir)) {
  const TEST_SIM_RE = HOOK_TEST_FILE_RE;
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.vercel', '.wrangler', '_generated']);
  const testCorpus = [];
  (function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path.join(dir, e.name)); }
      else if (e.isFile() && TEST_SIM_RE.test(e.name)) testCorpus.push(path.join(dir, e.name));
    }
  })(projectDir);
  for (const hookFile of fs.readdirSync(hooksDir).filter(f => f.endsWith('.mjs'))) {
    if (hookFile.startsWith('lib') || CANONICAL_HOOKS.has(hookFile) || TEST_SIM_RE.test(hookFile)) continue;
    const base = hookFile.replace(/\.mjs$/, '');
    // Collect the CONTENT of every file that exercises this guard: a co-located
    // sibling (base.{test,spec,sim}.mjs) or any corpus file that names it.
    const refTexts = [];
    for (const k of ['test', 'spec', 'sim']) {
      for (const ext of ['mjs', 'ts', 'js']) {
        const sib = path.join(hooksDir, `${base}.${k}.${ext}`);
        if (fs.existsSync(sib)) {
          try { refTexts.push(fs.readFileSync(sib, 'utf8')); } catch { /* fail-soft */ }
        }
      }
    }
    for (const tf of testCorpus) {
      let c;
      try { c = fs.readFileSync(tf, 'utf8'); } catch { continue; }
      if (c.includes(hookFile) || c.includes(`hooks/${base}`)) refTexts.push(c);
    }
    if (refTexts.length === 0) {
      add('HIGH', 'hook-tests',
        `Project-authored guard ${hookFile} ships no simulation/test — a hook that throws fails silently (exit 0, blocks nothing). Add ${base}.test.mjs (or .sim.mjs) exercising block AND allow paths in the same commit. See hook-canonical-patterns.html.`,
        path.join(hooksDir, hookFile));
      continue;
    }
    // Presence of a test is not enough: a smoke test that only loads the guard
    // proves nothing. Require BOTH a positive case (the forbidden input is
    // denied/blocked) AND a negative case (the legitimate input is allowed — a
    // silent exit 0 with null stdout). PreToolUse guards deny; Stop gates block.
    const corpus = refTexts.join('\n');
    // Un hook CONSULTATIF (rappel non bloquant : jamais d'exit 2, jamais de
    // permissionDecision 'deny') ne PEUT pas prouver un cas bloquant — exiger
    // « deny/block » de son test est un faux positif structurel. Sa paire
    // positif/négatif est « émet l'avis » vs « reste silencieux ».
    let hookSource = '';
    try { hookSource = fs.readFileSync(path.join(hooksDir, hookFile), 'utf8'); } catch { /* fail-soft */ }
    const isAdvisoryOnly = hookSource !== '' &&
      !/process\.exit\(\s*2\s*\)/.test(hookSource) &&
      !/permissionDecision\s*:\s*['"]deny['"]/.test(hookSource);

    const provesBlock = isAdvisoryOnly
      ? /toContain|toMatch|not\.toBeNull|\bémet|\bemits?\b|\brappel/i.test(corpus)
      : /\b(deny|block|reject|refus|bloqu)\w*\b/i.test(corpus) || /\.toBe\(\s*2\s*\)/.test(corpus);
    const provesAllow = /toBeNull|\ballow\b|\bpasser\b|\bsilenc/i.test(corpus) ||
      /\.toBe\(\s*(['"])\1\s*\)/.test(corpus) || /\.toBe\(\s*0\s*\)/.test(corpus);

    if (!provesBlock || !provesAllow) {
      const positive = isAdvisoryOnly ? "pas de cas « l'avis est émis »" : 'pas de cas bloquant (positif)';
      const gap = !provesBlock && !provesAllow ? 'ni cas positif ni cas passant'
        : !provesBlock ? positive
        : 'pas de cas passant (négatif)';
      const expected = isAdvisoryOnly
        ? "Ce garde est CONSULTATIF (aucun exit 2, aucun permissionDecision 'deny') : assert qu'il ÉMET son avis sur l'entrée concernée ET qu'il reste SILENCIEUX sur l'entrée hors périmètre."
        : 'Assert the deny/block decision on the forbidden input AND the silent allow (null stdout, exit 0) on the legitimate one, so a guard that stops enforcing is caught.';
      add('HIGH', 'hook-tests',
        `Project-authored guard ${hookFile} has a test that only proves presence — ${gap}. ${expected} See hook-canonical-patterns.html.`,
        path.join(hooksDir, hookFile));
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

/** Raw `command` strings of every declared hook — needed to see hardening (PATH=…)
 *  that lives at the INVOCATION SITE rather than inside the hook script. */
function extractDeclaredHookCommands(settings) {
  const out = [];
  if (!settings?.hooks) return out;
  for (const event of Object.keys(settings.hooks)) {
    const declarations = Array.isArray(settings.hooks[event]) ? settings.hooks[event] : [settings.hooks[event]];
    for (const decl of declarations) {
      const hooks = Array.isArray(decl.hooks) ? decl.hooks : [decl];
      for (const hook of hooks) {
        if (typeof hook?.command === 'string') out.push(hook.command);
      }
    }
  }
  return out;
}
