#!/usr/bin/env node
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
 * la fenêtre par mtime-TTL : une sentinelle abandonnée périme et le gate
 * reprend. Le rafraîchissement du mtime à CHAQUE dispatch écrivant est le
 * contrat producteur↔consommateur.
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
    // writeFileSync crée la sentinelle ou la réécrit — le mtime est rafraîchi
    // dans les deux cas, ce qui réarme le TTL du consommateur.
    // batchSentinelPath() crée `.claude/tmp` au besoin (via tmpDir).
    fs.writeFileSync(batchSentinelPath(), `${new Date().toISOString()}\n`);
  }
} catch { /* fail-open : aucune sortie, aucun refus possible */ }
process.exit(0);
