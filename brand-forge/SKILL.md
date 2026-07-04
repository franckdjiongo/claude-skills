---
name: brand-forge
description: Automate a FULL brand package (name + identity) for any project, product, startup, or idea. Runs an expert pipeline (researcher, naming expert, trademark/domain verifier, copywriter, creative director) to deliver a verified name, slogans, logo concepts, AI image prompts, color palette, and typography, producing docs/branding/brand-package.md + brand-tokens.css. Use when the user wants to name something or build brand identity from scratch: "branding", "brand forge", "name my app", "trouve-moi un nom", "branding pour mon projet", "identité de marque", "I need a name for", "branding for my startup", needs a slogan/tagline, or wants a naming/identity package. Scope guard: if the user only wants a LOGO IMAGE or an image PROMPT for an EXISTING name (no naming/verification needed), use chatgpt-image-prompt-architect instead — that skill writes the image prompt; brand-forge builds the whole brand.
---

# Brand Forge

Automate end-to-end branding: name, slogan, logo, colors, and AI image prompts -- delivered by a team of expert agents with built-in trademark/domain verification.

## Process Overview

```
1. Gather Requirements (ask user about project, vibe, constraints)
2. Create Team (5 agents: researcher, namer, verifier, copywriter, creative director)
3. Run Pipeline (research -> names -> verification -> slogans -> final package)
4. Iterate if needed (if too few names pass verification, auto-generate more)
5. Present results (user picks favorite, files are saved)
```

## Step 1: Gather Requirements

Ask the user using AskUserQuestion (max 3 questions, one at a time):

**Question 1 -- Project context:**
"Tell me about your project/product/idea. What does it do, who is it for, and what makes it different?"
(If the user already explained this, skip and extract from context.)

**Question 2 -- Brand vibe:**
Options: Professional & sleek | Playful & modern | Techy & powerful | Minimal & elegant
(See references/naming-strategies.md for archetype details.)

**Question 3 -- Constraints:**
Multi-select: No "AI" in name | Not too techy | Avoid competitor-similar names | No specific restrictions
Plus ask: "Any words, themes, or styles to avoid?"

Extract these variables for agent prompts:
- `project_description`: What the product does in 2-3 sentences
- `industry`: The market/category (e.g., "voice-to-text", "project management")
- `product_context`: Features, target audience, price point, platform
- `brand_vibe`: Selected archetype
- `target_audience`: Who uses it
- `value_prop`: Core value in one sentence
- `user_constraints`: All naming restrictions
- `naming_rule`: The self-explanatory rule -- "When someone hears the name, they must immediately understand what the product does"
- `max_chars`: 10 (default)
- `min_names`: 30 (generate volume -- expect 70-85% failure rate)
- `image_gen_tool`: Ask user which AI image tool they use (Gemini, Midjourney, DALL-E, etc.)
- `output_dir`: `docs/branding` in the project root (create if needed)
- `selection_criteria`: Derived from brand vibe + constraints

## Step 2: Create Team and Tasks

Read references/agent-prompts.md for detailed prompt templates.

### Team Structure

```
TeamCreate: "branding-team"

Task #1: Research (researcher) -- no blockers
Task #2: Generate names (naming-expert) -- blocked by #1
Task #3: Verify names (verifier) -- blocked by #2
Task #4: Write slogans (copywriter) -- blocked by #3
Task #5: Final package (creative-director) -- blocked by #4
```

### Spawn All 5 Agents

Spawn all agents simultaneously via Task tool with `team_name: "branding-team"`. Each agent:
- Claims its task from TaskList
- Waits for blockers to clear by polling TaskList
- Reads predecessor output files
- Writes its deliverable to `{output_dir}/`
- Marks task complete and messages team lead

Agent prompts: Fill the templates from references/agent-prompts.md with the variables gathered in Step 1.

### Critical Rules for Agents

1. **Verifier is the hard gate.** No name moves past verification without PASS or CONDITIONAL status.
2. **Generate 30+ names minimum.** The naming expert must produce volume because 70-85% will fail verification.
3. **Copywriter only works on verified names.** Zero slogans for FAIL names.
4. **Creative director only recommends verified names.** The #1 pick must be PASS or CONDITIONAL.
5. **All agents use WebSearch for research.** No guessing domains or trademarks.

## Step 3: Monitor Pipeline

As team lead, monitor agent messages and relay notifications:
- When researcher finishes: message naming-expert that research is ready
- When naming-expert finishes: message verifier that names are ready
- When verifier finishes: message copywriter with list of PASS/CONDITIONAL names
- When copywriter finishes: message creative-director that all inputs are ready

Keep the user updated on progress with brief status messages.

## Step 4: Handle Iteration

**If verifier returns fewer than 3 PASS names:**

1. Message the user: "Only X names passed verification. The {industry} namespace is crowded."
2. Ask: "Should I run another naming round with different strategies, or proceed with what we have?"
3. If re-run: Create new naming + verification tasks, keeping the same team active
4. The new naming expert should avoid ALL previously failed names and try different strategies

**Iteration strategies (in order):**
- Round 1: All 5 strategies with broad exploration
- Round 2: Focus on compound words and mashups (highest pass rate)
- Round 3: Try 3-word names, creative prefixes (get-, hey-, use-), or phonetic inventions

## Step 5: Present Results and Clean Up

Once the creative director delivers the final package:

1. Read `{output_dir}/final-recommendation.md`
2. Present a clean summary to the user:
   - Top 3 name+slogan combos in a table
   - The #1 logo concept description
   - The primary AI image prompt (copy-paste ready)
   - Color palette with hex codes
   - Domain to register
3. Ask: "Which name do you prefer? Or want to explore more?"
4. If user picks a different name than #1, update final-recommendation.md accordingly
5. Shut down all agents via SendMessage type: "shutdown_request"
6. Delete the team via TeamDelete
7. Confirm output files are saved in `{output_dir}/`

## Output Files

The pipeline produces these files in `{output_dir}/`:

| File | Contents |
|------|----------|
| `research-findings.md` | Market analysis, competitors, naming territories |
| `name-candidates.md` | All generated names with rationale |
| `verification-report.md` | Trademark/domain check for every name |
| `slogans.md` | 3-5 slogans per verified name |
| `final-recommendation.md` | Complete brand package: name, slogans, logo, colors, prompts |

## Tips for Best Results

- **Be specific about the product.** The more context agents have, the better the names.
- **State constraints upfront.** "No AI in name" or "must work in French markets" saves wasted rounds.
- **Trust the verifier.** If a name fails, it fails for a reason. Don't override.
- **Domain is king.** A great name with no domain is useless. The verifier catches this.
- **Compound words win.** Novel combinations of common words have the highest verification pass rate.
- **Expect iteration.** Most industries are crowded. 2-3 rounds is normal.
