#!/usr/bin/env node
// Template: templates/hooks/agent-dispatch-preflight.mjs.tpl
// (aucune variable de template — le rendu est une copie littérale)
//
/**
 * agent-dispatch-preflight — Hook PreToolUse sur `Agent` (palier 3+).
 *
 * Pose/rafraîchit la sentinelle `.claude/tmp/.batch-in-flight` quand un
 * sous-agent ÉCRIVANT (subagent_type implementer / ui-implementer) est
 * dispatché — backstop déterministe du posage prose d'execute-plan 4a
 * (incident v1.10.0 : un dispatch écrivant SÉRIEL sans sentinelle a fait
 * refuser à tort le Stop-hook). Les dispatches lecteurs (reviewers,
 * persona-simulator…) ne posent RIEN : le gate Stop ne doit pas être
 * différé après une revue.
 *
 * FAIL-OPEN STRUCTUREL : ce hook n'émet jamais de permissionDecision ni de
 * decision — toute branche sort en exit 0 sans stdout ; toutes les
 * opérations fs sont en try/catch. Le consommateur (enforce-workflow) borne
 * la fenêtre par TTL sur le mtime de la sentinelle (voir SENTINEL_TTL_MS
 * dans enforce-workflow.mjs) : une sentinelle abandonnée périme et le gate
 * reprend. Le rafraîchissement de la sentinelle à CHAQUE dispatch écrivant
 * est le contrat producteur↔consommateur.
 *
 * FORME DE LA SENTINELLE (contrat producteur↔consommateur) :
 *   { "startedAt": "<ISO 8601>", "sessionId"?: "<session_id du dispatch>" }
 * `sessionId` est omis quand le payload PreToolUse n'en porte pas (forme
 * legacy, toujours acceptée côté lecture) ; il est porté pour rester
 * compatible avec un lecteur qui scoperait un jour la sentinelle par session
 * propriétaire du batch — le `enforce-workflow.mjs` canonique évalue
 * aujourd'hui la fraîcheur de la sentinelle par mtime seul et ne consomme pas
 * encore ce champ. Une chaîne nue (ex. `new Date().toISOString()`) N'EST PAS
 * un JSON valide : un futur lecteur qui la reparserait (`JSON.parse`) lèverait
 * et traiterait la sentinelle comme absente — écrire un objet JSON valide dès
 * maintenant évite de reproduire ce piège au premier lecteur qui en dépendra.
 */
import fs from 'node:fs';
// hook-utils durcit le PATH macOS à l'import et est le SEUL endroit où le nom
// de la sentinelle vit (BATCH_SENTINEL_NAME/batchSentinelPath) — rendu palier
// 3+ garanti aux côtés de lib/hook-utils.mjs (enforce-workflow l'exige déjà).
import { batchSentinelPath } from './lib/hook-utils.mjs';

const WRITING_AGENTS = new Set(['implementer', 'ui-implementer']);

try {
  const raw = fs.readFileSync(0, 'utf8').trim();
  const payload = raw ? JSON.parse(raw) : {};
  const subagentType = payload?.tool_input?.subagent_type ?? '';
  if (WRITING_AGENTS.has(subagentType)) {
    // JSON valide requis (voir docstring) — writeFileSync crée la sentinelle
    // ou la réécrit, ce qui rafraîchit `startedAt` (et donc le TTL du
    // consommateur) dans les deux cas. batchSentinelPath() crée `.claude/tmp`
    // au besoin (via tmpDir).
    const sentinel = { startedAt: new Date().toISOString() };
    if (payload?.session_id) sentinel.sessionId = payload.session_id;
    fs.writeFileSync(batchSentinelPath(), JSON.stringify(sentinel));
  }
} catch { /* fail-open : aucune sortie, aucun refus possible */ }
process.exit(0);
