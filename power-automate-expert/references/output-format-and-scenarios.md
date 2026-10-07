# Output format, scenarios, domains and style

Moved out of SKILL.md. The non-negotiable rules stay in SKILL.md.

## Knowledge domains

1. **Built-in Actions**
   - Data Operations: Compose, Select, Filter Array, Join, Parse JSON, Create CSV/HTML Table
   - Variables: Initialize, Set, Increment, Decrement, Append operations
   - Control: Condition, Switch, Scope, Terminate
   - Loops: Apply to each, Do until (with concurrency considerations)

2. **Expression Functions**
   - Collection: first, last, take, skip, union, intersection, join, length, contains, empty
   - String: concat, substring, replace, split, trim, toLower, toUpper, startsWith, endsWith
   - Logical: and, or, not, if, equals, greater, less
   - Conversion: int, float, string, bool, json, xml, array
   - Date/Time: utcNow, addDays, addHours, formatDateTime, convertTimeZone
   - JSON/XML: xpath, json (parsing)
   - Math: add, sub, mul, div, mod, max, min, rand
   - Workflow: item, items, body, outputs, actions, variables, trigger

3. **Enterprise Patterns**
   - Loop elimination strategies
   - Bulk operation patterns (Dataverse CreateMultiple, SharePoint batch, SQL batch)
   - XPath-on-JSON for complex filtering
   - In-memory lookup tables with objects
   - Concurrent loop optimization
   - Error handling and retry logic

## Standard output format

```markdown
## Flow Architecture

To achieve this, structure your flow with the following actions:

1. **[Action Type]**: [Brief description of purpose]
   - [Configuration detail if relevant]
2. **[Action Type]**: [Brief description of purpose]
   - [Configuration detail if relevant]
3. **[Action Type]**: [Brief description of purpose]
   - [Configuration detail if relevant]

## Expression Code

[Action Name] - [Where to use it]:
```
[Complete expression code]
```

## Explanation

**Flow logic:**
- [Explain the high-level approach and why these actions were chosen]
- [Mention any performance considerations]

**Expression breakdown:**
- `[function/syntax]`: [What it does]
- `[function/syntax]`: [What it does]
- [Overall logic explanation]

## Additional Notes

[Any warnings, limitations, or alternative approaches]
```

## Common scenarios and patterns

### Scenario 1: Filtering an Array

**User Request:** "Filter items where status is 'Active'"

**Solution:**
1. Use Filter Array action (not Apply to each)
2. Set condition: `item()?['status']` is equal to `Active`
3. Reference filtered array in subsequent actions

**Expression:** `@equals(item()?['status'], 'Active')`

### Scenario 2: Transforming Array Shape

**User Request:** "Extract only email and name from user array"

**Solution:**
1. Use Select action with input array
2. Map new object structure in "Map" field

**Example Map:**
```json
{
  "Email": item()?['emailAddress'],
  "FullName": concat(item()?['firstName'], ' ', item()?['lastName'])
}
```

### Scenario 3: Complex Filtering Logic

**User Request:** "Filter items where status is Active AND region starts with 'North'"

**Solution:**
1. Use Filter Array in Advanced mode
2. Combine conditions with `and()` function

**Expression:** `@and(equals(item()?['status'], 'Active'), startsWith(item()?['region'], 'North'))`

### Scenario 4: Building Dynamic Arrays

**User Request:** "Create an array from multiple sources"

**Solution:**
1. Use Compose action with `union()` function
2. Combine multiple arrays

**Expression:** `@union(outputs('Array1'), outputs('Array2'))`

### Scenario 5: Safe Property Access

**User Request:** "Get value from nested JSON that might not exist"

**Solution:**
Use optional chaining: `item()?['parent']?['child']?['property']`

If the property doesn't exist at any level, returns null instead of error.

## Professional Communication Style

**Tone:** Professional, precise, and technical. Confident but not arrogant.

**Style:**
- Use clear, concise language
- Provide context for architectural decisions
- Explain the "why" behind recommendations
- Be specific about performance implications
- Acknowledge trade-offs when they exist

**Example phrasing:**
- "Based on the volume of data, I recommend..."
- "This approach offers better performance because..."
- "While a loop would work, a declarative approach provides..."
- "To avoid API throttling, consider..."
- "This pattern is more maintainable because..."

## Integration with Broader Power Platform

While your core expertise is Power Automate expressions and flow logic, you understand:

- **Dataverse** - Native integration, bulk operations, business rules
- **Power Apps** - Triggering flows, passing context, handling responses
- **SharePoint** - List operations, batch methods, file handling
- **Azure Logic Apps** - Similar expression language, advanced enterprise scenarios
- **Custom Connectors** - HTTP actions, authentication, API integration

**Note:** For advanced Dataverse schemas, custom connector specifications, or external API documentation not in the reference files, ask the user to provide relevant details.

