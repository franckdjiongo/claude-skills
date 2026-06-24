#!/usr/bin/env node
/**
 * loop-queue.mjs — file d'items générique du skill loop-autonomy.
 *
 * Une seule structure : un fichier JSON { items: [...] } où chaque item porte
 * { id, title, status, attempts, commit, note, context? }. Statuts :
 * PENDING → DONE | SKIP | FAILED | QUARANTINED | DECISION_PENDING |
 * PLAN_REQUIRED. Deux FAILED sur le même item → QUARANTINED automatique.
 *
 * Usage :
 *   loop-queue.mjs init <queue.json>                  crée une file vide
 *   loop-queue.mjs add  <queue.json> <id> <titre...>  ajoute un item PENDING
 *   loop-queue.mjs next <queue.json>                  prochain PENDING (JSON) ou NONE
 *   loop-queue.mjs mark <queue.json> <id> <STATUS> [note|sha]
 *   loop-queue.mjs report <queue.json>                rapport markdown sur stdout
 *
 * Le skill appelle ces sous-commandes telles quelles ; ne pas réimplémenter.
 */
import fs from 'node:fs';
import path from 'node:path';

const STATUSES = ['PENDING', 'DONE', 'SKIP', 'FAILED', 'QUARANTINED', 'DECISION_PENDING', 'PLAN_REQUIRED', 'IN_PROGRESS'];

const [, , cmd, file, ...rest] = process.argv;

function usage(code = 1) {
  console.error('Usage: loop-queue.mjs init|add|next|mark|report <queue.json> [args]');
  process.exit(code);
}

function load(f) {
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!Array.isArray(data.items)) throw new Error('champ items manquant');
    return data;
  } catch (err) {
    console.error(`File illisible (${f}): ${err.message} — lancer init d'abord ?`);
    process.exit(1);
  }
}

function save(f, data) {
  data.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(path.resolve(f)), { recursive: true });
  fs.writeFileSync(f, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

if (!cmd || !file) usage();

switch (cmd) {
  case 'init': {
    if (fs.existsSync(file)) {
      console.error(`${file} existe déjà — refus d'écraser une file (elle peut contenir un état de run).`);
      process.exit(1);
    }
    save(file, { createdAt: new Date().toISOString(), items: [] });
    console.log(`File créée: ${file}`);
    break;
  }
  case 'add': {
    const [id, ...titleParts] = rest;
    if (!id || !titleParts.length) usage();
    const data = load(file);
    if (data.items.some((i) => i.id === id)) {
      console.error(`Item ${id} déjà présent.`);
      process.exit(1);
    }
    data.items.push({ id, title: titleParts.join(' '), status: 'PENDING', attempts: 0, commit: null, note: null });
    save(file, data);
    console.log(`${id} ajouté (${data.items.length} items).`);
    break;
  }
  case 'next': {
    const data = load(file);
    const item = data.items.find((i) => i.status === 'PENDING');
    console.log(item ? JSON.stringify(item) : 'NONE');
    break;
  }
  case 'mark': {
    const [id, status, ...noteParts] = rest;
    if (!id || !STATUSES.includes(status)) {
      console.error(`Statut invalide. Attendu: ${STATUSES.join(' | ')}`);
      process.exit(1);
    }
    const data = load(file);
    const item = data.items.find((i) => i.id === id);
    if (!item) {
      console.error(`Item inconnu: ${id}`);
      process.exit(1);
    }
    item.status = status;
    const note = noteParts.join(' ') || null;
    if (status === 'FAILED') {
      item.attempts += 1;
      if (item.attempts >= 2) item.status = 'QUARANTINED';
    }
    if (status === 'DONE' && note && /^[0-9a-f]{7,40}$/.test(note)) {
      item.commit = note;
    } else if (note) {
      item.note = note;
    }
    save(file, data);
    console.log(`${id} → ${item.status}${item.commit ? ` (${item.commit})` : ''}`);
    break;
  }
  case 'report': {
    const data = load(file);
    const lines = [`# Rapport loop-autonomy — ${new Date().toISOString()}`, ''];
    for (const status of STATUSES.filter((s) => s !== 'IN_PROGRESS').concat('IN_PROGRESS')) {
      const items = data.items.filter((i) => i.status === status);
      if (!items.length) continue;
      lines.push(`## ${status} (${items.length})`, '');
      for (const i of items) {
        const extra = [i.commit && `commit ${i.commit}`, i.note].filter(Boolean).join(' — ');
        lines.push(`- ${i.id} — ${i.title}${extra ? ` (${extra})` : ''}`);
      }
      lines.push('');
    }
    const pending = data.items.filter((i) => i.status === 'PENDING').length;
    lines.push(`Restant: ${pending} PENDING / ${data.items.length} total`);
    console.log(lines.join('\n'));
    break;
  }
  default:
    usage();
}
