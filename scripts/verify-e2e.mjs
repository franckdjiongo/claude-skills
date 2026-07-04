#!/usr/bin/env node
// verify-e2e.mjs — mechanical, third-party-checkable gate for the WP-16 end-to-end
// proof of the design ecosystem (brand-forge → design-forge BRIEF →
// ship-polished-ui build + Verification Ledger → design-forge AUDIT).
//
// Node stdlib only, zero deps. Deterministic. Timestamped, detailed output.
// Exit 0 ONLY if every gate passes; non-zero and a full list of gaps otherwise.
//
// USAGE
//   node scripts/verify-e2e.mjs [proofDir]
//     proofDir defaults to plans/e2e-proof (resolved from repo root).
//
// WHAT IT CHECKS
//   (a) ledger.md exists and contains a "VERIFICATION LEDGER" heading.
//   (b) Every screenshot identifier mentioned in the ledger resolves to a
//       non-empty PNG under <proofDir>/shots/.
//   (c) NO not-evidenced cell on a surface×viewport scope row. Cross-cutting
//       (transverse) rows may carry not-evidenced ONLY if flagged tool-unavailable.
//   (d) design-spec.md, design-intent.md, brand-package.md (path read from the
//       proofDir manifest.json), brand-tokens.css and design-forge-audit.md all
//       exist and are non-empty.
//   (e) Cross-citations: the brand name from brand-package.md appears in
//       design-spec.md, AND the custom properties declared in brand-tokens.css
//       appear in the landing CSS (landing path read from manifest.json).
//   (f) slop-lint.mjs runs on the landing directory and returns verdict <= mild.
//
// MANIFEST (proofDir/manifest.json), all paths relative to proofDir unless absolute:
//   {
//     "brandPackage": "brand-package.md",     // optional, default brand-package.md
//     "brandTokens":  "brand-tokens.css",     // optional, default brand-tokens.css
//     "landingDir":   "landing",              // required: dir slop-lint scans
//     "landingCss":   "landing/styles.css"    // required: CSS file to grep tokens in
//   }

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, resolve, dirname, isAbsolute, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SLOP_LINT = join(__dirname, "slop-lint.mjs");

const proofArg = process.argv[2] || join(REPO_ROOT, "plans", "e2e-proof");
const PROOF = isAbsolute(proofArg) ? proofArg : resolve(process.cwd(), proofArg);

const stamp = () => new Date().toISOString();
const failures = [];
const notes = [];
let checks = 0;

function log(line) {
  console.log(`[${stamp()}] ${line}`);
}
function pass(label) {
  checks++;
  log(`  PASS  ${label}`);
}
function fail(label, detail) {
  checks++;
  failures.push(detail ? `${label} — ${detail}` : label);
  log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
}

function resolveIn(base, p) {
  if (!p) return null;
  return isAbsolute(p) ? p : resolve(base, p);
}

function nonEmptyFile(p) {
  try {
    return statSync(p).isFile() && statSync(p).size > 0;
  } catch {
    return false;
  }
}

log(`verify-e2e — proof directory: ${PROOF}`);
log(`repo root: ${REPO_ROOT}`);

if (!existsSync(PROOF) || !statSync(PROOF).isDirectory()) {
  fail("proof directory exists", `${PROOF} not found or not a directory`);
  summarize();
}

// ---------------------------------------------------------------------------
// Load manifest early (needed by (d) brand-package path and (e)/(f) landing).
// ---------------------------------------------------------------------------
let manifest = {};
const manifestPath = join(PROOF, "manifest.json");
if (nonEmptyFile(manifestPath)) {
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    pass(`manifest.json parsed (${manifestPath})`);
  } catch (e) {
    fail("manifest.json is valid JSON", e.message);
  }
} else {
  fail("manifest.json exists and is non-empty", manifestPath);
}

// ---------------------------------------------------------------------------
// (a) ledger.md exists with a VERIFICATION LEDGER heading.
// ---------------------------------------------------------------------------
const ledgerPath = join(PROOF, "ledger.md");
let ledger = "";
if (nonEmptyFile(ledgerPath)) {
  ledger = readFileSync(ledgerPath, "utf8");
  if (/VERIFICATION LEDGER/i.test(ledger)) {
    pass('ledger.md contains "VERIFICATION LEDGER" heading');
  } else {
    fail('ledger.md contains "VERIFICATION LEDGER" heading', ledgerPath);
  }
} else {
  fail("ledger.md exists and is non-empty", ledgerPath);
}

// ---------------------------------------------------------------------------
// (b) Every screenshot id in the ledger resolves to a non-empty PNG in shots/.
//     Screenshot ids: tokens like shot_xxx / shot-xxx / SHOT_xxx, and any
//     explicit *.png filename referenced in the ledger.
// ---------------------------------------------------------------------------
const shotsDir = join(PROOF, "shots");
const shotsExist = existsSync(shotsDir) && statSync(shotsDir).isDirectory();
if (!shotsExist) {
  // Only a hard fail if the ledger actually references shots.
  notes.push(`shots/ directory not found at ${shotsDir}`);
}

function ledgerShotIds(text) {
  const ids = new Set();
  // shot_ / shot- identifiers (word-ish tokens)
  for (const m of text.matchAll(/\bshot[_-][A-Za-z0-9][\w-]*/gi)) {
    ids.add(m[0].replace(/\.png$/i, ""));
  }
  // explicit png filenames
  for (const m of text.matchAll(/[A-Za-z0-9][\w./-]*\.png/gi)) {
    ids.add(m[0]);
  }
  return [...ids];
}

function resolvePng(id) {
  // Accept: an explicit relative path, a bare filename, or an id needing .png.
  const candidates = [];
  const asIs = id;
  const withPng = /\.png$/i.test(id) ? id : `${id}.png`;
  for (const name of [asIs, withPng]) {
    candidates.push(resolveIn(PROOF, name)); // path relative to proofDir
    candidates.push(join(shotsDir, name.split("/").pop())); // basename in shots/
  }
  for (const c of candidates) {
    if (c && nonEmptyFile(c) && extname(c).toLowerCase() === ".png") return c;
  }
  return null;
}

if (ledger) {
  const ids = ledgerShotIds(ledger);
  if (ids.length === 0) {
    fail("ledger references at least one screenshot id", "none found in ledger.md");
  } else {
    let allOk = true;
    for (const id of ids) {
      const png = resolvePng(id);
      if (png) {
        log(`        shot OK: ${id} -> ${png}`);
      } else {
        allOk = false;
        fail(`screenshot resolves to non-empty PNG`, `id "${id}" (checked shots/ and proofDir)`);
      }
    }
    if (allOk) pass(`all ${ids.length} ledger screenshot id(s) resolve to non-empty PNGs`);
  }
}

// ---------------------------------------------------------------------------
// (c) No not-evidenced cell on a surface×viewport scope row. Transverse rows
//     tolerate not-evidenced ONLY if the row is flagged tool-unavailable.
//     Convention: markdown table rows. A row is "transverse" if its first
//     cell contains "(transverse)" or "transverse" or "cross-cutting".
// ---------------------------------------------------------------------------
if (ledger) {
  const rows = ledger.split(/\r?\n/).filter((l) => /^\s*\|/.test(l));
  let badRows = 0;
  let scopeRowsSeen = 0;
  for (const row of rows) {
    if (!/not-evidenced/i.test(row)) continue;
    // skip header/separator rows
    if (/^\s*\|[\s:|-]*\|?\s*$/.test(row)) continue;
    if (/\bsurface\b/i.test(row) && /\bviewport\b/i.test(row) && /---/.test(row)) continue;
    const firstCell = (row.split("|")[1] || "").trim();
    const isTransverse = /transverse|cross-cutting|cross cutting/i.test(row);
    if (isTransverse) {
      if (/tool[- ]?unavailable|outil[- ]?indisponible/i.test(row)) {
        notes.push(`transverse row tolerates not-evidenced (tool-unavailable): ${firstCell.slice(0, 60)}`);
      } else {
        badRows++;
        fail("transverse not-evidenced row is flagged tool-unavailable", firstCell.slice(0, 80));
      }
    } else {
      scopeRowsSeen++;
      badRows++;
      fail("scope row (surface×viewport) has no not-evidenced cell", firstCell.slice(0, 80));
    }
  }
  if (badRows === 0) {
    pass("no not-evidenced cell on any scope row (transverse exceptions properly flagged)");
  }
}

// ---------------------------------------------------------------------------
// (d) Contract artifacts exist and are non-empty.
// ---------------------------------------------------------------------------
const brandPackagePath = resolveIn(PROOF, manifest.brandPackage || "brand-package.md");
const brandTokensPath = resolveIn(PROOF, manifest.brandTokens || "brand-tokens.css");
const artifacts = {
  "design-spec.md": join(PROOF, "design-spec.md"),
  "design-intent.md": join(PROOF, "design-intent.md"),
  "brand-package.md (manifest)": brandPackagePath,
  "brand-tokens.css": brandTokensPath,
  "design-forge-audit.md": join(PROOF, "design-forge-audit.md"),
};
for (const [label, p] of Object.entries(artifacts)) {
  if (p && nonEmptyFile(p)) pass(`artifact exists & non-empty: ${label}`);
  else fail(`artifact exists & non-empty: ${label}`, p || "path unresolved");
}

// ---------------------------------------------------------------------------
// (e) Cross-citations.
// ---------------------------------------------------------------------------
function readIf(p) {
  return p && nonEmptyFile(p) ? readFileSync(p, "utf8") : null;
}

// Brand name: prefer manifest.brandName; else first "# Name" / "Name:" heading.
function extractBrandName(text, manifestName) {
  if (manifestName && manifestName.trim()) return manifestName.trim();
  if (!text) return null;
  let m = text.match(/^#\s*(?:brand(?:\s*name)?\s*[:—-]\s*)?(.+)$/im);
  if (m) {
    // Take the first significant word/phrase token on the heading line.
    const raw = m[1].trim().replace(/[#*_`]/g, "");
    const first = raw.split(/[\s—:|,(]/).filter(Boolean)[0];
    return first || null;
  }
  m = text.match(/\bname\s*[:—-]\s*([A-Za-z0-9][\w-]+)/i);
  return m ? m[1] : null;
}

const bpText = readIf(brandPackagePath);
const specText = readIf(join(PROOF, "design-spec.md"));
const brand = extractBrandName(bpText, manifest.brandName);
if (!brand) {
  fail("brand name extracted from brand-package.md", "no name/heading found (set manifest.brandName)");
} else if (!specText) {
  fail("design-spec.md readable for cross-citation", "missing/empty");
} else if (new RegExp(`\\b${escapeRe(brand)}\\b`, "i").test(specText)) {
  pass(`brand name "${brand}" cited in design-spec.md`);
} else {
  fail(`brand name "${brand}" appears in design-spec.md`, "not found");
}

// Custom properties from brand-tokens.css appear in landing CSS.
const tokensText = readIf(brandTokensPath);
const landingCssPath = resolveIn(PROOF, manifest.landingCss);
const landingCssText = readIf(landingCssPath);
if (!tokensText) {
  fail("brand-tokens.css readable for cross-citation", "missing/empty");
} else if (!landingCssPath) {
  fail("manifest.landingCss set", "landing CSS path required for token cross-citation");
} else if (!landingCssText) {
  fail("landing CSS readable", `${landingCssPath} missing/empty`);
} else {
  const props = [...new Set([...tokensText.matchAll(/(--[A-Za-z0-9][\w-]*)\s*:/g)].map((m) => m[1]))];
  if (props.length === 0) {
    fail("brand-tokens.css declares custom properties", "no --custom-property declarations found");
  } else {
    const missing = props.filter((p) => !landingCssText.includes(p));
    if (missing.length === 0) {
      pass(`all ${props.length} brand-tokens custom properties appear in landing CSS`);
    } else {
      fail(
        "all brand-tokens custom properties appear in landing CSS",
        `missing ${missing.length}/${props.length}: ${missing.slice(0, 8).join(", ")}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// (f) slop-lint on the landing directory, verdict <= mild.
// ---------------------------------------------------------------------------
const landingDirPath = resolveIn(PROOF, manifest.landingDir);
if (!landingDirPath || !existsSync(landingDirPath)) {
  fail("manifest.landingDir exists", landingDirPath || "unset");
} else if (!existsSync(SLOP_LINT)) {
  fail("slop-lint.mjs available", SLOP_LINT);
} else {
  const res = spawnSync(process.execPath, [SLOP_LINT, "--json", landingDirPath], {
    encoding: "utf8",
  });
  if (res.error) {
    fail("slop-lint executed", res.error.message);
  } else {
    let verdict = null;
    try {
      verdict = JSON.parse(res.stdout).verdict;
    } catch {
      verdict = null;
    }
    const label = (verdict || "").toLowerCase();
    const ok = label.startsWith("clean") || label.startsWith("mild");
    if (verdict && ok) {
      pass(`slop-lint verdict "${verdict}" is <= mild (landing: ${landingDirPath})`);
    } else if (verdict) {
      fail(`slop-lint verdict <= mild`, `got "${verdict}"`);
    } else {
      fail("slop-lint produced a parseable verdict", res.stdout.slice(0, 200) || res.stderr.slice(0, 200));
    }
  }
}

summarize();

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function summarize() {
  console.log("");
  log(`verify-e2e summary: ${checks} check(s), ${failures.length} failure(s)`);
  for (const n of notes) log(`  note: ${n}`);
  if (failures.length) {
    log("MISSING / FAILED:");
    for (const f of failures) log(`  - ${f}`);
    log("verify-e2e: FAIL");
    process.exit(1);
  }
  log("verify-e2e: PASS — all gates satisfied");
  process.exit(0);
}
