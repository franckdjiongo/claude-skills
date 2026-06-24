#!/usr/bin/env node
// scripts/lib/template-renderer.mjs
// Renders meta-govern templates with variable substitution + conditional blocks.
//
// Syntax:
//   {{VARIABLE}}              — substitute with variables[VARIABLE]
//   {{IF_FLAG}} ... {{/IF}}    — include block only if flags[FLAG] is truthy
//   {{IF_FLAG_OR_OTHER}} ... {{/IF}} — supports OR via underscores in flag name (handled at flag-set level)
//
// Conditionals are non-nestable for v1 (most templates only need flat conditionals).
// If nesting is needed later, switch to Mustache or Handlebars.

import fs from 'node:fs';
import path from 'node:path';

const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

/**
 * @param {string} template - template content
 * @param {object} variables - { VARIABLE: 'value' }
 * @param {object} flags - { IF_STACK_REACT: true }
 * @returns {string} rendered template
 */
export function renderTemplate(template, variables = {}, flags = {}) {
  let out = template;

  // Strip {{IF_FLAG}} ... {{/IF}} blocks where FLAG is falsy.
  // Conditionals must be on separate lines or wrap inline content; both supported.
  out = stripConditionals(out, flags);

  // Substitute {{VARIABLE}} with values.
  out = out.replace(/\{\{([A-Z_][A-Z0-9_]*)\}\}/g, (match, varName) => {
    if (varName.startsWith('IF_') || varName === 'IF') {
      // Conditional marker leftover (shouldn't happen if stripConditionals worked).
      return match;
    }
    const value = variables[varName];
    if (value === undefined || value === null) {
      return `<!-- meta-govern: missing variable {{${varName}}} -->`;
    }
    return String(value);
  });

  // Strip template-author HTML comment blocks. These are documentation FOR the
  // template author (they describe the variables that will be substituted) and
  // serve no purpose in the rendered file. When they appear before a YAML
  // frontmatter `---` line they actually break skill auto-discovery, since
  // Claude Code expects the frontmatter at line 1.
  // Anchor on the literal "Template variables" tag so legitimate HTML comments
  // pass through untouched.
  out = stripTemplateVariableComments(out);

  return out;
}

/**
 * Strip `<!-- Template variables ... -->` blocks (and their trailing whitespace).
 * The "Template variables" anchor keeps this from false-positiving on real
 * HTML comments. Both forms are handled:
 *   <!-- Template variables: ... -->
 *   <!-- Template variables (substituted at BOOTSTRAP): ... -->
 * Newlines inside the comment are matched via [\s\S]; the `?` keeps the match
 * non-greedy so multiple separate comments don't get merged.
 * @param {string} content
 * @returns {string}
 */
export function stripTemplateVariableComments(content) {
  return content.replace(/<!--\s*\nTemplate variables[\s\S]*?-->\s*\n?/g, '');
}

/**
 * Detect template-rendering leaks in a rendered file's content.
 * Run AFTER renderTemplate(); these patterns should never appear in a healthy
 * scaffold. Use the result to surface defects loudly during BOOTSTRAP.
 *
 * Severities:
 *   - CRITICAL: breaks runtime behavior (frontmatter not at line 1 → skill
 *     auto-discovery fails)
 *   - HIGH: visible defect that misleads readers (unstripped conditionals,
 *     Mustache-style markers, leaked Template-variable comments)
 *   - MEDIUM: cosmetic but real (unsubstituted {{VAR}} that isn't part of
 *     legitimate documentation)
 *
 * Returns [] when content is clean.
 *
 * @param {string} content - the rendered file content
 * @param {object} options
 * @param {string} [options.targetPath] - the path the file will be written to;
 *   used to gate file-type-specific checks (e.g., SKILL.md must start with `---`)
 * @returns {Array<{severity: string, pattern: string, line?: number, message: string}>}
 */
export function detectRenderLeaks(content, { targetPath = '' } = {}) {
  const leaks = [];
  const lines = content.split('\n');

  // Template-variable comment block — the renderer's stripTemplateVariableComments()
  // should have removed this. If it still appears, either the regex missed an edge
  // case or stripTemplateVariableComments wasn't called at all.
  if (/<!--\s*\n?Template variables/m.test(content)) {
    leaks.push({
      severity: 'HIGH',
      pattern: 'template-variable-comment',
      message: '<!-- Template variables ... --> block leaked through the renderer.',
    });
  }

  // Missing-variable markers emitted by renderTemplate() itself. Without this
  // check they slip through silently: the MEDIUM unsubstituted-variable
  // heuristic below skips any line containing an HTML comment — which is
  // exactly what the marker is.
  for (let i = 0; i < lines.length; i++) {
    const mv = lines[i].match(/<!-- meta-govern: missing variable \{\{([A-Z_][A-Z0-9_]*)\}\} -->/);
    if (mv) {
      leaks.push({
        severity: 'HIGH',
        pattern: 'missing-variable-marker',
        line: i + 1,
        message: `Variable {{${mv[1]}}} absente du plan — marqueur « missing variable » rendu dans le fichier.`,
      });
    }
  }

  // Unstripped conditional markers from the renderer's own grammar.
  if (/\{\{IF_[A-Z_][A-Z0-9_]*\}\}/.test(content)) {
    leaks.push({
      severity: 'HIGH',
      pattern: 'if-marker',
      message: 'Unstripped {{IF_*}} marker. The flag was missing from plan.flags or the conditional was malformed.',
    });
  }
  if (/\{\{\/IF\}\}/.test(content)) {
    leaks.push({
      severity: 'HIGH',
      pattern: 'endif-marker',
      message: 'Unstripped {{/IF}} marker. The opening {{IF_*}} likely never matched.',
    });
  }
  // Mustache-style {{#IF_*}} is NOT supported by this renderer; if it shows up, the
  // template author used the wrong grammar. Detection here surfaces the bug at scaffold time.
  if (/\{\{#IF_[A-Z_][A-Z0-9_]*\}\}/.test(content)) {
    leaks.push({
      severity: 'HIGH',
      pattern: 'mustache-if-marker',
      message: 'Mustache-style {{#IF_*}} marker. This renderer only supports {{IF_*}}...{{/IF}} (no `#`).',
    });
  }

  // Unsubstituted variable markers — flag only when they appear OUTSIDE of code blocks,
  // backticks, JSDoc lines, and HTML comments. The cheap heuristic catches the common
  // leak case (a stray {{COMPONENT_DIR}} in prose) without false-positiving on doc
  // references like "use the `{{IF_STACK_*}}` block".
  let inFencedCode = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      inFencedCode = !inFencedCode;
      continue;
    }
    if (inFencedCode) continue;
    if (line.includes('`{{') || /^\s*\*/.test(line) || /^\s*\/\//.test(line) || /<!--/.test(line)) continue;
    const m = line.match(/\{\{([A-Z_][A-Z0-9_]*)\}\}/);
    if (m && !m[1].startsWith('IF_') && m[1] !== 'IF') {
      leaks.push({
        severity: 'MEDIUM',
        pattern: 'unsubstituted-variable',
        line: i + 1,
        message: `Unsubstituted {{${m[1]}}} marker — missing from plan.variables.`,
      });
    }
  }

  // CRITICAL: SKILL.md and agent .md files must have YAML frontmatter at line 1.
  // Anything else (HTML comment, blank line, prose) breaks Claude Code's skill
  // auto-discovery. This was the v1.2.1 leak class that motivated the renderer fix.
  const isSkillFile = /\/SKILL\.md$/.test(targetPath);
  const isAgentFile = /\/\.claude\/agents\/[^/]+\.md$/.test(targetPath);
  if ((isSkillFile || isAgentFile) && lines[0] !== '---') {
    leaks.push({
      severity: 'CRITICAL',
      pattern: 'frontmatter-not-at-line-1',
      message: `YAML frontmatter must start at line 1 (got: ${JSON.stringify(lines[0]).slice(0, 60)}). Skill/agent auto-discovery will fail.`,
    });
  }

  return leaks;
}

function stripConditionals(template, flags) {
  // Process from innermost to outermost (simple iterative pass).
  // Pattern: {{IF_FLAG_NAME}} ... {{/IF}}
  const conditionalRegex = /\{\{(IF_[A-Z_][A-Z0-9_]*)\}\}([\s\S]*?)\{\{\/IF\}\}/g;

  let prev = '';
  let out = template;
  let iter = 0;

  while (out !== prev && iter < 20) {
    prev = out;
    out = out.replace(conditionalRegex, (match, flagName, content) => {
      // {{IF_X_OR_Y}} → check flags.IF_X_OR_Y OR (flags.IF_X || flags.IF_Y)
      const flagValue = resolveFlag(flagName, flags);
      return flagValue ? content : '';
    });
    iter++;
  }

  // Remove dangling start/end markers (orphan conditionals — defensive cleanup).
  out = out.replace(/\{\{IF_[A-Z_][A-Z0-9_]*\}\}/g, '');
  out = out.replace(/\{\{\/IF\}\}/g, '');

  return out;
}

function resolveFlag(flagName, flags) {
  if (flags[flagName] !== undefined) return Boolean(flags[flagName]);

  // Try OR-decomposition: IF_X_OR_Y → IF_X || IF_Y
  // (only one level of decomposition for simplicity)
  if (flagName.includes('_OR_')) {
    return flagName.split('_OR_').some(part => Boolean(flags[`IF_${part.replace(/^IF_/, '')}`]));
  }

  return false;
}

/**
 * Render a template file from disk.
 * @param {string} templatePath - absolute path to .tpl file
 * @param {object} variables
 * @param {object} flags
 * @returns {string} rendered content
 */
export function renderTemplateFile(templatePath, variables = {}, flags = {}) {
  const template = fs.readFileSync(templatePath, 'utf8');
  return renderTemplate(template, variables, flags);
}

/**
 * Render a template and write to a destination.
 * @param {string} templatePath - source .tpl file
 * @param {string} outputPath - destination
 * @param {object} variables
 * @param {object} flags
 * @param {object} options - { overwrite: boolean (default: false), dryRun: boolean (default: false) }
 * @returns {{ written: boolean, path: string, content: string, reason?: string }}
 */
export function renderToFile(templatePath, outputPath, variables = {}, flags = {}, options = {}) {
  const { overwrite = false, dryRun = false } = options;

  if (fs.existsSync(outputPath) && !overwrite) {
    return { written: false, path: outputPath, content: '', reason: 'exists; overwrite=false' };
  }

  const content = renderTemplateFile(templatePath, variables, flags);

  if (dryRun) {
    return { written: false, path: outputPath, content, reason: 'dryRun' };
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, 'utf8');

  return { written: true, path: outputPath, content };
}

// CLI: node template-renderer.mjs <template-path> [--var KEY=VALUE]... [--flag IF_X]... [--out PATH] [--dry-run]
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help') {
    process.stderr.write(`Usage: template-renderer.mjs <template> [--var K=V]... [--flag IF_X]... [--out PATH] [--dry-run]\n`);
    process.exit(args[0] === '--help' ? 0 : 2);
  }

  const templatePath = path.resolve(args[0]);
  const variables = {};
  const flags = {};
  let outputPath = null;
  let dryRun = false;

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--var' && args[i + 1]) {
      const [k, v] = args[++i].split('=');
      variables[k] = v ?? '';
    } else if (a === '--flag' && args[i + 1]) {
      flags[args[++i]] = true;
    } else if (a === '--out' && args[i + 1]) {
      outputPath = path.resolve(args[++i]);
    } else if (a === '--dry-run') {
      dryRun = true;
    }
  }

  const rendered = renderTemplateFile(templatePath, variables, flags);

  if (outputPath) {
    if (dryRun) {
      process.stdout.write(`--- DRY-RUN: would write to ${outputPath} ---\n`);
      process.stdout.write(rendered);
    } else {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, rendered, 'utf8');
      process.stdout.write(`Wrote ${outputPath} (${rendered.length} bytes)\n`);
    }
  } else {
    process.stdout.write(rendered);
  }
}
