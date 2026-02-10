# Writing Guide — English

This guide establishes the tone, style, and quality standards for the English version of the Application Blueprint.

## Core Principle

The document must read as if written by a senior business analyst who deeply understands both the application and its audience. It should feel hand-crafted, not generated. A reader should never think "this was written by AI."

## Voice and Tone

- **Professional but conversational.** Write as you would in a well-edited business document — clear, direct, and confident, but not stiff or formal.
- **Authoritative without being condescending.** Assume the reader is intelligent but may not know technical terms.
- **Active voice by default.** "The system sends a confirmation email" not "A confirmation email is sent by the system."
- **Present tense for describing features.** "The dashboard displays real-time metrics" not "The dashboard will display real-time metrics."
- **Third person for describing the system.** "The application validates the input" or "Users can filter results by date."
- **Second person sparingly** in the User Journey section only, where it creates a guided walkthrough feel.

## Plain Language Standards

These rules ensure accessibility for non-technical readers:

1. **Define every technical term on first use.** Example: "The application uses an API (a standardized way for software systems to communicate with each other) to retrieve weather data."

2. **Prefer common words over technical ones.** Say "stores" not "persists", "sends" not "dispatches", "checks" not "validates" (unless validation has a specific meaning in context).

3. **Use analogies for complex concepts.** Example: "The message queue works like a mailbox — the application drops a message in, and the receiving service picks it up when it's ready."

4. **One idea per sentence.** Break complex logic into multiple sentences. If a sentence has more than one comma-separated clause, consider splitting it.

5. **Avoid acronyms without expansion.** Always expand on first use, even common ones like API, URL, or SSO. After the first expansion, the acronym alone is fine.

6. **No code in prose.** Never include code snippets, variable names, or file paths in the body text. If a technical reference is essential, place it in a footnote or the Technical Overview section.

## Structure and Flow

- **Lead with the "what" and "why" before the "how."** For every feature, explain what it does and why it matters before explaining how it works.
- **Use transitions between sections.** Don't just start a new section cold. A brief sentence connecting to the previous section helps the reader follow the narrative.
- **Vary paragraph length.** Mix short and medium paragraphs. Avoid walls of text (no paragraph longer than 6-7 sentences).
- **Use sub-headings generously** within long sections to help scanning.
- **Bulleted lists** are appropriate for inventories and feature lists, but narrative explanation should be in prose.

## Sentence Construction

- **Prefer short sentences (15-20 words)** as a baseline, with occasional longer ones for complex ideas.
- **Start sentences with the subject.** Avoid leading with subordinate clauses: "When the user clicks submit, the form is validated" → "The form is validated when the user clicks submit" or even better: "Clicking submit triggers form validation."
- **Avoid nominalization.** "The system performs validation" → "The system validates."
- **Eliminate filler.** Remove: "it should be noted that", "it is important to mention", "basically", "essentially", "in order to" (use "to"), "due to the fact that" (use "because").

## Anti-Patterns to Avoid

These are hallmarks of AI-generated text. Eliminate them ruthlessly:

- ❌ "This robust and scalable solution leverages cutting-edge technology..."
- ❌ "In today's fast-paced digital landscape..."
- ❌ "It's worth noting that..."
- ❌ "This powerful feature enables users to seamlessly..."
- ❌ Starting consecutive paragraphs with "The" or "This"
- ❌ Overusing "ensures", "enables", "empowers", "facilitates", "streamlines"
- ❌ Hedging language: "may", "might", "could potentially" when describing actual implemented features
- ❌ Repeating the same information in different words across sections
- ❌ Using "comprehensive" or "robust" to describe anything
- ❌ Exclamation marks anywhere in the document

## Formatting Conventions

- **Headings:** Use Markdown headings (`#`, `##`, `###`). Section headings are `##`, sub-sections are `###`.
- **Bold:** Use for key terms on first introduction and for feature names in the Features section.
- **Italic:** Use sparingly for emphasis or for terms being defined.
- **Lists:** Use `-` for unordered lists. Reserve numbered lists for sequential steps.
- **Tables:** Use Markdown tables for structured comparisons (e.g., role permissions matrix).
- **No horizontal rules** between sections (headings provide enough separation).

## Quality Benchmarks

A well-written blueprint should:

- Be understandable by a non-technical executive reading it for the first time
- Allow a new developer to understand what the application does before reading any code
- Serve as a reference document that teams can point to when discussing the application
- Feel cohesive — like a single document, not a collection of isolated sections
- Be factual — every claim is backed by something found in the code
