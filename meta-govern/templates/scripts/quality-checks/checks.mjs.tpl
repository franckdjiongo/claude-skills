#!/usr/bin/env node
/**
 * Quality-checks registry for {{PROJECT_NAME}}.
 *
 * Each check is { id, severity, kindFilter, run(files) -> Finding[] }
 * Findings are { id, severity, file, line, message }.
 *
 * Implementations split into ./checks/ to respect the 300-line file budget.
 * Stack-conditional checks are gated by `{{IF_STACK_*}}` blocks at scaffold time.
 */

// macOS hardening: see lib.mjs for the canonical PATH_PREFIX. Re-exported here
// so any check that shells out can pick it up without an extra import.
export const PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

import { hexColors, rgbaColors{{IF_STACK_HAS_I18N}}, languageTernary{{/IF}} } from './checks/style.mjs';
import {
  fileSizeHard,
  anyType,
  consoleStmt,
  secretsLike{{IF_STACK_HAS_DATA_LAYER}},
  directFetch{{/IF}},
} from './checks/code.mjs';
import {
  todoMarkers,
  snapshotTests,
  containerQuery{{IF_STACK_REACT}},
  useEffectSetState{{/IF}}{{IF_STACK_POWER_PLATFORM}},
  dataverseFormattedValue{{/IF}},
} from './checks/quality.mjs';

export const allChecks = [
  // --- style.mjs ---
  { id: 'colors-hex', run: hexColors },
  { id: 'colors-rgba', run: rgbaColors },
  {{IF_STACK_HAS_I18N}}{ id: 'i18n-ternary', run: languageTernary },{{/IF}}

  // --- code.mjs ---
  { id: 'file-size', run: fileSizeHard },
  { id: 'ts-any', run: anyType },
  { id: 'console', run: consoleStmt },
  { id: 'secrets', run: secretsLike },
  {{IF_STACK_HAS_DATA_LAYER}}{ id: 'direct-fetch', run: directFetch },{{/IF}}

  // --- quality.mjs ---
  { id: 'todo', run: todoMarkers },
  { id: 'snapshot', run: snapshotTests },
  { id: 'container-query', run: containerQuery },
  {{IF_STACK_REACT}}{ id: 'effect-setstate', run: useEffectSetState },{{/IF}}
  {{IF_STACK_POWER_PLATFORM}}{ id: 'dataverse-formatted-value', run: dataverseFormattedValue },{{/IF}}
];
