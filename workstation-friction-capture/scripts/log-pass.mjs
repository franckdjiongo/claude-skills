#!/usr/bin/env node
// Journalise une passe de tri de friction : une ligne dans <runtime>/friction/capture-log.jsonl.
// Script identique côté .claude et .agents ; le runtime se passe en argument.
import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

function fail(message) {
  process.stderr.write(`BLOCKED: ${message}\n`);
  process.exit(1);
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const runtime = option('--runtime');
const sessionId = option('--session');
const found = Number(option('--found'));
const reported = Number(option('--reported'));

if (runtime !== 'claude' && runtime !== 'codex') fail('--runtime doit valoir claude ou codex');
if (!sessionId?.trim()) fail('--session manquant');
if (!Number.isInteger(found) || found < 0) fail('--found doit être un entier >= 0');
if (!Number.isInteger(reported) || reported < 0) fail('--reported doit être un entier >= 0');
if (reported > found) fail('--reported ne peut pas dépasser --found');

const override = runtime === 'codex' ? process.env.CODEX_FRICTION_DIR : process.env.CLAUDE_FRICTION_DIR;
const frictionDir = override
  ? path.resolve(override)
  : path.join(homedir(), `.${runtime}`, 'friction');

mkdirSync(frictionDir, { recursive: true, mode: 0o700 });
appendFileSync(
  path.join(frictionDir, 'capture-log.jsonl'),
  `${JSON.stringify({ ts: new Date().toISOString(), sessionId, found, reported })}\n`,
  { mode: 0o600 },
);
process.stdout.write(`VERDICT: LOGGED\nfound=${found} reported=${reported}\n`);
