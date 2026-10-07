#!/usr/bin/env node
/**
 * preflight-lint.mjs — couche DÉTERMINISTE du skill brief-chantier / brief-preflight.
 *
 * Usage : node preflight-lint.mjs <plan.html> <repo-cible> [--legacy]
 *   --legacy : rétrograde en AVERTISSEMENT les conventions récentes (Nice-to-have,
 *              message du lot de clôture, budget / chips / fiche / doublures,
 *              « Dépend de »). Les clauses de revue sans fin restent bloquantes.
 *
 * Plans FR ou EN : TOUS les contrôles textuels lisent la table `T` ci-dessous.
 * Contrôles : placeholders et `undefined` ; phrases interdites ; chemins absolus
 * (sous le dépôt cible, sous /Users/, ou existants) ; scripts `bun|npm run` ;
 * ancres fichier:ligne ; structure (sections non vides, lots avec Agent + liste de checks
 * id + commande exacte (non vague, fichiers et scripts existants) + DONE, étiquettes de lot uniques, TOC) ; Nice-to-have ≥ 5 ; message de commit du
 * lot de clôture ; section flotte (plage + « Dépend de ») ; règles dures :
 * clauses sans fin, Budget total (« <cible> / <plafond> », plafond ≤ 1000), Chips, Fiche d'intention (et, si elle existe,
 * « Validée par : <nom> » / « Approved by: <name> »), Doublures de test.
 *
 * Sortie : ERREUR / AVERTISSEMENT, code retour 1 si ≥ 1 erreur, 2 sur erreur d'usage.
 */

import { readFileSync, existsSync, statSync, readdirSync, realpathSync } from 'node:fs';
import { join, isAbsolute, basename, dirname } from 'node:path';
import { stripComments, textOf, readFlotte } from './flotte-shared.mjs';
import { parseChecks, vagueReason, missingRefs, isNewMarked, checkBudget } from './lot-checks.mjs';

/* Table unique des synonymes FR/EN. */
const T = {
  forbidden: ['cette session', 'comme convenu', 'comme vu plus haut', 'voir plus haut', 'comme discuté', 'this session', 'as discussed', 'as agreed', 'see above'],
  endless: ["jusqu'à convergence", "jusqu'au critère de convergence", 'y compris les mineurs', 'until convergence', 'until clean', 'including minors', 'minor ones included'],
  isNew: /\((?:nouveau|nouveaux|new|to be created)\)|à créer|to be created/i,
  budget: /(?:budget total|total budget)\s*:\s*\D{0,60}?\d/i,
  budgetLabel: /(?:budget total|total budget)\s*:/i,
  touched: /(?:fichiers touch[ée]s|files touched)\s*<\/strong>\s*:?([\s\S]*?)<\/p>/i,
  chips: /chips\s*:\s*(?:autoris[ée]s|allowed|interdits|forbidden)/i,
  intent: /(?:fiche d'intention|intent sheet)\s*:\s*(?:[^\s]*[/\\][^\s]*|[^\s]+\.[a-z0-9]{1,5}\b)/i,
  intentPath: /(?:fiche d'intention|intent sheet)\s*:\s*([^\s]*[/\\][^\s]*|[^\s]+\.[a-z0-9]{1,5}\b)/i,
  approved: /(?:valid[ée]e par|approved by)\s*:\s*([^,.\n<]+),\s*\d{4}-\d{2}-\d{2}/i,
  pending: /^\W*(?:en attente|pending)\b/i,
  doubles: /(?:doublures de test|test doubles)\s*:\s*(?:aucune|règle standard|none|standard rule)/i,
  depend: /(?:d[ée]pend de|depends on)\s*:\s*\S/i,
};
const SECTIONS = ['s-intention', 's-contexte', 's-approbation', 's-lots', 's-verif'];

const args = process.argv.slice(2).filter((a) => a !== '--legacy');
const legacy = process.argv.includes('--legacy');
const [planPath, repoRoot] = args;

if (!planPath || !repoRoot) {
  console.error('Usage : node preflight-lint.mjs <plan.html> <repo-cible> [--legacy]');
  process.exit(2);
}
if (!existsSync(planPath)) {
  console.error(`ERREUR : plan introuvable — ${planPath}`);
  process.exit(2);
}
if (!existsSync(repoRoot) || !statSync(repoRoot).isDirectory()) {
  console.error(`ERREUR : repo cible introuvable — ${repoRoot}`);
  process.exit(2);
}

const html = readFileSync(planPath, 'utf8')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");
const htmlLive = stripComments(html);
const visible = textOf(htmlLive.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, ' ').replace(/&nbsp;/gi, ' '))
  .normalize('NFC')
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, ' ');

const errors = [];
const warnings = [];
const soft = legacy ? warnings : errors; // conventions récentes
const legacyNote = legacy ? '' : ' (--legacy : avertissement pour les plans antérieurs à la convention)';
const excerpt = (idx, len = 90) => html.slice(Math.max(0, idx - 20), idx + len).replace(/\s+/g, ' ').trim();

/* 1 — placeholders résiduels et `undefined` */
for (const m of html.matchAll(/\{\{[^{}]{1,120}\}\}/g)) errors.push(`Placeholder non rempli : « ${m[0].slice(0, 80)} »`);
if (/\bundefined\b/.test(visible)) errors.push('Le texte visible contient « undefined » : valeur non remplie à la génération du plan.');

/* 2 — phrases interdites (le plan est autonome, zéro deixis) */
const lower = html.toLowerCase();
for (const phrase of T.forbidden) {
  for (let i = lower.indexOf(phrase); i !== -1; i = lower.indexOf(phrase, i + 1)) {
    errors.push(`Phrase interdite « ${phrase} » : …${excerpt(i)}…`);
  }
}

/* 3 — chemins absolus : sous le dépôt cible ou /Users/, ils doivent exister
   (sauf marqués nouveaux, ou sous .worktrees/ que le run crée) */
const real = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
};
const roots = [...new Set([repoRoot.replace(/\/+$/, ''), real(repoRoot)])];
const seenPaths = new Set();
for (const m of html.matchAll(/(?<![A-Za-z0-9_.~:/-])\/(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]*/g)) {
  const p = m[0].replace(/[.,;:)\]»/]+$/, '');
  if (seenPaths.has(p)) continue;
  seenPaths.add(p);
  const concerned = p.startsWith('/Users/') || roots.some((r) => p === r || p.startsWith(`${r}/`));
  if (!concerned || existsSync(p) || p.includes('/.worktrees/')) continue;
  if (T.isNew.test(html.slice(Math.max(0, m.index - 120), m.index + p.length + 120))) continue;
  errors.push(`Chemin absolu introuvable sur disque : ${p}`);
}

/* 4 — scripts `bun run` / `npm run` contre package.json du repo cible */
let scripts = {};
const pkgPath = join(repoRoot, 'package.json');
if (existsSync(pkgPath)) {
  try {
    scripts = JSON.parse(readFileSync(pkgPath, 'utf8')).scripts ?? {};
  } catch {
    warnings.push(`package.json du repo cible illisible : ${pkgPath}`);
  }
} else {
  warnings.push(`Pas de package.json dans ${repoRoot} — vérification des scripts sautée`);
}
const seenScripts = new Set();
for (const m of html.matchAll(/\b(bun|npm) run\s+((?:--?[\w-]+\s+)*)([A-Za-z0-9:._-]+)/g)) {
  const [, runner, flags, name] = m;
  if (/--(?:cwd|prefix)/.test(flags) || name.startsWith('-') || seenScripts.has(name)) continue;
  seenScripts.add(name);
  if (Object.keys(scripts).length && !(name in scripts)) errors.push(`Script « ${runner} run ${name} » absent des scripts de ${pkgPath}`);
}

/* 5 — ancres fichier.ext:ligne */
function* walk(dir, depth = 0) {
  if (depth > 8) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (['node_modules', '.git', 'dist', 'data', 'data-dev', '.claude', '.worktrees'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, depth + 1);
    else yield p;
  }
}
let fileIndex = null; // basename -> [chemins], construit paresseusement
const seenAnchors = new Set();
for (const m of html.matchAll(/([A-Za-z0-9_./-]+\.(?:tsx|ts|mjs|cjs|js|json|css|html|md)):(\d+)(?:-\d+)?/g)) {
  const [full, file, lineStr] = m;
  if (seenAnchors.has(full)) continue;
  seenAnchors.add(full);
  if (/^https?:/.test(file) || file.includes('localhost')) continue;
  let candidates = [];
  if (isAbsolute(file)) {
    if (existsSync(file)) candidates = [file];
  } else {
    if (!fileIndex) {
      fileIndex = new Map();
      for (const p of walk(repoRoot)) {
        if (!fileIndex.has(basename(p))) fileIndex.set(basename(p), []);
        fileIndex.get(basename(p)).push(p);
      }
    }
    candidates = (fileIndex.get(basename(file)) ?? []).filter((p) => p.endsWith(file) || basename(file) === file);
  }
  if (candidates.length === 0) {
    warnings.push(`Ancre ${full} : fichier introuvable dans ${repoRoot} (à vérifier à la main)`);
    continue;
  }
  const line = Number(lineStr);
  const ok = candidates.some((p) => {
    try {
      return readFileSync(p, 'utf8').split('\n').length >= line;
    } catch {
      return false;
    }
  });
  if (!ok) errors.push(`Ancre ${full} : la ligne ${line} dépasse la longueur de ${candidates[0]}`);
}

/* 6 — structure : sections non vides, lots complets, étiquettes uniques, TOC */
for (const id of SECTIONS) {
  const idx = htmlLive.indexOf(`id="${id}"`);
  if (idx === -1) {
    errors.push(`Section obligatoire absente : id="${id}"`);
    continue;
  }
  const end = htmlLive.indexOf('</section>', idx);
  if (textOf(htmlLive.slice(htmlLive.indexOf('>', idx) + 1, end === -1 ? undefined : end).replace(/<h2\b[\s\S]*?<\/h2>/i, '')).length < 1) {
    errors.push(`Section vide : id="${id}" (écris « aucun » si elle est sans objet)`);
  }
}
const lotIds = [...htmlLive.matchAll(/id="(lot-\d+)"/g)].map((m) => m[1]);
if (lotIds.length === 0) errors.push('Aucun lot (id="lot-N") trouvé dans le plan');
const lotBlocks = htmlLive.split(/(?=<div class="lot" )/).slice(1);
const labels = new Map();
const checkIds = new Set();
let touched = ''; // « Fichiers touchés » du lot courant et des précédents : ce que le plan crée
lotBlocks.forEach((block, i) => {
  const n = i + 1;
  const b = block.split('</section>')[0];
  touched += ` ${b.match(T.touched)?.[1] ?? ''}`;
  if (!/<strong>Agent<\/strong>/.test(b)) errors.push(`Lot ${n} : champ « Agent » absent`);
  const checks = parseChecks(b);
  if (!checks.present && /<pre class="cmd">/.test(b)) {
    soft.push(`Lot ${n} : commande en <pre class="cmd"> sans liste de checks. À AJOUTER : <ol class="list checks"><li data-check="${n}.1"><code class="check-cmd">&lt;commande exacte&gt;</code></li></ol>` + legacyNote);
  } else if (!checks.items.length) {
    errors.push(`Lot ${n} : aucun check (liste class="checks" : un <li data-check="id"> par check, avec la commande exacte, exit 0 = succès)`);
  }
  for (const item of checks.items) {
    const at = `Lot ${n}, check « ${item.id || '?'} »`;
    if (!item.id) errors.push(`Lot ${n} : un check n'a pas d'identifiant (data-check="…")`);
    else if (checkIds.has(item.id)) errors.push(`${at} : identifiant déjà utilisé dans le plan`);
    else checkIds.add(item.id);
    if (item.codes.length !== 1) {
      errors.push(`${at} : exactement une commande <code> attendue, ${item.codes.length} trouvée(s)`);
      continue;
    }
    const why = vagueReason(item.codes[0]);
    if (why) errors.push(`${at} : ${why}`);
    else for (const miss of missingRefs(item.codes[0], repoRoot.replace(/\/+$/, ''), { touched, allowNew: isNewMarked(item.raw), scripts })) errors.push(`${at} : ${miss}`);
  }
  if (!/class="done"/.test(b)) errors.push(`Lot ${n} : critère DONE absent (bloc class="done")`);
  const label = (b.match(/class="ln"[^>]*>([^<]+)</)?.[1] ?? b.match(/id="(lot-\d+)"/)?.[1] ?? '').toLowerCase().replace(/[\s-]+/g, ' ').trim();
  if (label) labels.set(label, [...(labels.get(label) ?? []), n]);
});
for (const [label, ns] of labels) {
  if (ns.length > 1) errors.push(`Étiquette « ${label} » portée par ${ns.length} lots (${ns.join(', ')}) : chaque lot a un numéro unique`);
}
for (const id of lotIds) if (!htmlLive.includes(`href="#${id}"`)) errors.push(`TOC : entrée manquante pour ${id}`);

/* 7 — Nice-to-have proposés (≥ 5 items) */
const niceIdx = html.indexOf('id="s-nice"');
if (niceIdx === -1) {
  soft.push('Section « Nice-to-have proposés » absente (id="s-nice", ≥ 5 items)' + legacyNote);
} else {
  const count = (html.slice(niceIdx, html.indexOf('</section>', niceIdx)).match(/<li/g) ?? []).length;
  if (count < 5) errors.push(`Section Nice-to-have : ${count} item(s), minimum 5`);
}

/* 8 — lot de CLÔTURE : message de commit portant « lot N » (le run aval fait un
   `git log --grep` littéral sur cette étiquette) */
const lastLotStart = htmlLive.lastIndexOf('<div class="lot" ');
if (lastLotStart !== -1) {
  let lastLot = htmlLive.slice(lastLotStart);
  const secEnd = lastLot.indexOf('</section>');
  if (secEnd !== -1) lastLot = lastLot.slice(0, secEnd);
  const lastN = lastLot.match(/id="lot-(\d+)"/)?.[1] ?? null;
  const lotTag = new RegExp(`\\blot\\s*${lastN ?? '\\d+'}\\b`, 'i');
  const marked = [...lastLot.matchAll(/<([a-z]+)\b[^>]*class="[^"]*\bcommit-msg\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => textOf(m[2]));
  const codes = [...lastLot.matchAll(/<(code|pre)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => textOf(m[2]));
  if (!(marked.some((t) => lotTag.test(t)) || codes.some((t) => /git\s+commit/i.test(t) && lotTag.test(t)))) {
    soft.push(
      `Lot de clôture (lot ${lastN ?? 'N'}) : message de commit absent ou sans l'étiquette « lot ${lastN ?? 'N'} ».` +
        `\n      À AJOUTER : <code class="commit-msg">&lt;convention&gt;: lot ${lastN ?? 'N'} — &lt;titre&gt;</code> (jamais « correctifs de revue »).` +
        legacyNote,
    );
  }
}

/* 9 — flotte parallèle (section optionnelle ; absente ou commentée = plan solo) */
const flotte = readFlotte(html);
if (flotte.present) {
  const { nom, freres, plage, plageParsed } = flotte;
  if (!nom) errors.push('Section flotte : nom de la vague absent (<span class="flotte-nom">).');
  if (freres <= 0) errors.push(`Section flotte : liste des chantiers frères ${freres === 0 ? 'vide' : 'absente'} (<ul class="list flotte-freres">, un <li> par frère).`);
  if (!plage) {
    errors.push('Section flotte : plage d\'identifiants NON déclarée. À AJOUTER : <code class="plage-ids">&lt;compteur&gt; N-M</code>, ou « aucun compteur global ».');
  } else if (!plageParsed) {
    errors.push(`Section flotte : plage illisible — « ${plage.slice(0, 100)} » (attendu « N-M » ou « aucun compteur global »).`);
  } else if (!plageParsed.optout && plageParsed.from > plageParsed.to) {
    errors.push(`Section flotte : plage inversée — « ${plage.slice(0, 100)} ».`);
  }
  if (!T.depend.test(textOf(flotte.sec))) soft.push('Section flotte : ligne « Dépend de : <slug>|aucun » (Depends on) absente.' + legacyNote);
  if (!htmlLive.includes('href="#s-flotte"')) warnings.push('TOC : entrée manquante pour la section flotte (href="#s-flotte")');
  warnings.push(`Plan de vague : lance le lint de VAGUE sur les N plans avant de dispatcher : node ${new URL('preflight-flotte.mjs', import.meta.url).pathname} <plan1.html> <plan2.html> …`);
}

/* 10 — règles dures, sur le texte VISIBLE */
for (const phrase of T.endless) {
  if (new RegExp(`${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(visible)) {
    errors.push(`Clause de revue sans fin : « ${phrase} » — revue plafonnée à 2 rounds (A3). À RETIRER du plan.`);
  }
}
if (!T.budget.test(visible)) soft.push('Budget total absent : « Budget total : <cible> / <plafond> » (Total budget), code + tests + scripts (A1).' + legacyNote);
else {
  const { error } = checkBudget(visible, T.budgetLabel);
  if (error) soft.push(error + legacyNote);
}
if (!T.chips.test(visible)) soft.push('Chips absent : « Chips : autorisés|interdits » (Chips: allowed|forbidden) (A2).' + legacyNote);
if (!T.intent.test(visible)) soft.push("Fiche d'intention absente : « Fiche d'intention : <chemin> » (Intent sheet) (G)." + legacyNote);
if (!T.doubles.test(visible)) soft.push('Doublures de test absent : « Doublures de test : aucune|règle standard » (Test doubles: none|standard rule).' + legacyNote);

/* 11 — fiche d'intention existante : validée par un humain nommé (pas EN ATTENTE / PENDING / vide) */
const sheetRef = visible.match(T.intentPath)?.[1]?.replace(/[.,;:)\]»]+$/, '');
const sheetPath = sheetRef && [isAbsolute(sheetRef) ? sheetRef : join(repoRoot, sheetRef), join(dirname(planPath), sheetRef)].find((p) => existsSync(p) && statSync(p).isFile());
if (sheetPath) {
  const sheet = readFileSync(sheetPath, 'utf8').replace(/<[^>]*>/g, ' ').replace(/[*_`]/g, '');
  const name = (sheet.match(T.approved)?.[1] ?? '').trim();
  if (!/[\p{L}]/u.test(name) || T.pending.test(name)) {
    soft.push(`Fiche d'intention ${sheetPath} non validée : « Validée par : <nom>, <AAAA-MM-JJ> » (Approved by: <name>, <date>) attendu, ni vide ni EN ATTENTE/PENDING (G).` + legacyNote);
  }
}

/* Rapport */
const say = (label, list) => {
  if (!list.length) return;
  console.log(`\n${label} (${list.length}) :`);
  for (const f of list) console.log(`  - ${f}`);
};
console.log(`Préflight lint — ${basename(planPath)} contre ${repoRoot}${legacy ? ' [--legacy]' : ''}`);
say('ERREURS', errors);
say('AVERTISSEMENTS', warnings);
if (!errors.length && !warnings.length) console.log('\nAucun finding — lint propre.');
console.log(`\nVERDICT: ${errors.length ? 'FAIL' : 'PASS'} (${errors.length} erreur(s), ${warnings.length} avertissement(s))`);
process.exit(errors.length ? 1 : 0);
