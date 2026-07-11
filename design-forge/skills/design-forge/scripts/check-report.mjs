#!/usr/bin/env node
/**
 * check-report.mjs — deterministic completeness gate for a design-forge report.
 *
 * Verifies that a produced report (HTML or Markdown) is COMPLETE against the
 * coverage manifest emitted by scan-surfaces.mjs. It checks presence, never
 * quality — "script pour compter, modèle pour juger".
 *
 * Usage:   node check-report.mjs <report.html|report.md> <manifest.json>
 * Checks:
 *   (a) every manifest surface appears in the report (coverage, findings, or a
 *       declared-gaps section — any explicit mention counts; silence fails);
 *   (b) the 10 phases of the testing protocol are attested (marker "Phase N");
 *   (c) every finding in the machine-readable JSON block has id / category /
 *       severity / location / description;
 *   (d) the progress checklist (§7) lists every finding ID from the JSON.
 * Exit:    0 if complete; 1 with precise "MANQUE : …" lines on stderr (the
 *          skill loops on them); 2 on usage/IO error.
 *
 * Zero dependencies. Node >= 18, macOS/Linux.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

function usage(msg) {
  process.stderr.write(`check-report: ${msg}\nusage: node check-report.mjs <report.html|md> <manifest.json>\n`);
  process.exit(2);
}

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "-", mdash: "-" };

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

// Typographic variants that break exact matching: non-breaking hyphens/dashes
// (U+2010/U+2011/U+2012/U+2013/U+2014) → "-", NBSP/narrow-NBSP → " ".
function normalize(s) {
  return decodeEntities(s).replace(/[‐‑‒–—]/g, "-").replace(/[  ]/g, " ");
}

function extractMachineJson(normalizedText) {
  const candidates = [];
  for (const m of normalizedText.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi)) candidates.push(m[1]);
  for (const m of normalizedText.matchAll(/```json\s*\n([\s\S]*?)```/gi)) candidates.push(m[1]);
  for (const c of candidates) {
    if (!c.includes('"findings"')) continue;
    try {
      const parsed = JSON.parse(c.trim());
      if (Array.isArray(parsed.findings)) return parsed;
    } catch { /* try the next block */ }
  }
  return null;
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

function findChecklistSection(normalizedText) {
  // HTML: any <h1-3> whose inner content (nested tags included) says
  // "checklist"; Markdown: "## Progress Checklist".
  let start = -1;
  for (const m of normalizedText.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    if (/checklist/i.test(m[2])) { start = m.index + m[0].length; break; }
  }
  if (start === -1) {
    const md = normalizedText.match(/^#{1,3}[^\n]*checklist[^\n]*$/im);
    if (md) start = md.index + md[0].length;
  }
  if (start === -1) return null;
  const rest = normalizedText.slice(start);
  const end = rest.search(/<h[1-3][^>]*>|^#{1,3}\s/im);
  return rest.slice(0, end === -1 ? undefined : end);
}

async function main() {
  const [reportPath, manifestPath] = process.argv.slice(2);
  if (!reportPath || !manifestPath) usage("deux arguments requis");

  let rawReport, manifest;
  try {
    rawReport = await fs.readFile(reportPath, "utf8");
  } catch (e) {
    usage(`rapport illisible : ${reportPath} (${e.code ?? e.message})`);
  }
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (e) {
    usage(`manifeste illisible ou non-JSON : ${manifestPath} (${e.code ?? e.message})`);
  }
  if (!Array.isArray(manifest.surfaces)) usage("manifeste sans tableau surfaces[] — produit par scan-surfaces.mjs ?");

  const text = normalize(rawReport);
  const lower = text.toLowerCase();
  const missing = [];

  // (a) every manifest surface is mentioned somewhere in the report.
  for (const s of manifest.surfaces) {
    const tokens = surfaceTokens(s);
    const hit = tokens.some((t) => lower.includes(t.toLowerCase()));
    if (!hit) {
      const label = s.route ? `${s.route} (${s.file})` : s.file;
      missing.push(
        `surface ${label} absente du rapport — ni dans la couverture, ni dans les findings, ni déclarée en gap.`,
      );
    }
  }

  // (b) the 10 phases of the testing protocol are attested.
  const phasesMissing = [];
  for (let n = 1; n <= 10; n++) {
    if (!new RegExp(`\\bphase\\s*[-:—]?\\s*${n}\\b`, "i").test(text)) phasesMissing.push(n);
  }
  if (phasesMissing.length)
    missing.push(
      `phases du testing-protocol non attestées dans le rapport : ${phasesMissing.map((n) => `Phase ${n}`).join(", ")} — attester chaque phase exécutée (marqueur « Phase N ») ou la déclarer en gap.`,
    );

  // (c) machine-readable JSON block with complete findings.
  const machine = extractMachineJson(text);
  if (!machine) {
    missing.push(
      "bloc JSON machine (§8 « Sortie machine » / Machine-Readable JSON) introuvable ou imparsable — les vérifications (c) et (d) ne peuvent pas s'exécuter.",
    );
  } else {
    machine.findings.forEach((f, i) => {
      const ref = f.id ?? `findings[${i}]`;
      for (const field of ["id", "category", "severity", "location", "description"]) {
        const v = f[field];
        const empty =
          v === undefined || v === null || (typeof v === "string" && !v.trim()) ||
          (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);
        if (empty) missing.push(`finding ${ref} : champ « ${field} » manquant ou vide dans le JSON machine.`);
      }
    });

    // (d) the §7 checklist lists every finding ID.
    const section = findChecklistSection(text);
    if (!section) {
      missing.push("section checklist (§7 / Progress Checklist) introuvable dans le rapport.");
    } else {
      const listed = new Set((section.match(/\b[A-Z][A-Z0-9]{2,}-\d{1,4}\b/g) ?? []));
      for (const f of machine.findings) {
        if (f.id && !listed.has(String(f.id))) missing.push(`checklist §7 : finding ${f.id} absent du tableau de suivi.`);
      }
    }
  }

  if (missing.length) {
    for (const m of missing) process.stderr.write(`MANQUE : ${m}\n`);
    process.stderr.write(`check-report: ${missing.length} manque(s) — rapport incomplet, corriger et relancer.\n`);
    process.exit(1);
  }
  process.stdout.write(
    `check-report: OK — ${manifest.surfaces.length} surface(s) couvertes, 10 phases attestées, ` +
      `${machine.findings.length} finding(s) complets et listés dans la checklist.\n`,
  );
}

main().catch((e) => usage(e.stack ?? String(e)));
