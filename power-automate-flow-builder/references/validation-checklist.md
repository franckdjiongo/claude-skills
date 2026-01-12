# Pre-Delivery Validation Checklist

Complete EVERY item before delivering flow.json to user.

---

## Phase 0: Deterministic Script Validation (MANDATORY FIRST STEP)

**Run validation scripts BEFORE manual review. Scripts catch escaping errors deterministically.**

### Validation Script Location

```
scripts/
├── validate-flow.js          # Main validation orchestrator
├── generate-expression.js    # Power Fx expression generator
├── verify-agent-output.js    # Deliverable verification
├── validators/
│   ├── escape-sequences.js   # @ → @@ validation (auto-fix)
│   ├── quote-escaping.js     # Quote escaping (auto-fix)
│   └── syntax-rules.js       # Syntax patterns (manual fix)
└── config/
    └── validation-rules.json # Configuration
```

### Step 0.1: Run Flow Validation Script

```bash
# Run validation with JSON output
node scripts/validate-flow.js [flow-name]-flow.json

# Human-readable summary
node scripts/validate-flow.js [flow-name]-flow.json --format summary

# Auto-fix and save corrected flow
node scripts/validate-flow.js [flow-name]-flow.json --output [flow-name]-flow-corrected.json
```

### Step 0.2: Interpret Script Results

| Status | Meaning | Action |
|--------|---------|--------|
| `PASSED` | No issues found | Proceed to Phase 1 manual review |
| `FIXED` | Issues auto-corrected | Use corrected flow, document fixes |
| `FAILED` | Unfixable issues | Manual correction required before proceeding |

### Step 0.3: Verify Deliverables Exist

```bash
node scripts/verify-agent-output.js --flow-name [flow-name]
# Or specify files directly:
node scripts/verify-agent-output.js --files [flow-name]-flow.json [flow-name]-implementation.md
```

### Step 0.4: Generate Expression File (If Needed)

```bash
node scripts/generate-expression.js [flow-name]-flow.json
# Output: [flow-name]-expression.txt for Power Automate fx editor paste
```

### What Scripts Validate

| Validator | What It Checks | Auto-Fix |
|-----------|----------------|----------|
| **escape-sequences** | `@concat` → `@@concat`, `@{` → `@@{`, all PA functions | ✅ Yes |
| **quote-escaping** | Proper `\"` escaping in HTML/JSON strings | ✅ Yes |
| **syntax-rules** | Balanced `()[]{}`, no `,,`, no trailing commas | ❌ Manual |

### Script Exit Codes

- `0` = Passed (or all auto-fixed)
- `1` = Failed (unfixable issues)
- `2` = Script error (file not found, invalid JSON)

### Required Validation Output

Include in implementation guide:

```markdown
## Script Validation Results
- **Status:** PASSED | FIXED | FAILED
- **Timestamp:** [ISO timestamp from script]
- **Validators Run:** 3
- **Issues Found:** [count]
- **Fixes Applied:** [count]
```

### Checklist

- [ ] `validate-flow.js` executed successfully (exit code 0)
- [ ] If FIXED status: corrected flow saved and used
- [ ] `verify-agent-output.js` confirms both deliverables exist
- [ ] Validation results documented in implementation guide

---

## 1. Compose Actions Only Verification

### Schema Compliance

- [ ] ALL connector operations use `"type": "Compose"` (no OpenApiConnection types)
- [ ] NO `host` objects with connectionName/operationId/apiId fields
- [ ] NO `operationMetadataId` in ANY action or trigger
- [ ] ALL placeholders have rich JSON `inputs` structure (not empty arrays `[]`)
- [ ] Built-in actions (InitializeVariable, Select, Filter, etc.) used correctly

### Flow Definition Structure

- [ ] Flow includes: `$schema`, `contentVersion`, `triggers`, `actions`, `outputs`, `description`
- [ ] Flow **OMITS**: `parameters` section (no `$connections`, no `$authentication`)
- [ ] Flow **OMITS**: `connectionReferences` section
- [ ] Schema URL is correct: `https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#`
- [ ] `contentVersion` is `"1.0.0.0"`

---

## 2. Metadata Verification

- [ ] Compose placeholders use `metadata.description` only
- [ ] NO `operationMetadataId` copied from any source
- [ ] NO environment-specific GUIDs or connection names
- [ ] Custom documentation fields present where helpful

---

## 3. Placeholder Quality Verification

### Structure

- [ ] Every Compose placeholder has complete `inputs` structure
- [ ] All placeholders include: `action`, `connector`, `configuration`
- [ ] Appropriate additional fields: `queries` OR `fieldMappings` (based on operation type)

### Documentation

- [ ] Environment values use `[brackets]` format: `[Your Dataverse environment]`
- [ ] Placeholder descriptions under 256 characters
- [ ] Description clearly explains what connector action to use
- [ ] All parameters documented with expected values or expressions

---

## 4. Expression & Escaping Verification

### @ Symbol Escaping

- [ ] All `@` symbols properly doubled: `@@` in expressions
- [ ] Example: `@@{variables('varName')}` NOT `@{variables('varName')}`

### Quote Escaping

- [ ] All internal quotes escaped: `\"`
- [ ] JSON string is valid when parsed

### Correct Expression Syntax

- [ ] No nested action references from outside scopes
- [ ] Error messages are static (not dynamic extraction from nested scopes)
- [ ] Foreach loops use `@@body('ActionName')` for source
- [ ] Foreach loops use `@@item()` for current item (NOT `@@items()`)

---

## 5. Validation Rules Compliance

### Scope Reference Rules

- [ ] NO references to actions inside Scope/Condition/Loop from outside
- [ ] Example WRONG: `@@{outputs('Action_Inside_Scope')?['field']}`
- [ ] Error messages in Catch scope are static strings

### Foreach Loop Rules

- [ ] Source uses `@@body('ActionName')` NOT `@@outputs('ActionName')`
- [ ] Current item uses `@@item()` NOT `@@items('LoopName')`

### Length Limits

- [ ] All `description` fields under 256 characters
- [ ] `FlowDescription` under 256 characters

---

## 6. Performance & Patterns Verification

### Error Handling

- [ ] Try-Catch-Finally pattern implemented (if applicable)
- [ ] Catch scope uses static error messages
- [ ] Terminate action in Catch scope with Failed status

### Optimization

- [ ] Retry policies on external API call placeholders (if applicable)
- [ ] Concurrency configured on foreach loops (if applicable)
- [ ] Declarative operations (Select/Filter) used instead of loops where possible
- [ ] Dictionary lookup pattern used for record matching (if applicable)

### Platform Limits

- [ ] Total actions under 500
- [ ] Nesting levels under 8
- [ ] Concurrency settings within 1-50 range

---

## 7. File Structure Verification

### Deliverables

- [ ] TWO files generated: `[name]-flow.json` + `[name]-implementation.md`
- [ ] File names follow convention: `[SYSTEM]-[Operation]-[Detail]`
- [ ] JSON is valid and properly escaped
- [ ] Implementation guide is complete with all required sections

### JSON Validity

- [ ] `FlowDisplayName` present and descriptive
- [ ] `FlowDescription` present and under 256 chars
- [ ] `FlowDefinitionString` is properly escaped string
- [ ] JSON parses without errors

---

## 8. Implementation Guide Completeness

### Required Sections

- [ ] Overview (purpose, architecture, features)
- [ ] Prerequisites (checklist format)
- [ ] Implementation Steps (numbered steps with details)
- [ ] Placeholder Configuration (all placeholders documented)
- [ ] Environment Values Table (all brackets documented)
- [ ] Testing Procedures (manual, error handling, performance)
- [ ] Troubleshooting Guide (common issues table)
- [ ] Maintenance and Support (contacts, tasks)

### Placeholder Documentation

- [ ] Every placeholder has configuration table
- [ ] Field mappings documented for create/update actions
- [ ] Example values provided for environment placeholders

---

## Quick Validation Commands

### Check for Forbidden Patterns

Search for these patterns (should return NO matches):

```
operationMetadataId
OpenApiConnection
connectionName.*shared_
operationId.*List
apiId.*providers
$connections
$authentication
```

### Check for Required Patterns

Search for these patterns (should find matches):

```
"type": "Compose"
metadata.*description
@@{
@@body(
@@item()
@@variables(
```

---

## Validation Status

After completing all checks:

| Category | Status |
|----------|--------|
| **Phase 0: Script Validation** | ☐ PASSED / ☐ FIXED / ☐ FAILED |
| Compose Actions Only | ☐ Pass / ☐ Fail |
| Schema Structure | ☐ Pass / ☐ Fail |
| Metadata | ☐ Pass / ☐ Fail |
| Placeholder Quality | ☐ Pass / ☐ Fail |
| Expression Escaping | ☐ Pass / ☐ Fail |
| Validation Rules | ☐ Pass / ☐ Fail |
| Performance Patterns | ☐ Pass / ☐ Fail |
| File Structure | ☐ Pass / ☐ Fail |
| Implementation Guide | ☐ Pass / ☐ Fail |

**Script Validation Details:**
- Exit Code: ☐ 0 / ☐ 1 / ☐ 2
- Issues Found: ___
- Auto-Fixes Applied: ___

**Overall Status:** ☐ Ready for Delivery / ☐ Needs Fixes

---

## Common Issues & Fixes

| Issue | Detection | Fix |
|-------|-----------|-----|
| Missing @@ escaping | Expression starts with `@{` | Add extra `@` |
| operationMetadataId present | Search finds matches | Remove all occurrences |
| Empty placeholder inputs | `"inputs": []` or `"inputs": {}` | Add complete JSON structure |
| Dynamic error message | Expression references Try scope | Replace with static string |
| Wrong foreach syntax | `@@items('LoopName')` | Change to `@@item()` |
| Parameters section present | `"parameters": {` | Remove entire section |
