---
name: dataverse-csharp-plugin-engineer
description: Use when building, debugging, hardening, testing, or deploying Dataverse/Power Platform C# plug-ins end-to-end. Trigger on requests for plugin scaffolding, pipeline-stage decisions, step registration, Custom API handlers, FakeXrmEasy tests, performance and security improvements, CI/CD setup, or production plugin incident triage.
---

# Dataverse C# Plugin Engineer

Provide end-to-end guidance for Dataverse plug-in work from setup to production support, grounded in the four source documents in `references/raw-sources/`.

## Grounding Rules

1. Run `python scripts/reference_doctor.py --fix` before major implementation or debugging guidance.
2. Treat `references/source-chunks/` and `assets/snippets/` as the source-grounded knowledge base generated from the four docs.
3. Prefer direct evidence from generated chunks before proposing architectural or operational advice.
4. If the user request is broad ("A to Z", "from scratch", "full guide"), start with `references/a-to-z-playbook.md`.

## Fast Workflow

1. Validate and sync generated references:
```bash
python scripts/reference_doctor.py --fix
```
2. Select the workflow:
- Build from scratch: read `references/a-to-z-playbook.md`
- Debug/incident: read `references/debugging-triage.md`
- Improve/refactor: read `references/improvement-checklist.md`
3. Open source-grounded sections from `references/source-chunks/` for the task domain using `references/source-navigation.md`.
4. Reuse templates from `assets/templates/` or snippets from `assets/snippets/`.
5. If creating starter files, run:
```bash
python scripts/create_plugin_scaffold.py --output-dir <path> --namespace <Namespace> --plugin-name <PluginClass>
```

## Resource Map

- `references/a-to-z-playbook.md`: end-to-end implementation path.
- `references/debugging-triage.md`: deterministic triage flow for sync/async/plugin-chain failures.
- `references/improvement-checklist.md`: hardening/perf/security/testing checklist.
- `references/source-navigation.md`: where each of the four source docs is strongest.
- `references/source-index.md`: generated index with hashes, heading maps, and chunk links.
- `references/source-manifest.json`: generated source-of-truth hash manifest.
- `scripts/sync_from_docs.py`: regenerate chunks/snippets/index from source docs.
- `scripts/reference_doctor.py`: detect drift and auto-heal generated files.
- `scripts/create_plugin_scaffold.py`: generate starter plugin files from templates.
- `assets/templates/`: curated starter templates.
- `assets/snippets/`: generated code blocks extracted from docs.

## Output Expectations

- For creation tasks: provide stage selection, registration configuration, code structure, test strategy, and deployment path.
- For debugging tasks: provide hypothesis tree, instrumentation plan, reproduction, fix, and regression test.
- For improvement tasks: provide measurable before/after criteria (latency, invocation volume, failure rate, security posture).

## Maintenance

- After any update to files under `references/raw-sources/`, rerun:
```bash
python scripts/reference_doctor.py --fix
```
- Commit updated generated artifacts (`references/source-*`, `references/source-chunks/`, `assets/snippets/`) with the docs change.
