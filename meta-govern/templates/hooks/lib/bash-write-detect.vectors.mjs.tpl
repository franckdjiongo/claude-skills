// Template: templates/hooks/lib/bash-write-detect.vectors.mjs.tpl
// Aucune variable de template : ce fichier est une lib PURE, rendu = copie.
//
// Sibling extraction of ./bash-write-detect.mjs (file-size-budget dot-notation
// — the orchestrator crossed the 300-line cap once install/dd/rsync/ln/
// truncate and the shell-wrapper unwrap were added). This module owns the
// per-command vector table: given the tokens of ONE shell segment, decide
// which token is a write target and under what vector name.
//
// Circular import ASSUMED with ./bash-write-detect.mjs: `fromCommand` here
// calls back into `detectWriteTargets` (for the shell-wrapper unwrap) and
// `bash-write-detect.mjs`'s `detectWriteTargets` calls `fromCommand` here.
// Both usages happen INSIDE function bodies, never at module-evaluation
// time, so the cycle is safe (standard ESM live-binding pattern).
import { isFlag, isNullSink, MAX_WRAP_DEPTH, detectWriteTargets } from './bash-write-detect.mjs';

// Extrait le premier chemin d'un writeFileSync/appendFileSync/createWriteStream
// (ou writeFile) dans un fragment de code Node inline.
function nodeWritePath(code) {
  const m = /(?:writeFileSync|appendFileSync|createWriteStream|writeFile)\s*\(\s*(['"])([^'"]+)\1/.exec(code);
  return m ? m[2] : null;
}

// Extrait le chemin d'un open(path, "w"|"a"…) en mode écriture dans un
// fragment de code Python inline.
function pythonWritePath(code) {
  const m = /open\s*\(\s*(['"])([^'"]+)\1\s*,\s*['"][wa]/.exec(code);
  return m ? m[2] : null;
}

// Enveloppes shell dont l'argument `-c`/`-lc`/`-ic`… porte une commande
// INLINE à analyser récursivement (c'est le seul moyen de voir au travers du
// guillemet qui, sinon, rend le `>` interne invisible à `fromRedirects` — cf.
// contrat en tête de bash-write-detect.mjs). `MAX_WRAP_DEPTH` borne la
// récursion pour ne jamais boucler sur une enveloppe auto-imbriquée
// (`bash -c 'bash -c "…"'`).
const SHELL_WRAPPERS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
const isDashCFlag = (a) => /^-[A-Za-z]*c$/.test(a);

// Vecteurs couverts ici (best-effort, un seul niveau de lecture d'options) :
//   tee · sed -i · perl -i · node -e/--eval (writeFileSync/appendFileSync/
//   createWriteStream) · python(3) -c (open(…, 'w'|'a')) · cp · mv · touch ·
//   install (dernier argument non-flag = cible) · dd (of=…) · rsync · ln
//   (dernier argument non-flag = cible) · truncate (idem) · git add
//   -A/--all/. · enveloppes bash/sh/zsh/dash/ksh -c[flags] (récursion sur le
//   code interne).
// Vecteurs volontairement HORS PÉRIMÈTRE (retour [] silencieux, jamais bloqués
// par ce garde) : curl -o/-O, wget -O, tar -O/-C, awk/printf pilotés par un
// flag générique `-o`/`--output` (sémantique trop variable d'un outil à
// l'autre pour un heuristique sûr), xargs, split - (préfixe dynamique
// multi-fichiers), et tout interpréteur inline hors node/python (ruby -e,
// perl sans -i…).
export function fromCommand(tokens, out, depth) {
  if (tokens.length === 0) return;
  // Ignore d'éventuelles assignations d'env en tête (`FOO=bar cmd …`).
  let i = 0;
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++;
  const cmd = tokens[i];
  const args = tokens.slice(i + 1);
  if (!cmd) return;
  const base = cmd.split('/').pop();

  if (SHELL_WRAPPERS.has(base)) {
    const idx = args.findIndex(isDashCFlag);
    if (idx !== -1 && typeof args[idx + 1] === 'string' && depth < MAX_WRAP_DEPTH) {
      out.push(...detectWriteTargets(args[idx + 1], depth + 1));
    }
    return;
  }
  if (base === 'install') {
    const files = args.filter((a) => !isFlag(a));
    const dest = files.pop();
    if (dest && !isNullSink(dest)) out.push({ path: dest, vector: 'install' });
    return;
  }
  if (base === 'dd') {
    for (const a of args) {
      const m = /^of=(.+)$/.exec(a);
      if (m && !isNullSink(m[1])) out.push({ path: m[1], vector: 'dd' });
    }
    return;
  }
  if (base === 'rsync' || base === 'ln' || base === 'truncate') {
    const files = args.filter((a) => !isFlag(a));
    const dest = files.pop();
    if (dest && !isNullSink(dest)) out.push({ path: dest, vector: base });
    return;
  }

  if (base === 'tee') {
    for (const a of args) {
      if (isFlag(a)) continue;
      if (!isNullSink(a)) out.push({ path: a, vector: 'tee' });
    }
    return;
  }
  if (base === 'sed' && args.some((a) => a === '-i' || a.startsWith('-i') || a === '--in-place')) {
    const file = args.filter((a) => !isFlag(a)).pop();
    if (file && !isNullSink(file)) out.push({ path: file, vector: 'sed-i' });
    return;
  }
  if (base === 'perl' && args.some((a) => a === '-i' || a.startsWith('-i'))) {
    const file = args.filter((a) => !isFlag(a)).pop();
    if (file && !isNullSink(file)) out.push({ path: file, vector: 'perl-i' });
    return;
  }
  if (base === 'node') {
    const idx = args.findIndex((a) => a === '-e' || a === '--eval');
    if (idx !== -1 && args[idx + 1]) {
      const p = nodeWritePath(args[idx + 1]);
      if (p && !isNullSink(p)) out.push({ path: p, vector: 'node-e' });
    }
    return;
  }
  if (base === 'python' || base === 'python3') {
    const idx = args.findIndex((a) => a === '-c');
    if (idx !== -1 && args[idx + 1]) {
      const p = pythonWritePath(args[idx + 1]);
      if (p && !isNullSink(p)) out.push({ path: p, vector: 'python-c' });
    }
    return;
  }
  if (base === 'cp' || base === 'mv') {
    const files = args.filter((a) => !isFlag(a));
    const dest = files.pop();
    if (dest && !isNullSink(dest)) out.push({ path: dest, vector: base });
    return;
  }
  if (base === 'touch') {
    for (const a of args) {
      if (isFlag(a)) continue;
      if (!isNullSink(a)) out.push({ path: a, vector: 'touch' });
    }
    return;
  }
  if (base === 'git' && args[0] === 'add') {
    const rest = args.slice(1);
    if (rest.some((a) => a === '-A' || a === '--all' || a === '.')) {
      out.push({ path: '.', vector: 'git-add-all' });
    }
    return;
  }
}
