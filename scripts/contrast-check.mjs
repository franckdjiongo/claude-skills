#!/usr/bin/env node
// contrast-check.mjs — WCAG 2.x contrast-ratio calculator (Node stdlib only, zero deps).
//
// Purpose: never ESTIMATE contrast ("stays legible" by eye). Calculate it.
// Used by ship-polished-ui (visual-qa-checklist Section 12 a11y gate) and
// brand-forge (palette gate). The mathematical core is the A4 annex snippet of
// plans/2026-07-04-plan-ecosysteme-design-v2.html — copied verbatim, not regenerated.
//
// WCAG AA gate (blocking):  >= 4.5:1 body text  ·  >= 3:1 large text (>=24px, or >=19px bold)
// APCA (Lc >= 75 body) is a complementary perceptual compass, NOT computed here —
// WCAG AA remains the blocking gate; see the skill for the APCA note.
//
// USAGE
//   node scripts/contrast-check.mjs <fg> <bg> [<fg2> <bg2> ...]
//   node scripts/contrast-check.mjs "#0a0a0f" "#f5f5f0"        # one pair
//   node scripts/contrast-check.mjs 0a0a0f f5f5f0 fff 000      # '#' optional, short-hex OK
//   node scripts/contrast-check.mjs --selftest                 # built-in cases, exit 0/1
//   node scripts/contrast-check.mjs --json <fg> <bg> ...       # machine-readable output
//
// Each remaining arg after flags is one hex color; colors are consumed in
// foreground/background PAIRS. Exit code: 0 if every pair passes the AA body
// gate (or in --json/default report mode, 0 = ran OK; the verdict per pair is
// in the output). --selftest exits 1 on any internal mismatch.

// ---- input normalization + validation -------------------------------------
// Accepts: "#abc", "abc", "#aabbcc", "aabbcc" (case-insensitive). Throws otherwise.
const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(input) {
  if (typeof input !== "string") {
    throw new TypeError(`hex color must be a string, got ${typeof input}`);
  }
  const trimmed = input.trim();
  if (!HEX_RE.test(trimmed)) {
    throw new Error(
      `invalid hex color: ${JSON.stringify(input)} — expected #RGB, #RRGGBB, or the same without '#'`
    );
  }
  let hex = trimmed.replace(/^#/, "").toLowerCase();
  if (hex.length === 3) {
    // short-hex #abc -> #aabbcc
    hex = hex.split("").map((c) => c + c).join("");
  }
  return "#" + hex;
}

// ---- mathematical core (A4 annex, verbatim) -------------------------------
// Relative luminance per WCAG 2.x. Input must be a normalized "#rrggbb".
const lum = (h) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}; // seuils : >=4.5 corps · >=3 texte large >=24px/19px bold

// ---- public API: normalize, then measure ----------------------------------
function contrastRatio(fg, bg) {
  return ratio(normalizeHex(fg), normalizeHex(bg));
}

const AA_BODY = 4.5;
const AA_LARGE = 3.0;

function verdict(r) {
  return {
    ratio: r,
    body: r >= AA_BODY, // AA normal text
    large: r >= AA_LARGE, // AA large text (>=24px, or >=19px bold)
  };
}

// ---- CLI -------------------------------------------------------------------
function round2(n) {
  return Math.round(n * 100) / 100;
}

function reportPairs(colors, { json } = {}) {
  if (colors.length === 0 || colors.length % 2 !== 0) {
    throw new Error(
      `expected an even number of colors (fg bg pairs), got ${colors.length}: ${colors.join(" ")}`
    );
  }
  const rows = [];
  let allBodyPass = true;
  for (let i = 0; i < colors.length; i += 2) {
    const fg = colors[i];
    const bg = colors[i + 1];
    const r = round2(contrastRatio(fg, bg));
    const v = verdict(r);
    if (!v.body) allBodyPass = false;
    rows.push({
      fg: normalizeHex(fg),
      bg: normalizeHex(bg),
      ratio: r,
      aa_body: v.body ? "PASS" : "FAIL",
      aa_large: v.large ? "PASS" : "FAIL",
    });
  }
  if (json) {
    process.stdout.write(JSON.stringify({ pairs: rows, allBodyPass }, null, 2) + "\n");
  } else {
    for (const row of rows) {
      const bodyMark = row.aa_body === "PASS" ? "✓" : "✗";
      const largeMark = row.aa_large === "PASS" ? "✓" : "✗";
      process.stdout.write(
        `${row.fg} on ${row.bg}  ${String(row.ratio).padStart(6)}:1  ` +
          `body(4.5) ${bodyMark} ${row.aa_body}  large(3.0) ${largeMark} ${row.aa_large}\n`
      );
    }
    process.stdout.write(
      allBodyPass
        ? "\nAll pairs PASS the AA body gate (>=4.5:1).\n"
        : "\nAt least one pair FAILS the AA body gate (>=4.5:1) — blocking.\n"
    );
  }
  return allBodyPass;
}

// ---- self-test -------------------------------------------------------------
// Known-value cases, verified internally (no external comparison needed).
function selftest() {
  const cases = [];
  const approx = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
  const check = (name, cond, detail) => {
    cases.push({ name, ok: !!cond, detail });
  };

  // 1. Pure black on pure white = 21:1 (the canonical maximum).
  check("#000/#fff = 21:1", approx(contrastRatio("#000000", "#ffffff"), 21), () =>
    contrastRatio("#000000", "#ffffff")
  );
  // 1b. Order-independent: white on black is identical.
  check("order-independent 21:1", approx(contrastRatio("#ffffff", "#000000"), 21), () =>
    contrastRatio("#ffffff", "#000000")
  );
  // 2. Short-hex #abc normalizes to #aabbcc and matches the long form.
  check(
    "short-hex #abc == #aabbcc",
    approx(contrastRatio("#abc", "#def"), contrastRatio("#aabbcc", "#ddeeff")),
    () => `${contrastRatio("#abc", "#def")} vs ${contrastRatio("#aabbcc", "#ddeeff")}`
  );
  // 3. Input without '#' is accepted and equals the '#'-prefixed form.
  check("no-hash 000/fff == 21:1", approx(contrastRatio("000", "fff"), 21), () =>
    contrastRatio("000", "fff")
  );
  // 3b. 6-digit no-hash also works.
  check("no-hash 6-digit", approx(contrastRatio("0a0a0f", "0a0a0f"), 1), () =>
    contrastRatio("0a0a0f", "0a0a0f")
  );
  // 4. Identical colors = 1:1 (the minimum).
  check("identical = 1:1", approx(contrastRatio("#123456", "#123456"), 1), () =>
    contrastRatio("#123456", "#123456")
  );
  // 5. Mid-gray #767676 on white ~= 4.54:1 (WCAG textbook AA-body threshold).
  check("#767676/#fff ~= 4.54:1", approx(contrastRatio("767676", "ffffff"), 4.54, 0.03), () =>
    contrastRatio("767676", "ffffff")
  );
  // 6. Verdict thresholds: 4.5 boundary passes body, 3.0 boundary passes large only.
  check("verdict at 4.5 passes body", verdict(4.5).body === true, () => 4.5);
  check("verdict at 3.0 fails body, passes large", verdict(3.0).body === false && verdict(3.0).large === true, () => 3.0);
  // 7. Invalid input throws (bad chars, wrong length, non-string).
  const throws = (fn) => {
    try {
      fn();
      return false;
    } catch {
      return true;
    }
  };
  check("throws on 'xyz'", throws(() => normalizeHex("xyz")));
  check("throws on '#12'", throws(() => normalizeHex("#12")));
  check("throws on '#12345'", throws(() => normalizeHex("#12345")));
  check("throws on '#zzzzzz'", throws(() => normalizeHex("#zzzzzz")));
  check("throws on empty string", throws(() => normalizeHex("")));
  check("throws on non-string", throws(() => normalizeHex(42)));

  let failed = 0;
  for (const c of cases) {
    const status = c.ok ? "ok  " : "FAIL";
    let extra = "";
    if (!c.ok && typeof c.detail === "function") {
      try {
        extra = ` (got ${JSON.stringify(c.detail())})`;
      } catch (e) {
        extra = ` (detail threw: ${e.message})`;
      }
    }
    process.stdout.write(`  ${status}  ${c.name}${extra}\n`);
    if (!c.ok) failed++;
  }
  process.stdout.write(
    `\nselftest: ${cases.length - failed}/${cases.length} passed\n`
  );
  return failed === 0;
}

// ---- entrypoint ------------------------------------------------------------
function main(argv) {
  const args = argv.slice(2);
  if (args.includes("--selftest")) {
    const ok = selftest();
    process.exit(ok ? 0 : 1);
  }
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    process.stdout.write(
      [
        "contrast-check.mjs — WCAG contrast-ratio calculator (stdlib only)",
        "",
        "  node scripts/contrast-check.mjs <fg> <bg> [<fg2> <bg2> ...]",
        "  node scripts/contrast-check.mjs --json <fg> <bg> ...",
        "  node scripts/contrast-check.mjs --selftest",
        "",
        "Colors: #RGB, #RRGGBB, or the same without '#'. Consumed in fg/bg pairs.",
        "AA gate: >=4.5:1 body · >=3:1 large. Exit 0 when all pairs pass body.",
        "",
      ].join("\n")
    );
    process.exit(args.length === 0 ? 1 : 0);
  }
  const json = args.includes("--json");
  const colors = args.filter((a) => !a.startsWith("--"));
  try {
    const allPass = reportPairs(colors, { json });
    process.exit(allPass ? 0 : 1);
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    process.exit(2);
  }
}

main(process.argv);

export { normalizeHex, contrastRatio, verdict, ratio, lum };
