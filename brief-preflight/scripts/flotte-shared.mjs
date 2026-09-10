/**
 * flotte-shared.mjs — lecture de la section « Flotte parallèle » d'un plan
 * brief-chantier (id="s-flotte", §02b du gabarit).
 *
 * Source UNIQUE des noms de marqueurs, partagée par les deux linters :
 *   - preflight-lint.mjs   (check 9) — vérifie qu'UN plan déclare sa plage ;
 *   - preflight-flotte.mjs           — vérifie que N plans d'une VAGUE ont des
 *                                      plages réellement DISJOINTES.
 * Un marqueur renommé ici se propage aux deux — c'est tout l'intérêt.
 */

/** Le gabarit livre la section flotte en COMMENTAIRE HTML (plan solo = commentée).
 *  Tout ce qui dort dans un commentaire est invisible pour les deux linters. */
export const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, ' ');

export const textOf = (s) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Contenu textuel du PREMIER élément portant la classe demandée (null si absent). */
export const pickByClass = (scope, cls) => {
  const m = scope.match(
    new RegExp(`<([a-z]+)\\b[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i'),
  );
  return m ? textOf(m[2]) : null;
};

/**
 * Interprète le contenu de <code class="plage-ids">.
 * Formes acceptées :
 *   « DEFERRED 121-130 » → { optout:false, label:'DEFERRED', from:121, to:130 }
 *   « 121-130 »          → label '' (compteur non nommé)
 *   « aucun compteur global » → { optout:true }
 * Retourne null si la chaîne n'est ni une plage bornée ni l'opt-out.
 */
export function parsePlage(raw) {
  if (!raw) return null;
  if (/aucun compteur global/i.test(raw)) return { optout: true, raw };
  const m = raw.match(/(\d+)\s*(?:-|–|—|\.\.|à|to)\s*(\d+)/);
  if (!m) return null;
  const label = raw
    .slice(0, m.index)
    .replace(/[^A-Za-z0-9_-]+/g, ' ')
    .trim()
    .toUpperCase();
  return { optout: false, raw, label, from: Number(m[1]), to: Number(m[2]) };
}

/** Deux plages se recouvrent-elles ? (même compteur supposé — à filtrer par l'appelant) */
export const chevauchent = (a, b) => a.from <= b.to && b.from <= a.to;

/**
 * Lit la section flotte d'un plan.
 * → { present:false } si le plan est solo (section absente ou commentée).
 * → { present:true, nom, freres, plage, plageParsed } sinon.
 *   `nom`/`plage` valent null si le marqueur manque, '' s'il est vide.
 */
export function readFlotte(rawHtml) {
  const html = stripComments(rawHtml);
  const idx = html.indexOf('id="s-flotte"');
  if (idx === -1) return { present: false, html };

  const open = html.lastIndexOf('<section', idx);
  const close = html.indexOf('</section>', idx);
  const sec = html.slice(open === -1 ? idx : open, close === -1 ? html.length : close);

  const freresM = sec.match(/<ul\b[^>]*class="[^"]*\bflotte-freres\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
  const plage = pickByClass(sec, 'plage-ids');

  return {
    present: true,
    html,
    sec,
    nom: pickByClass(sec, 'flotte-nom'),
    freres: freresM ? (freresM[1].match(/<li/g) ?? []).length : -1, // -1 = liste absente
    plage,
    plageParsed: parsePlage(plage),
  };
}
