/**
 * lot-checks.mjs — contrôles déterministes de la liste de checks d'un lot et du plafond
 * de budget d'un plan brief-chantier. Importé par preflight-lint.mjs.
 *
 * Forme machine d'un check, dans le bloc du lot :
 *   <ol class="list checks"><li data-check="1.1"><code class="check-cmd">bun test x</code></li></ol>
 * Le check passe quand la commande sort 0 : un id unique et la commande exacte.
 */

import { existsSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

export const BUDGET_MAX = 1000; // A1 : plafond ≤ 1 000 lignes

const VAGUE_LEAD = /^(?:run|lance[rz]?|ex[ée]cute[rz]?|check|v[ée]rifie[rz]?|verify|ensure|confirm(?:e|er)?|review|inspect(?:e|er)?|open|ouvre|see|voir|look|manual(?:ly)?|manuel(?:lement)?|visual(?:ly)?|visuel(?:lement)?|the|le|la|les|tests|all|tous|tout|aucune?|none|n\/a|tbd|todo)$/i;
const KNOWN = new Set(
  'bun bunx npm npx pnpm yarn node deno tsx python python3 pytest uv pip git gh grep egrep rg test make cargo go dotnet pac tsc vitest jest sh bash zsh cat ls diff cmp jq curl wc find sed awk head tail sort stat echo printf cd env time xargs'.split(' '),
);
const FILE_EXT = /\.(?:mjs|cjs|js|ts|tsx|jsx|py|sh|json)$/;
const NEW_MARK = /\((?:nouveau|nouveaux|new|to be created)\)|à créer|to be created/i;
const NUM = String.raw`(\d{1,3}(?:[  ,.'’]\d{3})+|\d+)`;
const BUDGET = new RegExp(String.raw`^[^\d/]{0,14}${NUM}[^\d/]{0,14}\/[^\d/]{0,14}${NUM}`);

/** Les checks d'un bloc de lot : { present, items: [{ id, codes, raw }] }. */
export function parseChecks(block) {
  const list = block.match(/<(ol|ul)\b[^>]*class="[^"]*\bchecks\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/i);
  if (!list) return { present: false, items: [] };
  const items = [...list[2].matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi)].map((m) => ({
    id: (m[1].match(/\bdata-check="([^"]*)"/)?.[1] ?? '').trim(),
    codes: [...m[2].matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/gi)].map((c) => c[1].trim()),
    raw: m[2],
  }));
  return { present: true, items };
}

/** Segments de commande (`&&` `||` `;` `|` retour ligne) en mots {text, quoted}. */
function segments(cmd) {
  const out = [[]];
  for (const [tok] of cmd.matchAll(/"[^"]*"|'[^']*'|&&|\|\||[;|\n]|[^\s"';|]+/g)) {
    if (/^(?:&&|\|\||[;|\n])$/.test(tok)) out.push([]);
    else out.at(-1).push({ text: tok.replace(/^["']|["']$/g, ''), quoted: /^["']/.test(tok) });
  }
  return out.map((seg) => seg.filter((w) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(w.text))).filter((seg) => seg.length);
}

/** Message d'erreur si la commande est vague ou ne peut pas échouer, sinon null. */
export function vagueReason(cmd) {
  if (!cmd.trim()) return 'commande vide';
  if (/<[A-Za-zÀ-ÿ][^<>\n]{0,40}>/.test(cmd)) return 'placeholder non rempli dans la commande';
  if (/(?:\|\||;)\s*(?:true|:|exit\s+0)\s*$/.test(cmd.trim())) return '« || true » masque le code retour : le check ne pourrait pas échouer';
  const words = (segments(cmd)[0] ?? []).map((w) => w.text);
  const first = words[0] ?? '';
  if (VAGUE_LEAD.test(first)) return `« ${first} … » est une consigne, pas une commande`;
  const pathLike = /[/\\]/.test(first) || first.startsWith('.');
  if (!pathLike && !KNOWN.has(first) && words.length >= 3 && !/[/\\.=|&;<>$()"'`:-]/.test(words.join(' '))) {
    return 'phrase, pas une commande lançable telle quelle';
  }
  return null;
}

/**
 * Références du check absentes du repo cible : retourne la liste des messages.
 * `touched` = texte des « Fichiers touchés » du lot et des lots précédents (fichiers que le plan crée).
 */
export function missingRefs(cmd, repoRoot, { touched = '', allowNew = false, scripts = {} } = {}) {
  const errs = [];
  const base = (p) => p.replace(/^\.\//, '');
  let cwd = repoRoot;
  for (const words of segments(cmd)) {
    const [head, ...rest] = words;
    if (head.text === 'cd' && rest[0] && !/[$~*]/.test(rest[0].text)) {
      cwd = isAbsolute(rest[0].text) ? rest[0].text : resolve(cwd, rest[0].text);
      continue;
    }
    if (head.text === 'npm' && /^(?:test|t|start|stop|restart)$/.test(rest[0]?.text ?? '')) {
      const name = rest[0].text === 't' ? 'test' : rest[0].text;
      if (Object.keys(scripts).length && !(name in scripts)) errs.push(`« npm ${rest[0].text} » : script « ${name} » absent de package.json`);
    }
    for (const [i, word] of words.entries()) {
      const t = word.text;
      if (/^\d*[<>]/.test(t)) break; // redirection : le reste n'est plus une référence
      const candidate = i === 0 ? /^\.{0,2}\//.test(t) : !word.quoted && FILE_EXT.test(t);
      if (!candidate || t.startsWith('-') || /[$*?{}[\]:@~]/.test(t) || t.includes('/.worktrees/')) continue;
      const abs = isAbsolute(t) ? t : join(cwd, t);
      if ((isAbsolute(t) && !abs.startsWith(`${repoRoot}/`)) || existsSync(abs)) continue;
      if (allowNew || touched.includes(base(relative(repoRoot, abs))) || touched.includes(base(t))) continue;
      errs.push(`« ${t} » introuvable dans le repo cible, ni dans les « Fichiers touchés » du lot ou d'un lot précédent`);
    }
  }
  return [...new Set(errs)];
}

/** Le check porte un marqueur « (nouveau) » hors de sa commande : ses fichiers seront créés. */
export const isNewMarked = (raw) => NEW_MARK.test(raw.replace(/<code\b[\s\S]*?<\/code>/gi, ' '));

/** Valeur de « Budget total : <cible> / <plafond> » : { error } ou { cible, plafond }. Absent : error null. */
export function checkBudget(visible, labelRe) {
  const m = visible.match(labelRe);
  if (!m) return { error: null };
  const nums = visible.slice(m.index + m[0].length, m.index + m[0].length + 60).match(BUDGET);
  if (!nums) return { error: 'Budget total : forme attendue « <cible> / <plafond> » avec deux nombres (A1).' };
  const [cible, plafond] = [nums[1], nums[2]].map((n) => Number(n.replace(/\D/g, '')));
  if (plafond > BUDGET_MAX) return { error: `Budget total : plafond ${plafond} > ${BUDGET_MAX} lignes (A1) : découper le chantier.` };
  if (cible < 1 || cible > plafond) return { error: `Budget total : cible ${cible} hors de 1..plafond ${plafond} (A1).` };
  return { cible, plafond, error: null };
}
