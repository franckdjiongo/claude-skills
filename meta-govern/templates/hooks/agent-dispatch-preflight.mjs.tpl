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
import path from 'node:path';

// Durcissement PATH macOS (Apple Silicon): les apps GUI ne voient pas /opt/homebrew/bin.
const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

const WRITING_AGENTS = new Set(['implementer', 'ui-implementer']);

try {
  const raw = fs.readFileSync(0, 'utf8').trim();
  const payload = raw ? JSON.parse(raw) : {};
  const subagentType = payload?.tool_input?.subagent_type ?? '';
  if (WRITING_AGENTS.has(subagentType)) {
    const dir = path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.claude', 'tmp');
    fs.mkdirSync(dir, { recursive: true });
    // writeFileSync crée la sentinelle ou la réécrit — le mtime est rafraîchi
    // dans les deux cas, ce qui réarme le TTL du consommateur.
    fs.writeFileSync(path.join(dir, '.batch-in-flight'), `${new Date().toISOString()}\n`);
  }
} catch { /* fail-open : aucune sortie, aucun refus possible */ }
process.exit(0);
