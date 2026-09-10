#!/usr/bin/env node
// .claude/scripts/check-model-routing.mjs — installé par meta-govern (BOOTSTRAP).
//
// Deux garanties, une seule source : `.claude/model-routing.json`.
//   1. Le frontmatter `model:`/`effort:` de chaque `.claude/agents/*.md` vaut
//      l'alias + l'effort du rôle sous lequel il est enregistré, et l'ENSEMBLE
//      des fichiers d'agents correspond exactement aux clés `agents` du registre.
//   2. Aucune prose gouvernée (`.claude/rules/*.md`, `.claude/skills/**/*.{md,html}`,
//      `.claude/agents/**/*.md`) ne fige une release de modèle.
//
// HORS PÉRIMÈTRE, DÉLIBÉRÉMENT : `CLAUDE.md`, `AGENTS.md`, `docs/**`. Le bloc
// « Default model + effort » de CLAUDE.md NOMME les releases courantes par
// doctrine (lockstep canon meta-govern) ; le balayer mettrait la doctrine en
// guerre avec elle-même.
//
// MODES  registre `enforcement`:
//   'warn'  (défaut au bootstrap) — rapporte, exit 0. Mode shadow : un gate
//           bloquant s'installe en observation avant de mordre (canon #13).
//   'error' — exit 1 sur constat. À promouvoir quand le projet est à 0.
//   `--enforce` force 'error' pour un run ponctuel ; `--write` resynchronise
//   le frontmatter des agents depuis le registre (jamais la prose).
//
// EXIT  0 = propre (ou warn) · 1 = constats en mode error · 2 = gate cassé
//       (registre présent mais illisible). Registre ABSENT = 0 + « non configuré ».

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.CLAUDE_PROJECT_DIR || path.resolve(HERE, '../..');
const REGISTRY = path.join(ROOT, '.claude/model-routing.json');
const AGENTS_DIR = path.join(ROOT, '.claude/agents');
const SKILLS_DIR = path.join(ROOT, '.claude/skills');
const RULES_DIR = path.join(ROOT, '.claude/rules');

const argv = process.argv.slice(2);
const shouldWrite = argv.includes('--write');
const forceEnforce = argv.includes('--enforce');

const ALIASES = new Set(['opus', 'sonnet', 'haiku']);
const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);

// Le tiret est VOLONTAIREMENT hors du séparateur : `docs/architecture/opus-4-8/`
// est un chemin réel et légitime dans au moins un projet gouverné — le flaguer
// serait un faux positif que personne ne peut corriger sans renommer un dossier.
// `\s*` (et non `\s+`) ferme le contournement « Opus5 ».
const PIN_RE = /\b(?:Claude[\s-]+)?(?:Opus|Sonnet|Haiku|Fable|Mythos)\s*\d+(?:\.\d+)?\b|\bclaude-(?:opus|sonnet|haiku|fable|mythos)-\d[\w.-]*/gi;
const WAIVER = 'model-routing:allow';

if (!fs.existsSync(REGISTRY)) {
  console.log('claude-model-routing: SKIP (.claude/model-routing.json absent — non configuré)');
  process.exit(0);
}

let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
} catch (err) {
  console.error(`claude-model-routing: BROKEN — .claude/model-routing.json illisible : ${err.message}`);
  process.exit(2);
}

const errors = [];
const assert = (cond, msg) => { if (!cond) errors.push(msg); };

assert(registry.schemaVersion === 1, `schemaVersion non supporté : ${registry.schemaVersion}`);
for (const [alias, entry] of Object.entries(registry.current ?? {})) {
  assert(ALIASES.has(alias), `Alias inconnu dans "current" : ${alias}`);
  assert(typeof entry?.label === 'string' && entry.label, `current.${alias} sans label`);
  assert(typeof entry?.apiId === 'string' && entry.apiId, `current.${alias} sans apiId`);
}
for (const [name, role] of Object.entries(registry.roles ?? {})) {
  assert(ALIASES.has(role?.alias), `Rôle ${name} : alias inconnu « ${role?.alias} »`);
  assert(EFFORTS.has(role?.effort), `Rôle ${name} : effort invalide « ${role?.effort} »`);
  assert(!role?.alias || registry.current?.[role.alias], `Rôle ${name} : alias « ${role.alias} » absent de "current"`);
}

// --- Frontmatter des agents ---------------------------------------------------

// Tolère une valeur entre guillemets et un commentaire de fin de ligne :
// `model: "sonnet"  # cheval de trait` doit rendre `sonnet`, pas la ligne entière.
function readField(src, key) {
  const m = src.match(new RegExp(`^${key}:[ \\t]*(.+)$`, 'm'));
  if (!m) return undefined;
  return m[1].replace(/\s+#.*$/, '').trim().replace(/^['"]|['"]$/g, '');
}
function writeField(src, key, value) {
  const re = new RegExp(`^(${key}:[ \\t]*)(.+)$`, 'm');
  if (!re.test(src)) throw new Error(`frontmatter sans « ${key}: »`);
  return src.replace(re, (_, head, tail) => {
    const comment = tail.match(/\s+#.*$/);
    return `${head}${value}${comment ? comment[0] : ''}`;
  });
}

const agentFiles = fs.existsSync(AGENTS_DIR)
  ? fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')).sort()
  : [];
const registered = Object.keys(registry.agents ?? {}).sort();
assert(
  JSON.stringify(agentFiles) === JSON.stringify(registered),
  `Registre d'agents désynchronisé.\n    sur disque : ${agentFiles.join(', ') || '(aucun)'}\n    registre   : ${registered.join(', ') || '(aucun)'}`,
);

for (const [agent, roleName] of Object.entries(registry.agents ?? {})) {
  const role = registry.roles?.[roleName];
  if (!role) { errors.push(`Agent ${agent} référence un rôle inconnu : ${roleName}`); continue; }
  const file = path.join(AGENTS_DIR, `${agent}.md`);
  if (!fs.existsSync(file)) { errors.push(`Agent ${agent} enregistré mais ${path.relative(ROOT, file)} absent`); continue; }
  let src = fs.readFileSync(file, 'utf8');
  if (shouldWrite) {
    try {
      src = writeField(writeField(src, 'model', role.alias), 'effort', role.effort);
      fs.writeFileSync(file, src);
    } catch (err) { errors.push(`${agent}.md : --write impossible (${err.message})`); }
  }
  assert(readField(src, 'model') === role.alias,
    `${agent}.md : « model » doit valoir l'alias « ${role.alias} » (rôle ${roleName}), pas une release figée — trouvé « ${readField(src, 'model')} »`);
  assert(readField(src, 'effort') === role.effort,
    `${agent}.md : « effort » doit valoir « ${role.effort} » (rôle ${roleName}) — trouvé « ${readField(src, 'effort')} »`);
}

// --- Balayage de la prose gouvernée ------------------------------------------

function walk(dir, re) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, re));
    else if (re.test(e.name)) out.push(p);
  }
  return out;
}

// Les arbres restaurés par une navette (skills globaux vendorisés, gitignorés)
// ne sont pas éditables par le run qui les balaie : les ignorer, sinon un gate
// vert en local devient rouge en cloud sur un fichier non commitable.
// Fail-open : pas de git, pas de filtre.
function gitIgnored(files) {
  if (files.length === 0) return new Set();
  const r = spawnSync('git', ['-C', ROOT, 'check-ignore', '--stdin'], {
    input: files.map((f) => path.relative(ROOT, f)).join('\n'), encoding: 'utf8',
  });
  if (r.error || r.status === 128) return new Set();
  return new Set(r.stdout.split('\n').filter(Boolean).map((rel) => path.resolve(ROOT, rel)));
}

const allowPaths = Array.isArray(registry.allowPaths) ? registry.allowPaths : [];
let prose = [
  ...walk(SKILLS_DIR, /\.(?:md|html)$/i),
  ...walk(RULES_DIR, /\.md$/i),
  ...walk(AGENTS_DIR, /\.md$/i),
].filter((f) => !allowPaths.some((p) => path.relative(ROOT, f).startsWith(p)));
const ignored = gitIgnored(prose);
prose = prose.filter((f) => !ignored.has(f));

for (const file of prose) {
  const hits = new Set();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (line.includes(WAIVER)) continue;
    for (const m of line.matchAll(PIN_RE)) hits.add(m[0]);
  }
  if (hits.size > 0) {
    errors.push(`${path.relative(ROOT, file)} fige une release de modèle : ${[...hits].join(', ')} — nommer l'alias (opus/sonnet/haiku) ou pointer .claude/model-routing.json (dérogation ponctuelle : « ${WAIVER} » sur la ligne)`);
  }
}

// --- Verdict ------------------------------------------------------------------

const enforcing = forceEnforce || registry.enforcement === 'error';
const summary = `${Object.keys(registry.roles ?? {}).length} rôles, ${registered.length} agents, ${prose.length} fichiers de prose balayés${ignored.size ? `, ${ignored.size} ignorés (gitignore)` : ''}`;

if (errors.length > 0) {
  const banner = enforcing ? 'FAIL' : 'WARN (enforcement: "warn" — non bloquant)';
  const out = enforcing ? console.error : console.log;
  out(`claude-model-routing: ${banner} — ${summary}`);
  for (const e of errors) out(`- ${e}`);
  if (!enforcing) out(`  → passer .claude/model-routing.json → "enforcement": "error" une fois à 0 constat.`);
  process.exit(enforcing ? 1 : 0);
}
console.log(`claude-model-routing: ${shouldWrite ? 'SYNCED' : 'PASS'} (${summary})`);
