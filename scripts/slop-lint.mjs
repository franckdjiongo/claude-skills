#!/usr/bin/env node
// slop-lint.mjs — deterministic AI-slop tell scanner (Node stdlib only, zero deps).
//
// Purpose: certify the ABSENCE of known AI-slop tells in a delivered frontend.
// It is a NECESSARY, NEVER SUFFICIENT condition — a clean lint does not certify
// distinctiveness (that verdict belongs to the independent design-forge AUDIT and
// the written swap-brand test). See ship-polished-ui visual-qa-checklist Section 14.
//
// Consumed by: ship-polished-ui (Phase 2, Section 14 — Signature & slop).
// Tell catalogue distilled from the ecosystem plan annex A3
// (plans/2026-07-04-plan-ecosysteme-design-v2.html).
//
// USAGE
//   node scripts/slop-lint.mjs <dir>            # scan a delivered site directory
//   node scripts/slop-lint.mjs <file> [...]     # or explicit files
//   node scripts/slop-lint.mjs --json <dir>     # machine-readable output
//   node scripts/slop-lint.mjs --selftest       # run against the bundled fixtures
//
// SCANS .html .htm .css .js .jsx .ts .tsx for DETERMINISTIC tells:
//   - font-family Inter/Roboto/Arial in a DISPLAY context (headings / big type)
//   - chromatic proximity to AI violet by distance in OKLCH space (NOT hex equality:
//     nudging #6366f1 one step must not escape the net — anchors #6366f1/#8b5cf6/#a78bfa)
//   - emoji used in UI markup
//   - uniform border-radius >= 24px applied broadly (over-rounding)
//   - an identical 1px border repeated on every card
//   - the canonical AI page sequence (hero -> 3 cards -> pricing -> FAQ ...)
//   - violet -> blue gradient
//
// VERDICT (by distinct-tell count):  0-1 clean (exit 0) · 2-3 mild (exit 0) · 4+ heavy (exit 1)

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Colour maths: sRGB hex -> linear -> OKLab -> OKLCH, then distance to anchors.
// The exact-hex trap: we compare in OKLCH so a colour one step off #6366f1 still
// registers. Anchors are the measured AI-violet cluster.
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  let h = hex.replace(/^#/, "").toLowerCase();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

// sRGB (0..1, gamma) -> OKLab. Reference: Björn Ottosson's OKLab.
function rgbToOklab([r, g, b]) {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklab2ch({ L, a, b }) {
  // Hue normalized to [0, 360) so hue-band checks (e.g. the blue band) are correct.
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { L, C: Math.hypot(a, b), h };
}

function hexToOklch(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return oklab2ch(rgbToOklab(rgb));
}

// AI-violet anchors (measured cluster, annex A3): indigo-500, violet-500, violet-400.
const VIOLET_ANCHORS = ["#6366f1", "#8b5cf6", "#a78bfa"].map(hexToOklch);
// Proximity threshold in OKLab (a,b + L) space. Chosen so the three anchors AND
// their immediate neighbours register, while unrelated hues (teal, oxide, moss…)
// stay clear. Empirically ~0.055 separates "a nudge off the anchor" from "a
// genuinely different colour".
const VIOLET_THRESHOLD = 0.06;

function oklchDist(a, b) {
  // Distance in OKLab-like cylindrical space: compare L and the a/b vector.
  const ax = (a.C * Math.cos((a.h * Math.PI) / 180));
  const ay = (a.C * Math.sin((a.h * Math.PI) / 180));
  const bx = (b.C * Math.cos((b.h * Math.PI) / 180));
  const by = (b.C * Math.sin((b.h * Math.PI) / 180));
  return Math.hypot(a.L - b.L, ax - bx, ay - by);
}

function isAiViolet(hex) {
  const c = hexToOklch(hex);
  if (!c) return false;
  // Ignore near-neutrals (grey/near-white/near-black have tiny chroma — not violet).
  if (c.C < 0.03) return false;
  return VIOLET_ANCHORS.some((anchor) => oklchDist(c, anchor) <= VIOLET_THRESHOLD);
}

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

const SCAN_EXT = new Set([".html", ".htm", ".css", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte"]);
const SKIP_DIR = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage"]);

function collectFiles(target) {
  const out = [];
  const st = statSync(target);
  if (st.isFile()) {
    out.push(target);
    return out;
  }
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (SKIP_DIR.has(entry)) continue;
      const p = join(dir, entry);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (SCAN_EXT.has(extname(entry).toLowerCase())) out.push(p);
    }
  };
  walk(target);
  return out;
}

// ---------------------------------------------------------------------------
// Tell detectors. Each returns a { hits, sample } or null. A tell fires once
// (deterministic) regardless of how many times its pattern appears; the count
// that drives the verdict is the number of DISTINCT tells that fired.
// ---------------------------------------------------------------------------

// Strip CSS/JS block comments so tells inside comments (e.g. a fixture's own
// "/* tell: … */" note) never count as real code.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ");

const HEX_RE = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;
// Emoji: pictographic / symbol / dingbat ranges likely to be used as UI icons.
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F0FF}✅❌✨⭐❤️]/u;

// 1. Inter/Roboto/Arial in a DISPLAY context.
function tellDisplayFont(files) {
  const banned = ["inter", "roboto", "arial"];
  // Display-context signals: a font declaration on a heading selector, a var named
  // --font-display / --font-heading, or a Tailwind font-display utility.
  const evidence = [];
  for (const { path, text: raw } of files) {
    const text = stripComments(raw);
    const low = text.toLowerCase();
    // (a) A display/heading-named custom property assigned a banned font — the most
    //     common real pattern (--font-display: "Inter", …). Fires wherever it lives.
    for (const prop of ["--font-display", "--font-heading", "--display-font", "--heading-font"]) {
      const propRe = new RegExp(`${prop}\\s*:[^;]*`, "g");
      let pm;
      while ((pm = propRe.exec(low))) {
        if (banned.some((b) => new RegExp(`\\b${b}\\b`).test(pm[0]))) {
          evidence.push(`${basename(path)}: ${prop} = banned font`);
        }
      }
    }
    // (b) CSS rule whose selector references a heading/display, with a banned font literal
    //     in font-family (direct assignment, not via a variable).
    const ruleRe = /([^{}]*)\{([^{}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(text))) {
      const selector = m[1].toLowerCase();
      const body = m[2].toLowerCase();
      const isDisplayScope =
        /\b(h1|h2|h3)\b|\.(display|heading|hero|title)\b/.test(selector);
      if (isDisplayScope && /font-family\s*:/.test(body)) {
        if (banned.some((b) => new RegExp(`font-family\\s*:[^;]*\\b${b}\\b`).test(body))) {
          evidence.push(`${basename(path)}: ${selector.trim().slice(0, 40)}`);
        }
      }
    }
    // Tailwind: font-inter/font-roboto on a heading-ish class, or a display font var.
    if (/\bfont-(inter|roboto|arial)\b/.test(text.toLowerCase())) {
      evidence.push(`${basename(path)}: tailwind font-{inter|roboto|arial}`);
    }
  }
  return evidence.length ? { sample: evidence[0], count: evidence.length } : null;
}

// 2. AI-violet by OKLCH proximity (NOT hex equality).
function tellAiViolet(files) {
  const evidence = [];
  for (const { path, text: raw } of files) {
    const text = stripComments(raw);
    const seen = new Set();
    let m;
    HEX_RE.lastIndex = 0;
    while ((m = HEX_RE.exec(text))) {
      const hex = m[0];
      if (seen.has(hex.toLowerCase())) continue;
      seen.add(hex.toLowerCase());
      if (isAiViolet(hex)) evidence.push(`${basename(path)}: ${hex}`);
    }
  }
  return evidence.length ? { sample: evidence.slice(0, 3).join(", "), count: evidence.length } : null;
}

// 3. Emoji in UI markup (inside HTML text/attributes or JSX).
function tellEmojiIcons(files) {
  const evidence = [];
  for (const { path, text, ext } of files) {
    if (![".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte"].includes(ext)) continue;
    if (EMOJI_RE.test(text)) {
      const line = text.split(/\r?\n/).find((l) => EMOJI_RE.test(l)) || "";
      evidence.push(`${basename(path)}: ${line.trim().slice(0, 48)}`);
    }
  }
  return evidence.length ? { sample: evidence[0], count: evidence.length } : null;
}

// 4. Uniform border-radius >= 24px applied broadly (over-rounding).
function tellOverRounding(files) {
  const values = new Map(); // radius px -> count
  for (const { path, text } of files) {
    let m;
    const rRe = /border-radius\s*:\s*([0-9.]+)px/gi;
    while ((m = rRe.exec(text))) {
      const px = parseFloat(m[1]);
      if (px >= 24) values.set(px, (values.get(px) || 0) + 1);
    }
    // Tailwind rounded-2xl (16px) is common but rounded-3xl (24px) / rounded-[24px]+ counts.
    const twRe = /\brounded-(3xl|\[(\d+)px\])\b/gi;
    while ((m = twRe.exec(text))) {
      const px = m[2] ? parseFloat(m[2]) : 24;
      if (px >= 24) values.set(px, (values.get(px) || 0) + 1);
    }
  }
  // Fires when a single large radius value is used repeatedly (uniform over-rounding).
  for (const [px, n] of values) {
    if (n >= 3) return { sample: `${px}px x${n} (uniform over-rounding)`, count: n };
  }
  return null;
}

// 5. Identical 1px border repeated on every card.
function tellUniformCardBorder(files) {
  // Count distinct card-ish selectors/utilities that carry a 1px border.
  let borderedCards = 0;
  const samples = [];
  for (const { path, text: raw } of files) {
    const text = stripComments(raw);
    // CSS: a .card-like rule with border: 1px …
    const ruleRe = /([^{}]*)\{([^{}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(text))) {
      const sel = m[1].toLowerCase();
      const body = m[2].toLowerCase();
      if (/\.card|\.tile|\.panel|\.feature|\.box\b/.test(sel) && /border\s*:\s*1px\s+solid/.test(body)) {
        borderedCards++;
        if (samples.length < 2) samples.push(`${basename(path)}: ${sel.trim().slice(0, 30)}`);
      }
    }
    // Tailwind: repeated `border` on card containers with a gray border colour.
    const twCards = (text.match(/\bborder\b(?=[^"']*\b(rounded|shadow|p-6|p-8)\b)/g) || []).length;
    if (twCards >= 3) {
      borderedCards += twCards;
      if (samples.length < 2) samples.push(`${basename(path)}: tailwind border on ${twCards} card-ish blocks`);
    }
  }
  return borderedCards >= 3 ? { sample: samples[0] || `${borderedCards} 1px-bordered cards`, count: borderedCards } : null;
}

// 6. Canonical AI page sequence (hero -> cards -> pricing -> faq -> cta ...).
function tellCanonicalSequence(files) {
  const html = files.filter((f) => [".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte"].includes(f.ext));
  for (const { path, text } of html) {
    const t = text.toLowerCase();
    const markers = [
      /\bhero\b/.test(t),
      /(feature|card).{0,400}(feature|card).{0,400}(feature|card)/s.test(t) || (t.match(/\bcard\b/g) || []).length >= 3,
      /\bpricing\b/.test(t),
      /\bfaq\b|frequently asked/.test(t),
      /\b(cta|call.to.action|get started|sign up)\b/.test(t),
    ];
    const present = markers.filter(Boolean).length;
    if (present >= 4) {
      return { sample: `${basename(path)}: ${present}/5 canonical sections (hero/3-cards/pricing/faq/cta)`, count: present };
    }
  }
  return null;
}

// 7. Violet -> blue gradient.
function tellVioletBlueGradient(files) {
  const evidence = [];
  for (const { path, text: raw } of files) {
    const text = stripComments(raw);
    const gradRe = /(linear|radial|conic)-gradient\s*\(([^;{}]*)\)/gi;
    let m;
    while ((m = gradRe.exec(text))) {
      const inside = m[2];
      const hexes = inside.match(HEX_RE) || [];
      const hasViolet = hexes.some(isAiViolet);
      const hasBlue = hexes.some((h) => {
        const c = hexToOklch(h);
        return c && c.C >= 0.05 && c.h > 230 && c.h < 290; // blue-ish hue band in OKLCH
      });
      // Also catch named/tailwind from-violet…to-blue.
      const twGrad = /\bfrom-(violet|purple|indigo|fuchsia)-\d{3}\b[\s\S]{0,80}\bto-(blue|sky|cyan|indigo)-\d{3}\b/i.test(inside);
      if ((hasViolet && hasBlue) || twGrad) evidence.push(`${basename(path)}: ${inside.trim().slice(0, 48)}`);
    }
    // Tailwind gradient utilities outside gradient() syntax.
    if (/\bfrom-(violet|purple|indigo|fuchsia)-\d{3}\b/i.test(text) && /\bto-(blue|sky|cyan)-\d{3}\b/i.test(text)) {
      evidence.push(`${basename(path)}: tailwind from-violet…to-blue`);
    }
  }
  return evidence.length ? { sample: evidence[0], count: evidence.length } : null;
}

const DETECTORS = [
  ["display-font-inter-roboto-arial", "Inter/Roboto/Arial used in a display/heading context", tellDisplayFont],
  ["ai-violet", "Colour within OKLCH proximity of the AI-violet cluster (#6366f1/#8b5cf6/#a78bfa)", tellAiViolet],
  ["emoji-ui-icons", "Emoji used as UI icons in markup", tellEmojiIcons],
  ["uniform-over-rounding", "Uniform border-radius >= 24px repeated broadly", tellOverRounding],
  ["uniform-card-border", "Identical 1px border on every card", tellUniformCardBorder],
  ["canonical-page-sequence", "Canonical AI page sequence (hero -> 3 cards -> pricing -> FAQ -> CTA)", tellCanonicalSequence],
  ["violet-blue-gradient", "Violet -> blue gradient", tellVioletBlueGradient],
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function scan(paths) {
  const files = [];
  for (const p of paths) {
    for (const f of collectFiles(p)) {
      try {
        files.push({ path: f, ext: extname(f).toLowerCase(), text: readFileSync(f, "utf8") });
      } catch { /* unreadable — skip */ }
    }
  }
  const tells = [];
  for (const [id, desc, fn] of DETECTORS) {
    const hit = fn(files);
    if (hit) tells.push({ id, desc, sample: hit.sample, occurrences: hit.count });
  }
  return { fileCount: files.length, tells };
}

function verdictOf(n) {
  if (n <= 1) return { label: "clean", exit: 0 };
  if (n <= 3) return { label: "mild", exit: 0 };
  return { label: "heavy — mandatory direction redo", exit: 1 };
}

function report({ fileCount, tells }, { json }) {
  const n = tells.length;
  const v = verdictOf(n);
  if (json) {
    process.stdout.write(JSON.stringify({ fileCount, tellCount: n, verdict: v.label, tells }, null, 2) + "\n");
    return v.exit;
  }
  console.log(`slop-lint — scanned ${fileCount} file(s)`);
  if (tells.length === 0) {
    console.log("  no known tells found.");
  } else {
    for (const t of tells) {
      console.log(`  ✗ ${t.id} — ${t.desc}`);
      console.log(`      e.g. ${t.sample}${t.occurrences > 1 ? `  (x${t.occurrences})` : ""}`);
    }
  }
  console.log(`\n  ${n} distinct tell(s) → verdict: ${v.label.toUpperCase()}`);
  console.log("  (slop-lint is a NECESSARY, never SUFFICIENT condition — the distinctiveness");
  console.log("   verdict belongs to the independent design-forge AUDIT + swap-brand test.)");
  return v.exit;
}

// ---------------------------------------------------------------------------
// Selftest — runs against the bundled fixtures and asserts sloppy>=4, clean===0.
// ---------------------------------------------------------------------------

function selftest() {
  const here = dirname(fileURLToPath(import.meta.url));
  const fx = join(here, "__fixtures__");
  const sloppy = scan([join(fx, "sloppy.html")]);
  const clean = scan([join(fx, "clean.html")]);
  let ok = true;
  const line = (name, got, cond) => {
    const pass = cond;
    ok = ok && pass;
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}: ${got}`);
  };
  console.log("slop-lint --selftest");
  line("sloppy.html tell count >= 4", sloppy.tells.length, sloppy.tells.length >= 4);
  line("clean.html tell count === 0", clean.tells.length, clean.tells.length === 0);
  if (!ok) {
    console.log("\n  sloppy tells:", sloppy.tells.map((t) => t.id).join(", "));
    console.log("  clean tells: ", clean.tells.map((t) => t.id).join(", ") || "(none)");
  }
  return ok ? 0 : 1;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--selftest")) process.exit(selftest());
  const json = argv.includes("--json");
  const paths = argv.filter((a) => !a.startsWith("--"));
  if (paths.length === 0) {
    console.error("usage: node scripts/slop-lint.mjs <dir|file> [...]  |  --selftest  |  --json <dir>");
    process.exit(2);
  }
  process.exit(report(scan(paths), { json }));
}

main();
