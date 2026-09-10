#!/usr/bin/env node
/**
 * preflight-lint.mjs — couche DÉTERMINISTE du skill brief-preflight.
 *
 * Usage : node preflight-lint.mjs <plan.html> <repo-cible> [--legacy]
 *   --legacy : rétrograde en AVERTISSEMENT les conventions POSTÉRIEURES au plan
 *              — section « Nice-to-have » (id="s-nice", ≥ 5 items) et message de
 *              commit du lot de clôture (check 8) — pour linter les plans écrits
 *              avant ces conventions.
 *
 * Vérifie mécaniquement ce qui n'exige AUCUN jugement :
 *   1. placeholders {{…}} résiduels
 *   2. phrases interdites (deixis de session)
 *   3. chemins absolus cités → existent sur disque (sauf marqués « (nouveau) »)
 *   4. scripts `bun run <x>` → existent dans <repo-cible>/package.json
 *   5. ancres fichier.ext:ligne → fichier trouvable dans le repo, ligne dans
 *      la plage (fichier introuvable = avertissement, ligne hors plage = erreur)
 *   6. structure : sections obligatoires, chaque lot avec Agent + <pre.cmd> +
 *      bloc DONE, entrée TOC par lot
 *   7. section Nice-to-have (id="s-nice") avec ≥ 5 <li>
 *   8. lot de CLÔTURE (le dernier lot du plan) : son message de commit est écrit
 *      noir sur blanc et porte l'étiquette « lot N » — marqueur dédié
 *      class="commit-msg", ou un <code>/<pre.cmd> contenant « git commit … lot N ».
 *      Règle brief-chantier, rôle AUTEUR, étape 5bis : le run aval d'une chaîne de
 *      chantiers vérifie sa précondition par un `git log --grep` LITTÉRAL sur cette
 *      étiquette ; un lot de clôture commité « correctifs de revue » le fait
 *      compter zéro et conclure à tort que l'amont a échoué.
 *   9. flotte parallèle (OPTIONNEL — silencieux pour un plan solo) : si la section
 *      id="s-flotte" existe, elle DOIT déclarer le nom de la vague
 *      (class="flotte-nom"), les chantiers frères (<ul class="flotte-freres">,
 *      ≥ 1 <li>) et la plage d'identifiants réservée à CE chantier
 *      (class="plage-ids" : « N-M », ou « aucun compteur global »).
 *      Règle brief-chantier, rôle ORCHESTRATEUR, Phase 2, étape 4bis.
 *      Limite ASSUMÉE : le lint voit UN plan et ne peut pas détecter une collision
 *      entre plans frères — il vérifie seulement que la plage est DÉCLARÉE.
 *
 * Sortie : findings groupés ERREUR / AVERTISSEMENT, code retour 1 si ≥ 1 erreur.
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, isAbsolute, basename } from 'node:path';
import { stripComments, textOf, readFlotte } from './flotte-shared.mjs';

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

const raw = readFileSync(planPath, 'utf8');
// Décodage minimal des entités rencontrées dans les <code> des plans.
const html = raw
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const errors = [];
const warnings = [];
const excerpt = (idx, len = 90) =>
  html
    .slice(Math.max(0, idx - 20), idx + len)
    .replace(/\s+/g, ' ')
    .trim();

/* 1 — placeholders résiduels */
for (const m of html.matchAll(/\{\{[^{}]{1,120}\}\}/g)) {
  errors.push(`Placeholder non rempli : « ${m[0].slice(0, 80)} »`);
}

/* 2 — phrases interdites (le plan doit être autonome, zéro deixis) */
const FORBIDDEN = ['cette session', 'comme convenu', 'comme vu plus haut', 'voir plus haut', 'comme discuté'];
const lower = html.toLowerCase();
for (const phrase of FORBIDDEN) {
  let i = lower.indexOf(phrase);
  while (i !== -1) {
    errors.push(`Phrase interdite « ${phrase} » : …${excerpt(i)}…`);
    i = lower.indexOf(phrase, i + 1);
  }
}

/* 3 — chemins absolus cités */
const seenPaths = new Set();
for (const m of html.matchAll(/\/Users\/[A-Za-z0-9._/-]+/g)) {
  let p = m[0].replace(/[.,;:)\]»]+$/, '');
  if (seenPaths.has(p)) continue;
  seenPaths.add(p);
  const around = html.slice(Math.max(0, m.index - 120), m.index + p.length + 120);
  // Un fichier que le chantier CRÉE est légitimement absent au moment du lint.
  if (/\(nouveau\)|\(nouveaux\)|à créer/i.test(around)) continue;
  if (!existsSync(p)) errors.push(`Chemin absolu introuvable sur disque : ${p}`);
}

/* 4 — scripts bun run <x> contre package.json du repo cible */
let scripts = {};
const pkgPath = join(repoRoot, 'package.json');
if (existsSync(pkgPath)) {
  try {
    scripts = JSON.parse(readFileSync(pkgPath, 'utf8')).scripts ?? {};
  } catch {
    warnings.push(`package.json du repo cible illisible : ${pkgPath}`);
  }
} else {
  warnings.push(`Pas de package.json dans ${repoRoot} — vérification « bun run » sautée`);
}
const seenScripts = new Set();
for (const m of html.matchAll(/bun run\s+((?:--?[\w-]+\s+)*)([A-Za-z0-9:._-]+)/g)) {
  if (m[1] && m[1].includes('--cwd')) continue; // autre repo, hors périmètre
  const name = m[2];
  if (name.startsWith('-') || seenScripts.has(name)) continue;
  seenScripts.add(name);
  if (Object.keys(scripts).length && !(name in scripts)) {
    errors.push(`Script « bun run ${name} » absent des scripts de ${pkgPath}`);
  }
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
    if (['node_modules', '.git', 'dist', 'data', 'data-dev', '.claude'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, depth + 1);
    else yield p;
  }
}
let fileIndex = null; // construit paresseusement : basename -> [chemins]
const seenAnchors = new Set();
for (const m of html.matchAll(/([A-Za-z0-9_./-]+\.(?:tsx|ts|mjs|cjs|js|json|css|html|md)):(\d+)(?:-\d+)?/g)) {
  const [full, file, lineStr] = m;
  if (seenAnchors.has(full)) continue;
  seenAnchors.add(full);
  if (/^https?:/.test(file) || file.includes('localhost')) continue;
  const line = Number(lineStr);
  let candidates = [];
  if (isAbsolute(file)) {
    if (existsSync(file)) candidates = [file];
  } else {
    if (!fileIndex) {
      fileIndex = new Map();
      for (const p of walk(repoRoot)) {
        const b = basename(p);
        if (!fileIndex.has(b)) fileIndex.set(b, []);
        fileIndex.get(b).push(p);
      }
    }
    candidates = (fileIndex.get(basename(file)) ?? []).filter((p) => p.endsWith(file) || basename(file) === file);
  }
  if (candidates.length === 0) {
    warnings.push(`Ancre ${full} : fichier introuvable dans ${repoRoot} (citation à vérifier à la main)`);
    continue;
  }
  const ok = candidates.some((p) => {
    try {
      return readFileSync(p, 'utf8').split('\n').length >= line;
    } catch {
      return false;
    }
  });
  if (!ok) errors.push(`Ancre ${full} : la ligne ${line} dépasse la longueur de ${candidates[0]}`);
}

/* 6 — structure du plan */
for (const id of ['s-intention', 's-contexte', 's-approbation', 's-lots', 's-verif', 's-convex']) {
  if (!html.includes(`id="${id}"`)) errors.push(`Section obligatoire absente : id="${id}"`);
}
const lotIds = [...html.matchAll(/id="(lot-\d+)"/g)].map((m) => m[1]);
if (lotIds.length === 0) errors.push('Aucun lot (id="lot-N") trouvé dans le plan');
const lotBlocks = html.split(/(?=<div class="lot" )/).slice(1);
lotBlocks.forEach((block, i) => {
  const n = i + 1;
  const end = block.indexOf('</div>\n  </div>'); // fin approximative du lot ; les checks restent locaux au bloc
  const b = end === -1 ? block : block.slice(0, end + 20);
  if (!/<strong>Agent<\/strong>/.test(b)) errors.push(`Lot ${n} : champ « Agent » absent`);
  if (!/<pre class="cmd">/.test(b)) errors.push(`Lot ${n} : aucune commande de vérification (<pre class="cmd">)`);
  if (!/class="done"/.test(b)) errors.push(`Lot ${n} : critère DONE absent (bloc class="done")`);
});
for (const id of lotIds) {
  if (!html.includes(`href="#${id}"`)) errors.push(`TOC : entrée manquante pour ${id}`);
}

/* 7 — section Nice-to-have proposés (convention ≥ 5 items) */
const niceIdx = html.indexOf('id="s-nice"');
if (niceIdx === -1) {
  (legacy ? warnings : errors).push(
    'Section « Nice-to-have proposés » absente (id="s-nice", ≥ 5 items) — convention brief-chantier ; --legacy pour les anciens plans',
  );
} else {
  const sec = html.slice(niceIdx, html.indexOf('</section>', niceIdx));
  const count = (sec.match(/<li/g) ?? []).length;
  if (count < 5) errors.push(`Section Nice-to-have : ${count} item(s), minimum 5`);
}

/* --- Vue « live » du plan, réservée aux checks 8 et 9 ---------------------
   Le gabarit brief-chantier livre la section flotte (§02b) en COMMENTAIRE HTML :
   un plan solo la laisse commentée, un plan de vague la décommente. Les checks
   ci-dessous ne doivent donc pas réagir à ce qui dort dans un commentaire.
   Les checks 1 à 7 continuent de lire `html` — contrat inchangé. */
const htmlLive = stripComments(html);

/* 8 — lot de clôture : message de commit explicite portant « lot N »
   (règle brief-chantier, rôle AUTEUR, étape 5bis) */
const lastLotStart = htmlLive.lastIndexOf('<div class="lot" ');
if (lastLotStart !== -1) {
  // Le dernier lot court jusqu'à la fin de la section des lots.
  let lastLot = htmlLive.slice(lastLotStart);
  const secEnd = lastLot.indexOf('</section>');
  if (secEnd !== -1) lastLot = lastLot.slice(0, secEnd);
  const idM = lastLot.match(/id="lot-(\d+)"/);
  const lastN = idM ? idM[1] : null;
  const lotTag = new RegExp(`\\blot\\s*${lastN ?? '\\d+'}\\b`, 'i');

  const marked = [...lastLot.matchAll(/<([a-z]+)\b[^>]*class="[^"]*\bcommit-msg\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi)].map(
    (m) => textOf(m[2]),
  );
  const codes = [...lastLot.matchAll(/<(code|pre)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => textOf(m[2]));

  // Deux formes acceptées : le marqueur dédié, ou une commande git commit explicite.
  const ok =
    marked.some((t) => lotTag.test(t)) || codes.some((t) => /git\s+commit/i.test(t) && lotTag.test(t));

  if (!ok) {
    // Message libre éventuellement prescrit à la place — le citer rend le finding actionnable.
    const freeform = codes.filter(
      (t) => t.length <= 140 && /^[\w.@/-]+(\([^)]*\))?\s*:\s*\S/.test(t) && !lotTag.test(t),
    );
    const quoted = freeform.find((t) => /chantier\s*\(/i.test(t)) ?? freeform[0] ?? null;
    const n = lastN ?? 'N';
    (legacy ? warnings : errors).push(
      `Lot de clôture (lot ${n}) : son message de commit n'est écrit nulle part dans le lot.` +
        (quoted ? `\n      Message libre trouvé à la place : « ${quoted.slice(0, 120)} » — il ne porte pas l'étiquette « lot ${n} ».` : '') +
        `\n      À AJOUTER dans ce lot : <code class="commit-msg">&lt;convention-du-projet&gt;: lot ${n} — &lt;titre du lot&gt;</code>` +
        `\n      (ou un <pre class="cmd"> contenant « git commit -m "…: lot ${n} — …" »), avec la mention explicite que le` +
        `\n      travail de clôture ne doit PAS être commité sous un message libre du genre « correctifs de revue ».` +
        `\n      Raison : dans une chaîne de chantiers, le run aval vérifie sa précondition par un « git log --grep »` +
        `\n      LITTÉRAL sur cette étiquette ; sans elle il compte zéro et conclut à tort que l'amont a échoué.` +
        (legacy ? '' : `\n      (--legacy rétrograde ce finding en avertissement pour les plans antérieurs à la convention.)`),
    );
  }
}

/* 9 — flotte parallèle : plage d'identifiants déclarée
   (règle brief-chantier, rôle ORCHESTRATEUR, Phase 2, étape 4bis).
   Section OPTIONNELLE : absente = plan solo = check totalement silencieux. */
const flotte = readFlotte(html);
if (flotte.present) {
  const { nom, freres, plage, plageParsed } = flotte;
  if (!nom) {
    errors.push(
      'Section flotte (id="s-flotte") : nom de la vague absent.' +
        '\n      À AJOUTER : <span class="flotte-nom">&lt;nom de la vague&gt;</span> — sans lui, impossible de savoir quels plans partagent l\'allocateur.',
    );
  }

  if (freres <= 0) {
    errors.push(
      `Section flotte (id="s-flotte") : liste des chantiers frères ${freres === 0 ? 'vide' : 'absente'}.` +
        '\n      À AJOUTER : <ul class="list flotte-freres"> avec un <li> par chantier frère de la vague (slug, branche, plage attribuée).',
    );
  }

  if (!plage) {
    errors.push(
      'Section flotte (id="s-flotte") : plage d\'identifiants réservée NON déclarée — c\'est la faille que cette section existe pour fermer.' +
        '\n      À AJOUTER : <code class="plage-ids">&lt;compteur&gt; N-M</code> (ex. « DEFERRED 121-130 »), ou <code class="plage-ids">aucun compteur global</code>' +
        '\n      si ce chantier n\'alloue aucun identifiant par script.' +
        '\n      Raison : tout compteur global alloué par script est aveugle aux branches sœurs non fusionnées — N chantiers partis du même' +
        '\n      socle reçoivent tous LE MÊME numéro, et la collision n\'apparaît qu\'à la fusion (observé le 15/08/2026 sur 3 chantiers).',
    );
  } else if (!plageParsed) {
    errors.push(
      `Section flotte (id="s-flotte") : plage d'identifiants illisible — « ${plage.slice(0, 100)} ».` +
        '\n      Attendu : une plage bornée « N-M » (ex. « DEFERRED 121-130 »), ou la mention « aucun compteur global ».',
    );
  } else if (!plageParsed.optout && plageParsed.from > plageParsed.to) {
    errors.push(
      `Section flotte (id="s-flotte") : plage inversée — « ${plage.slice(0, 100)} » (borne basse ${plageParsed.from} > borne haute ${plageParsed.to}).`,
    );
  }

  if (!htmlLive.includes('href="#s-flotte"')) {
    warnings.push('TOC : entrée manquante pour la section flotte (href="#s-flotte")');
  }

  warnings.push(
    'Plan membre d\'une vague : ce lint ne voit QU\'UN plan et ne peut pas détecter une collision de plages.' +
      '\n      Lance le lint de VAGUE sur les N plans frères avant de dispatcher la flotte :' +
      '\n      node ' +
      new URL('preflight-flotte.mjs', import.meta.url).pathname +
      ' <plan1.html> <plan2.html> …',
  );
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
