#!/usr/bin/env node
/**
 * check-ledger.mjs — deterministic completeness gate for the ship-polished-ui
 * Verification Ledger.
 *
 * The ledger is the skill's definition of done; this script checks its FORM,
 * never its judgments — "script pour compter, modèle pour juger". Run it on
 * the ledger text (the chat turn saved to a file, or an HTML/Markdown report)
 * before declaring UI work done: it must exit 0.
 *
 * Usage:   node check-ledger.mjs <ledger-file|-> [manifest.json]
 *          "-" reads stdin. The optional manifest is scan-surfaces.mjs output;
 *          when given, every surface must be mentioned in the ledger (a
 *          declared out-of-scope line counts; silence fails).
 * Checks:
 *   1. the exact marker "VERIFICATION LEDGER" is present — or the auditable
 *      escape hatch "LEDGER-EXEMPT: <reason>" (reason required);
 *   2. no table row counts a not-evidenced cell as PASS;
 *   3. every mandatory viewport (320 / 360 / 375 / 768 / desktop) appears in
 *      the ledger;
 *   4. (with manifest) every scanned surface appears in the ledger.
 * Exit:    0 if complete (or validly exempt); 1 with "MANQUE : …" lines on
 *          stderr; 2 on usage/IO error.
 *
 * Zero dependencies. Node >= 18, macOS/Linux.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

function usage(msg) {
  process.stderr.write(`check-ledger: ${msg}\nusage: node check-ledger.mjs <ledger-file|-> [manifest.json]\n`);
  process.exit(2);
}

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "-", mdash: "-" };

function normalize(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[  ]/g, " ");
}

async function readInput(arg) {
  if (arg === "-") {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    return Buffer.concat(chunks).toString("utf8");
  }
  return fs.readFile(arg, "utf8");
}

function tableRows(section) {
  // Markdown rows (>= 2 pipes) + HTML <tr> blocks — legend prose is excluded
  // so a sentence explaining the not-evidenced rule can't false-positive.
  const rows = section.split("\n").filter((l) => (l.match(/\|/g) ?? []).length >= 2);
  for (const m of section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) rows.push(m[1].replace(/\s+/g, " "));
  return rows;
}

function surfaceTokens(surface) {
  const tokens = [];
  if (surface.route && surface.route !== "/") tokens.push(surface.route);
  if (surface.file) {
    tokens.push(surface.file);
    const base = path.basename(surface.file).replace(/\.[^.]+$/, "");
    if (base && base !== "index") tokens.push(base);
  }
  return tokens;
}

async function main() {
  const [ledgerArg, manifestArg] = process.argv.slice(2);
  if (!ledgerArg) usage("argument requis : fichier ledger (ou - pour stdin)");

  let raw;
  try {
    raw = await readInput(ledgerArg);
  } catch (e) {
    usage(`ledger illisible : ${ledgerArg} (${e.code ?? e.message})`);
  }
  const text = normalize(raw);
  const missing = [];

  // 1a. Auditable escape hatch: a LEDGER-EXEMPT line with a real reason.
  const exempt = text.match(/^\s*LEDGER-EXEMPT:\s*(.*)$/m);
  if (exempt) {
    if (!exempt[1].trim()) {
      process.stderr.write("MANQUE : LEDGER-EXEMPT: sans raison — l'exemption doit être motivée.\n");
      process.exit(1);
    }
    process.stdout.write(`check-ledger: OK — exemption déclarée (${exempt[1].trim()}).\n`);
    return;
  }

  // 1b. Exact marker.
  const markerIdx = text.indexOf("VERIFICATION LEDGER");
  if (markerIdx === -1) {
    missing.push(
      "marqueur exact « VERIFICATION LEDGER » introuvable (les paraphrases ne comptent pas) — ou déclarer « LEDGER-EXEMPT: <raison> ».",
    );
  }
  const section = markerIdx === -1 ? text : text.slice(markerIdx);

  // 2. No row counts a not-evidenced cell as PASS.
  for (const row of tableRows(section)) {
    if (/not[- ]?evidenced/i.test(row) && /\bPASS\b/i.test(row)) {
      missing.push(`cellule not-evidenced comptée PASS : « ${row.trim().slice(0, 120)} » — une cellule non rendue n'est jamais PASS.`);
    }
  }

  // 3. Mandatory viewports.
  for (const vp of ["320", "360", "375", "768"]) {
    if (!new RegExp(`\\b${vp}\\b`).test(section)) missing.push(`viewport obligatoire ${vp}px absent du ledger.`);
  }
  if (!/desktop|\b(1280|1440|1920)\b/i.test(section)) missing.push("viewport obligatoire desktop (ou 1280/1440/1920) absent du ledger.");

  // 4. Optional manifest cross-check: every scanned surface is mentioned.
  if (manifestArg) {
    let manifest;
    try {
      manifest = JSON.parse(await fs.readFile(manifestArg, "utf8"));
    } catch (e) {
      usage(`manifeste illisible ou non-JSON : ${manifestArg} (${e.code ?? e.message})`);
    }
    if (!Array.isArray(manifest.surfaces)) usage("manifeste sans tableau surfaces[] — produit par scan-surfaces.mjs ?");
    const lower = section.toLowerCase();
    for (const s of manifest.surfaces) {
      if (!surfaceTokens(s).some((t) => lower.includes(t.toLowerCase()))) {
        const label = s.route ? `${s.route} (${s.file})` : s.file;
        missing.push(`surface ${label} absente du ledger — la couvrir ou la déclarer hors périmètre explicitement.`);
      }
    }
  }

  if (missing.length) {
    for (const m of missing) process.stderr.write(`MANQUE : ${m}\n`);
    process.stderr.write(`check-ledger: ${missing.length} manque(s) — ledger incomplet, corriger et relancer.\n`);
    process.exit(1);
  }
  process.stdout.write("check-ledger: OK — marqueur présent, aucun PASS non évidencé, viewports obligatoires couverts.\n");
}

main().catch((e) => usage(e.stack ?? String(e)));
