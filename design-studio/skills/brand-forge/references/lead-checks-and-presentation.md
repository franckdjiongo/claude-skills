# Lead checks, iteration, presentation, tips

Moved out of SKILL.md. Steps 3-5 and the tips keep their numbering.

## Step 3: Lead Transition Checks (accounting, not relaying)

The lead does not merely pass messages — it **validates every transition with a
written accounting check** and sends the role back if the check fails.

**After research →** `research-findings.md` exists, non-empty (`ls` + size > 0).

**After names →** count the name entries in `name-candidates.md`. If
**count < `min_names`**, send the naming expert back for more. Verify the naming
language matches `target_locale`.

**After verification (the hard gate) →**
- **100% coverage:** every candidate carried into verification has a **verdict**
  (PASS / CONDITIONAL / FAIL) **and ≥ 1 evidence URL**. Count them; a missing verdict
  or a verdict with zero URLs = report sent back.
- **"Queries run" present:** the report contains a per-name "Queries run" section
  (each query → URL of its best result). Absent = sent back (anti-fabrication).
- **Sampling audit:** the lead **picks 3 names at random**, **re-runs one query
  each**, and compares to what the verifier reported. Any divergence (e.g. verifier
  said "no product" but the re-run surfaces one) = report sent back for redo.

**After slogans →** every PASS/CONDITIONAL name has its slogans; FAIL names have none.
Run the slogan ban-list check (streamline/empower/unleash/supercharge + "It's not X,
it's Y"); each slogan must contain a concrete product noun.

**Before presentation →** `ls` + non-zero size on all deliverables; the creative
director rendered a **real SVG at 16/32/512px** and the **contrast gate passed**
(computed ratios, not estimates — see Step 6 / visual-identity.md §5).

## Step 4: Handle Iteration

**If the verifier returns strictly fewer than 3 PASS names** (CONDITIONAL do **not**
count toward this threshold):

1. Tell the user: "Only X names passed verification. The {industry} namespace is crowded."
2. Ask: "Run another naming round with different strategies, or proceed with what we have?"
3. If re-run: spawn a fresh naming-expert (avoiding ALL previously failed names) then re-verify.

**Iteration strategies (in order):**
- Round 1: All 5 strategies, broad exploration.
- Round 2: Focus on compound words and mashups (highest pass rate).
- Round 3: **Two-word compounds** with `max_chars` raised to **14**, plus creative
  prefixes (get-, hey-, use-) or phonetic inventions. (Not "3-word names" — that
  contradicts the length rule.)

## Step 5: Present Results

Once the creative director delivers `final-recommendation.md`:

1. Read it.
2. Present a clean summary: top 3 name+slogan combos (table), the #1 logo concept
   (with the rendered SVG), the primary AI image prompt (copy-paste ready), the
   palette with hex codes + computed contrast ratios, the domain to register (with
   its RDAP-checked date), and the "indicative — confirm with a registrar / legal
   validation required" caveats.
3. Ask: "Which name do you prefer? Or explore more?"
4. If the user picks a name other than #1, update `final-recommendation.md`.

There is no team to shut down — sequential subagents simply finish.


## Tips for Best Results

- **Be specific about the product.** More context → better names.
- **State constraints and locale upfront.** "No AI in name" or "must work in French
  markets" saves wasted rounds.
- **Trust the verifier.** If a name fails, it fails for a reason — don't override.
- **Domain is king,** but a domain that merely resolves ≠ an active product. RDAP +
  active-product search both matter.
- **Compound words survive verification best** — novel combinations of common words
  have the highest pass rate.
- **Expect iteration.** Most industries are crowded. 2-3 rounds is normal.

