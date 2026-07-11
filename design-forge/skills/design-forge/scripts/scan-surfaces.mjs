#!/usr/bin/env node
/**
 * scan-surfaces.mjs — deterministic surface inventory for a target project.
 *
 * "Script pour compter, modèle pour juger" : this script COUNTS the surfaces
 * (screens/routes/components) an audit must cover; the model judges them.
 * Its JSON output is the coverage manifest that design-forge Phase 1 (TEST
 * mode) starts from and that check-report.mjs / check-ledger.mjs verify
 * against.
 *
 * Usage:   node scan-surfaces.mjs <project-root>
 * Output:  JSON on stdout:
 *   {
 *     generatedAt, projectRoot, framework,
 *     surfaces: [{ route?, file, kind: "screen"|"component"|"list"|"form",
 *                  interactive: { forms, textareas, dialogs, buttons },
 *                  dataDriven: bool }],
 *     warnings: []
 *   }
 * Exit:    0 on success (even framework:"unknown" — that is a warning, never
 *          a silent failure); 2 on usage/IO error.
 *
 * Zero dependencies. Node >= 18, macOS/Linux.
 *
 * Canonical copy: design-forge/skills/design-forge/scripts/scan-surfaces.mjs.
 * A verbatim mirror ships in ship-polished-ui/scripts/ (design-studio plugin) —
 * the two plugins install independently, so no cross-plugin import. Keep both
 * byte-identical when editing (verify with diff).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out", "coverage", ".next",
  ".nuxt", ".output", ".turbo", ".vercel", ".cache", "vendor", ".svelte-kit",
]);
const SOURCE_EXTS = new Set([".tsx", ".jsx", ".ts", ".js", ".mjs", ".cjs", ".vue", ".html"]);
const RESOLVE_EXTS = [".tsx", ".jsx", ".ts", ".js", ".mjs", ".cjs", ".vue"];
const MAX_FILES = 20000;
// Auth plumbing, not user-facing surfaces — excluded with an explicit warning.
const TECHNICAL_ROUTE = /^\/?(?:auth\/)?(?:callback|oauth(?:-[\w-]+)?|logout|signout|silent-renew)\/?$/i;

const warnings = [];

function fail(msg) {
  process.stderr.write(`scan-surfaces: ${msg}\n`);
  process.exit(2);
}

async function walk(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      warnings.push(`Dossier illisible ignoré : ${path.relative(root, dir)} (${e.code ?? e.message})`);
      continue;
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name) && !e.name.startsWith(".")) stack.push(path.join(dir, e.name));
        continue;
      }
      if (!e.isFile()) continue;
      if (!SOURCE_EXTS.has(path.extname(e.name))) continue;
      files.push(path.join(dir, e.name));
      if (files.length >= MAX_FILES) {
        warnings.push(`Inventaire tronqué à ${MAX_FILES} fichiers — projet anormalement grand.`);
        return files;
      }
    }
  }
  return files.sort();
}

async function readText(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch (e) {
    warnings.push(`Fichier illisible : ${file} (${e.code ?? e.message})`);
    return "";
  }
}

function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

function analyzeContent(text, ext) {
  const interactive = {
    forms: countMatches(text, /<form[\s>]/gi),
    textareas: countMatches(text, /<textarea[\s>]/gi),
    dialogs:
      countMatches(text, /<dialog[\s>]/gi) +
      countMatches(text, /role=["']dialog["']/gi) +
      countMatches(text, /aria-modal/gi),
    buttons: countMatches(text, /<button\b/gi) + countMatches(text, /role=["']button["']/gi),
  };
  // Data-driven: a .map() callback that returns JSX, or Vue's v-for.
  const dataDriven =
    ext === ".vue"
      ? /v-for=/.test(text)
      : /\.map\s*\(\s*(?:\([^)]*\)|[\w$]+)\s*=>\s*\(?\s*</.test(text);
  return { interactive, dataDriven };
}

function classifyKind(route, ext, interactive, dataDriven) {
  if (route !== undefined || ext === ".html") return "screen";
  if (interactive.forms > 0) return "form";
  if (dataDriven) return "list";
  return "component";
}

// --- import resolution -------------------------------------------------------

function parseImports(text) {
  const map = new Map(); // localName -> module spec
  const patterns = [
    /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g, // named
    /import\s+([\w$]+)\s*(?:,\s*\{[^}]*\})?\s*from\s*["']([^"']+)["']/g, // default
    /(?:const|let|var)\s+([\w$]+)\s*=\s*(?:React\.)?lazy\s*\(\s*\(\)\s*=>\s*import\s*\(\s*["']([^"']+)["']\s*\)/g, // lazy
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      if (re === patterns[0]) {
        for (const part of m[1].split(",")) {
          const name = part.split(/\s+as\s+/).pop().trim();
          if (name) map.set(name, m[2]);
        }
      } else {
        map.set(m[1], m[2]);
      }
    }
  }
  return map;
}

async function resolveModule(spec, fromFile, root) {
  if (!spec.startsWith(".") && !spec.startsWith("/") && !spec.startsWith("@/")) return null; // bare package
  const base = spec.startsWith("@/")
    ? path.join(root, "src", spec.slice(2))
    : path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, ...RESOLVE_EXTS.map((e) => base + e), ...RESOLVE_EXTS.map((e) => path.join(base, "index" + e))];
  for (const c of candidates) {
    try {
      const st = await fs.stat(c);
      if (st.isFile()) return c;
    } catch { /* keep trying */ }
  }
  return null;
}

// --- framework detection -----------------------------------------------------

async function detectFramework(root, files, contents) {
  let deps = {};
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
    deps = { ...pkg.dependencies, ...pkg.devDependencies };
  } catch { /* monorepo or non-npm project: fall back to content sniffing */ }

  const hasNextConfig = files.some((f) => /(^|\/)next\.config\.(js|mjs|ts)$/.test(f));
  if (deps.next || hasNextConfig) return "next";

  const jsxRoute = files.filter((f) => /<Route\b[^>]*path\s*=/.test(contents.get(f) ?? ""));
  const objRouter = files.filter((f) =>
    /create(Browser|Hash|Memory)Router\s*\(|useRoutes\s*\(/.test(contents.get(f) ?? ""));
  if (deps["react-router-dom"] || deps["react-router"] || jsxRoute.length || objRouter.length)
    return "react-router";

  const vueRouterFiles = files.filter((f) => /createRouter\s*\(/.test(contents.get(f) ?? ""));
  if (deps["vue-router"] || vueRouterFiles.length) return "vue-router";

  return "unknown";
}

// --- per-framework surface extraction ---------------------------------------

// Transitive closure of relative imports, capped — a screen's composer/list
// usually lives in sibling subcomponents, so counting only the entry file
// under-reports the rendered surface.
async function collectClosure(entry, root, cap = 60) {
  const seen = new Set([entry]);
  const queue = [entry];
  while (queue.length && seen.size < cap) {
    const f = queue.shift();
    for (const spec of parseImports(await readText(f)).values()) {
      const t = await resolveModule(spec, f, root);
      if (t && RESOLVE_EXTS.includes(path.extname(t)) && !seen.has(t)) {
        seen.add(t);
        queue.push(t);
      }
    }
  }
  return [...seen];
}

async function buildSurface(root, absFile, route, { aggregate = false } = {}) {
  const ext = path.extname(absFile);
  const files = aggregate ? await collectClosure(absFile, root) : [absFile];
  const interactive = { forms: 0, textareas: 0, dialogs: 0, buttons: 0 };
  let dataDriven = false;
  for (const f of files) {
    const a = analyzeContent(await readText(f), path.extname(f));
    for (const k of Object.keys(interactive)) interactive[k] += a.interactive[k];
    dataDriven ||= a.dataDriven;
  }
  const surface = {
    file: path.relative(root, absFile).split(path.sep).join("/"),
    kind: classifyKind(route, ext, interactive, dataDriven),
    interactive,
    dataDriven,
  };
  if (route !== undefined) surface.route = route;
  return surface;
}

function extractJsxRoutes(text) {
  // Each <Route …> tag; pathless tags are layout wrappers, not surfaces.
  const routes = [];
  for (const tag of text.matchAll(/<Route\b[^>]*>/g)) {
    const t = tag[0];
    const pathM = t.match(/\bpath\s*=\s*(?:["']([^"']+)["']|\{\s*["'`]([^"'`]+)["'`]\s*\})/);
    if (!pathM) continue;
    const elemM =
      t.match(/\belement\s*=\s*\{\s*<\s*([\w$.]+)/) ?? t.match(/\bComponent\s*=\s*\{\s*([\w$.]+)/);
    routes.push({ path: pathM[1] ?? pathM[2], component: elemM ? elemM[1].split(".")[0] : null });
  }
  return routes;
}

function extractObjectRoutes(text) {
  // { path: '/x', component: X } / { path: '/x', element: <X/> } (react-router
  // object form and vue-router share this shape).
  const routes = [];
  for (const m of text.matchAll(
    /\{\s*path\s*:\s*["'`]([^"'`]+)["'`]\s*,([^{}]*(?:\{[^{}]*\}[^{}]*)*)/g,
  )) {
    const body = m[2];
    let component = null;
    let importSpec = null;
    const dyn = body.match(/component\s*:\s*\(\)\s*=>\s*import\s*\(\s*["']([^"']+)["']\s*\)/);
    const named = body.match(/component\s*:\s*([\w$]+)/);
    const elem = body.match(/element\s*:\s*<\s*([\w$.]+)/);
    if (dyn) importSpec = dyn[1];
    else if (named) component = named[1];
    else if (elem) component = elem[1].split(".")[0];
    routes.push({ path: m[1], component, importSpec });
  }
  return routes;
}

async function surfacesFromRouteList(root, routerFile, text, routes) {
  const imports = parseImports(text);
  const out = [];
  for (const r of routes) {
    if (TECHNICAL_ROUTE.test(r.path)) {
      warnings.push(`Route technique exclue des surfaces : ${r.path} (${path.relative(root, routerFile)})`);
      continue;
    }
    let target = null;
    if (r.importSpec) target = await resolveModule(r.importSpec, routerFile, root);
    if (!target && r.component && imports.has(r.component))
      target = await resolveModule(imports.get(r.component), routerFile, root);
    if (!target) {
      warnings.push(
        `Composant de la route ${r.path} non résolu — surface rattachée au fichier de routes ${path.relative(root, routerFile)}.`,
      );
      target = routerFile;
    }
    out.push(await buildSurface(root, target, r.path, { aggregate: target !== routerFile }));
  }
  return out;
}

async function scanReactRouter(root, files, contents) {
  const out = [];
  for (const f of files) {
    const text = contents.get(f) ?? "";
    const jsx = extractJsxRoutes(text);
    if (jsx.length) out.push(...(await surfacesFromRouteList(root, f, text, jsx)));
    else if (/create(Browser|Hash|Memory)Router\s*\(|useRoutes\s*\(/.test(text)) {
      const obj = extractObjectRoutes(text);
      if (obj.length) out.push(...(await surfacesFromRouteList(root, f, text, obj)));
    }
  }
  if (!out.length) warnings.push("react-router détecté mais aucune <Route path=…> extraite.");
  return out;
}

async function scanNext(root, files) {
  const out = [];
  for (const f of files) {
    const rel = path.relative(root, f).split(path.sep).join("/");
    // App router: app/**/page.ext — strip (groups), keep [params].
    let m = rel.match(/^(?:src\/)?app\/(.*?)page\.(tsx|jsx|ts|js|mdx)$/);
    if (m) {
      const segs = m[1].split("/").filter((s) => s && !/^\(.*\)$/.test(s) && !/^@/.test(s));
      out.push(await buildSurface(root, f, "/" + segs.join("/"), { aggregate: true }));
      continue;
    }
    // Pages router: pages/**/*.ext minus _app/_document/api.
    m = rel.match(/^(?:src\/)?pages\/(.+)\.(tsx|jsx|ts|js|mdx)$/);
    if (m && !m[1].startsWith("_") && !m[1].startsWith("api/")) {
      const route = "/" + m[1].replace(/(^|\/)index$/, "").replace(/\/$/, "");
      out.push(await buildSurface(root, f, route === "" ? "/" : route, { aggregate: true }));
    }
  }
  if (!out.length) warnings.push("Next.js détecté mais aucun fichier de page trouvé sous app/ ou pages/.");
  return out;
}

async function scanVueRouter(root, files, contents) {
  const out = [];
  for (const f of files) {
    const text = contents.get(f) ?? "";
    if (!/createRouter\s*\(|vue-router/.test(text)) continue;
    const routes = extractObjectRoutes(text);
    if (routes.length) out.push(...(await surfacesFromRouteList(root, f, text, routes)));
  }
  if (!out.length) warnings.push("vue-router détecté mais aucune route {path: …} extraite.");
  return out;
}

async function scanFallback(root, files, contents) {
  const out = [];
  for (const f of files) {
    const ext = path.extname(f);
    if (ext === ".html") {
      out.push(await buildSurface(root, f, undefined));
      continue;
    }
    if (![".tsx", ".jsx", ".vue"].includes(ext)) continue;
    const text = contents.get(f) ?? "";
    const exported = ext === ".vue" || /export\s+(default|(const|function|class)\s+[A-Z])/.test(text);
    if (exported) out.push(await buildSurface(root, f, undefined));
  }
  return out;
}

// --- main --------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];
  if (!arg) fail("usage: node scan-surfaces.mjs <project-root>");
  const root = path.resolve(arg);
  try {
    const st = await fs.stat(root);
    if (!st.isDirectory()) fail(`pas un dossier : ${root}`);
  } catch {
    fail(`dossier introuvable : ${root}`);
  }

  const files = await walk(root);
  const contents = new Map();
  for (const f of files) contents.set(f, await readText(f));

  const framework = await detectFramework(root, files, contents);
  let surfaces = [];
  if (framework === "next") surfaces = await scanNext(root, files);
  else if (framework === "react-router") surfaces = await scanReactRouter(root, files, contents);
  else if (framework === "vue-router") surfaces = await scanVueRouter(root, files, contents);
  else {
    warnings.push(
      "Framework non reconnu — repli sur l'inventaire brut (*.html + composants exportés). " +
        "La couverture réelle peut différer : vérifier manuellement la liste des écrans.",
    );
    surfaces = await scanFallback(root, files, contents);
  }

  // Recognized-framework runs: root *.html are the SPA shell / dev mockups,
  // not routed surfaces — list them in a warning so they are never silently
  // dropped, but keep the manifest to what the router actually serves.
  if (framework !== "unknown") {
    const rootHtml = files
      .filter((f) => path.extname(f) === ".html" && !path.relative(root, f).includes(path.sep))
      .map((f) => path.basename(f));
    if (rootHtml.length)
      warnings.push(
        `Fichiers HTML racine hors routeur (shell/mockups probables), non comptés comme surfaces : ${rootHtml.join(", ")}`,
      );
  }

  // Deterministic order + dedup by (route, file).
  const seen = new Set();
  surfaces = surfaces
    .filter((s) => {
      const k = `${s.route ?? ""} ${s.file}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.route ?? "~").localeCompare(b.route ?? "~") || a.file.localeCompare(b.file));

  if (!surfaces.length) warnings.push("Aucune surface détectée — manifeste vide, à traiter comme un gap explicite.");

  process.stdout.write(
    JSON.stringify(
      { generatedAt: new Date().toISOString(), projectRoot: root, framework, surfaces, warnings },
      null,
      2,
    ) + "\n",
  );
}

main().catch((e) => fail(e.stack ?? String(e)));
