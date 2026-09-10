#!/usr/bin/env node
/**
 * preflight-flotte.mjs — lint de VAGUE du skill brief-preflight.
 *
 * Usage : node preflight-flotte.mjs <plan1.html> <plan2.html> [...]   (≥ 2 plans)
 *         node preflight-flotte.mjs <répertoire-de-plans>             (tous les .html)
 *         [--depuis <N>]  plancher du compteur : toute plage démarrant sous N
 *                         réutilise des identifiants DÉJÀ alloués sur main.
 *
 * Complémentaire de preflight-lint.mjs, qui s'exécute sur UN plan et ne peut donc
 * PAS voir ses plans frères : il vérifie qu'une plage est DÉCLARÉE, jamais qu'elle
 * est DISJOINTE. Ce script-ci prend les N plans d'une vague ensemble et ferme les
 * deux trous qui restaient :
 *   a. un plan de la vague qui n'a pas décommenté sa section flotte (le check 9
 *      est silencieux sur un plan « solo » — l'omission passait donc inaperçue) ;
 *   b. deux plans dont les plages attribuées se recouvrent.
 *
 * Règle couverte : brief-chantier, rôle ORCHESTRATEUR, Phase 2, étape 4bis.
 * Mode d'échec d'origine (15/08/2026) : trois chantiers parallèles partis du même
 * socle ont chacun appelé l'allocateur d'identifiants de backlog et reçu LE MÊME
 * numéro pour trois findings différents ; la collision n'est apparue qu'à la fusion.
 *
 * À lancer par l'ORCHESTRATEUR en fin de Phase 2, AVANT de dispatcher la flotte.
 *
 * Sortie : findings groupés ERREUR / AVERTISSEMENT, code retour 1 si ≥ 1 erreur,
 *          2 sur erreur d'usage (mêmes conventions que preflight-lint.mjs).
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, realpathSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { readFlotte, chevauchent } from './flotte-shared.mjs';

/** Journal des runs PASS, lu par le Stop-hook `flotte-plage-gate.mjs` pour
 *  savoir si les plans écrits dans une session ont VRAIMENT été vérifiés
 *  ensemble, à leur contenu actuel. Contenu-adressé : rééditer un plan après
 *  coup invalide la preuve. Best-effort — jamais fatal pour le lint. */
const JOURNAL = join(homedir(), '.claude', '.flotte-lint-runs.json');
const sha = (s) => createHash('sha256').update(s).digest('hex');

function enregistrerRunPass(paths) {
  try {
    const plans = {};
    for (const p of paths) {
      let abs = p;
      try {
        abs = realpathSync(p);
      } catch {
        /* chemin non résolu : on garde tel quel */
      }
      plans[abs] = sha(readFileSync(p, 'utf8'));
    }
    let runs = [];
    if (existsSync(JOURNAL)) {
      try {
        const parsed = JSON.parse(readFileSync(JOURNAL, 'utf8'));
        if (Array.isArray(parsed)) runs = parsed;
      } catch {
        /* journal corrompu : on repart d'une liste vide */
      }
    }
    runs.push({ at: new Date().toISOString(), plans });
    writeFileSync(JOURNAL, JSON.stringify(runs.slice(-20), null, 2));
  } catch {
    /* Le journal est un confort pour le hook, jamais une condition du lint. */
  }
}

const USAGE =
  'Usage : node preflight-flotte.mjs <plan1.html> <plan2.html> [...] [--depuis <N>]\n' +
  '        node preflight-flotte.mjs <répertoire-de-plans> [--depuis <N>]';

/* Arguments */
const argv = process.argv.slice(2);
let depuis = null;
const rest = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--depuis') {
    depuis = Number(argv[++i]);
    if (!Number.isFinite(depuis)) {
      console.error('ERREUR : --depuis attend un entier.');
      process.exit(2);
    }
  } else rest.push(argv[i]);
}
if (rest.length === 0) {
  console.error(USAGE);
  process.exit(2);
}

// Argument unique répertoire → tous ses .html, triés.
let planPaths = rest;
if (rest.length === 1 && existsSync(rest[0]) && statSync(rest[0]).isDirectory()) {
  planPaths = readdirSync(rest[0])
    .filter((f) => f.endsWith('.html'))
    .sort()
    .map((f) => join(rest[0], f));
}
for (const p of planPaths) {
  if (!existsSync(p)) {
    console.error(`ERREUR : plan introuvable — ${p}`);
    process.exit(2);
  }
}
if (planPaths.length < 2) {
  console.error(
    `ERREUR : une vague suppose au moins 2 plans (${planPaths.length} fourni).\n` +
      "Pour un plan solo, c'est preflight-lint.mjs <plan.html> <repo-cible> qu'il faut lancer.\n" +
      USAGE,
  );
  process.exit(2);
}

const errors = [];
const warnings = [];

/* Lecture des N plans — `fichier` est le nom de fichier, `nom` le nom de VAGUE. */
const plans = planPaths.map((p) => ({ path: p, fichier: basename(p), ...readFlotte(readFileSync(p, 'utf8')) }));

/* 1 — chaque plan de la vague DOIT déclarer sa section flotte.
   C'est le trou que le lint mono-plan ne pouvait pas voir : un plan sans section
   est traité comme solo, donc silencieux, alors qu'il tourne bien en parallèle. */
for (const p of plans.filter((x) => !x.present)) {
  errors.push(
    `${p.fichier} : aucune section flotte (id="s-flotte") alors que ce plan est linté DANS une vague de ${plans.length}.` +
      '\n      Décommente la section §02b du gabarit brief-chantier dans ce plan, remplis ses trois marqueurs' +
      '\n      (flotte-nom, flotte-freres, plage-ids) et la ligne de TOC correspondante.' +
      "\n      Un plan de vague laissé « solo » échappe SILENCIEUSEMENT au contrôle de plage — c'est exactement" +
      '\n      la faille du 15/08/2026.',
  );
}

const membres = plans.filter((p) => p.present);

/* 2 — un seul et même nom de vague pour tous les plans */
const nomsVague = [...new Set(membres.map((p) => (p.nom ?? '').trim().toLowerCase()).filter(Boolean))];
if (nomsVague.length > 1) {
  errors.push(
    `Noms de vague divergents entre les plans : ${nomsVague.map((n) => `« ${n} »`).join(', ')}.` +
      '\n      Soit ces plans n\'appartiennent pas à la même vague et ne doivent pas être lintés ensemble,' +
      '\n      soit c\'est une faute de frappe dans un <span class="flotte-nom"> — aligne-les.' +
      '\n      Détail : ' +
      membres.map((p) => `${p.fichier} → « ${(p.nom ?? '(absent)').trim()} »`).join(' | '),
  );
}

/* 3 — plage exploitable pour chaque membre (le détail du « pourquoi » est
   rapporté par preflight-lint.mjs, check 9 ; ici on ne fait que constater
   qu'on ne peut pas comparer). */
const comparables = [];
for (const p of membres) {
  if (!p.plage || !p.plageParsed) {
    errors.push(
      `${p.fichier} : plage d'identifiants ${p.plage ? `illisible (« ${p.plage.slice(0, 80)} »)` : 'non déclarée'} — impossible de vérifier la disjonction.` +
        '\n      Corrige d\'abord ce plan (node preflight-lint.mjs <plan> <repo>, check 9), puis relance le lint de vague.',
    );
    continue;
  }
  if (p.plageParsed.optout) continue; // « aucun compteur global » : rien à réserver
  if (p.plageParsed.from > p.plageParsed.to) {
    errors.push(`${p.fichier} : plage inversée — « ${p.plage} » (${p.plageParsed.from} > ${p.plageParsed.to}).`);
    continue;
  }
  comparables.push(p);
}

/* 4 — LE contrôle qui n'existait nulle part : disjonction deux à deux,
   par compteur (deux compteurs différents ne peuvent pas entrer en collision). */
for (let i = 0; i < comparables.length; i++) {
  for (let j = i + 1; j < comparables.length; j++) {
    const a = comparables[i];
    const b = comparables[j];
    if (a.plageParsed.label !== b.plageParsed.label) continue;
    if (!chevauchent(a.plageParsed, b.plageParsed)) continue;
    const debut = Math.max(a.plageParsed.from, b.plageParsed.from);
    const fin = Math.min(a.plageParsed.to, b.plageParsed.to);
    const compteur = a.plageParsed.label || '(compteur non nommé)';
    errors.push(
      `COLLISION de plages sur ${compteur} : ${a.fichier} (${a.plageParsed.from}-${a.plageParsed.to}) et ${b.fichier} (${b.plageParsed.from}-${b.plageParsed.to})` +
        `\n      se recouvrent sur ${debut === fin ? `l'identifiant ${debut}` : `les identifiants ${debut}-${fin}`}.` +
        '\n      Réattribue des plages disjointes AVANT de dispatcher la flotte : une fois les runs partis, la collision' +
        '\n      ne se découvre qu\'à la fusion, quand les deux identifiants sont déjà écrits dans deux backlogs.',
    );
  }
}

/* 5 — plancher du compteur : ne pas réattribuer des identifiants déjà pris sur main */
if (depuis !== null) {
  for (const p of comparables) {
    if (p.plageParsed.from < depuis) {
      errors.push(
        `${p.fichier} : la plage « ${p.plage} » démarre à ${p.plageParsed.from}, sous le plancher ${depuis}.` +
          `\n      Ces identifiants sont DÉJÀ alloués sur main — la plage doit commencer à ${depuis} ou au-delà.`,
      );
    }
  }
}

/* 6 — cohérence des listes de frères (indicatif : les formats de <li> varient) */
for (const p of membres) {
  if (p.freres <= 0) continue; // déjà une erreur du check 9 mono-plan
  if (p.freres !== plans.length - 1) {
    warnings.push(
      `${p.fichier} : ${p.freres} chantier(s) frère(s) listé(s) pour une vague de ${plans.length} (attendu ${plans.length - 1}).` +
        '\n      Vérifie que la liste flotte-freres est à jour — un frère oublié, c\'est un plan dont personne ne relit la plage.',
    );
  }
}

/* 7 — trous dans la couverture (indicatif, aide à repérer une plage oubliée) */
const parCompteur = new Map();
for (const p of comparables) {
  const k = p.plageParsed.label || '(compteur non nommé)';
  if (!parCompteur.has(k)) parCompteur.set(k, []);
  parCompteur.get(k).push(p.plageParsed);
}
for (const [compteur, liste] of parCompteur) {
  const tri = [...liste].sort((a, b) => a.from - b.from);
  for (let i = 1; i < tri.length; i++) {
    if (tri[i].from > tri[i - 1].to + 1) {
      warnings.push(
        `${compteur} : trou entre ${tri[i - 1].to} et ${tri[i].from} — plages non contiguës.` +
          '\n      Sans gravité si c\'est voulu ; suspect si un chantier de la vague a été oublié.',
      );
    }
  }
}

/* Rapport */
const say = (label, list) => {
  if (!list.length) return;
  console.log(`\n${label} (${list.length}) :`);
  for (const f of list) console.log(`  - ${f}`);
};
console.log(
  `Préflight flotte — ${plans.length} plan(s)${depuis !== null ? `, plancher compteur ${depuis}` : ''}` +
    (nomsVague.length === 1 ? ` · vague « ${nomsVague[0]} »` : ''),
);
for (const p of comparables) console.log(`  ${p.fichier} → ${p.plage}`);
say('ERREURS', errors);
say('AVERTISSEMENTS', warnings);
if (!errors.length && !warnings.length) console.log('\nAucun finding — plages disjointes et vague cohérente.');
console.log(
  `\nVERDICT: ${errors.length ? 'FAIL' : 'PASS'} (${errors.length} erreur(s), ${warnings.length} avertissement(s))`,
);
if (!errors.length) enregistrerRunPass(planPaths);
process.exit(errors.length ? 1 : 0);
