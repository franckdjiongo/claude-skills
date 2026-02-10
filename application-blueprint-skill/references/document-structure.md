# Application Blueprint — Canonical Document Structure

This is the reference structure for both the English and French versions. Adapt as needed for each application, but maintain this order and coverage.

---

## 1. Executive Summary

**Purpose:** A one-page overview that lets any reader grasp what the application does and why it exists, without reading anything else.

**Content:**
- Application name and one-sentence description
- The problem it solves (in business/human terms)
- Who uses it and why
- Key capabilities (3-7 bullet points, plain language)
- Technology platform (one line, e.g., "Web application built with React and Node.js")
- Current status (production, beta, internal tool, etc.)

**Length:** 150-300 words.

---

## 2. Context and Background

**Purpose:** Explain the "why" behind the application — the business or organizational context that led to its creation.

**Content:**
- The situation before the application existed (the pain point)
- What prompted its development
- The intended audience and their needs
- How the application fits into a larger ecosystem (if applicable)
- Key stakeholders and their relationship to the application

**Tone:** Narrative. Tell the story of why this application exists.

---

## 3. Users and Roles

**Purpose:** Define who uses the application and what each type of user can do.

**Content:**
- List of user types/roles (e.g., Administrator, Manager, End User, Guest)
- For each role:
  - Who they are in real life (job title, context)
  - What they can do in the application
  - What they cannot do (permission boundaries)
  - Their typical goals when using the application

**Format:** Use a sub-section per role.

---

## 4. User Journey — End to End

**Purpose:** Walk the reader through the application as if they were using it for the first time, from entry to completion of a typical task.

**Content:**
- How a user accesses the application (URL, login, SSO, etc.)
- The first screen they see and what it presents
- A step-by-step walkthrough of the primary workflow (the "happy path")
- What happens at each step — what the user does, what the system responds with
- How a task is completed and what the outcome is

**Tone:** Second-person narrative ("You log in, you see the dashboard, you click...") or third-person descriptive. Consistent throughout.

**Note:** If the application has multiple distinct workflows, describe each one as a separate sub-section. Prioritize by frequency of use.

---

## 5. Features and Capabilities

**Purpose:** A comprehensive inventory of everything the application can do, organized by functional area.

**Content:**
- Group features into logical modules or sections (e.g., "User Management", "Reporting", "Notifications")
- For each feature:
  - What it does (plain language)
  - Who uses it (role reference)
  - How it works at a high level
  - Any important rules or conditions (business rules)

**Format:** Organized by module/section with sub-sections per feature or feature group.

**Critical:** This section must be exhaustive. Every route, page, screen, endpoint, and capability found in the code must appear here.

---

## 6. Data and Information

**Purpose:** Explain what information the application manages, in business terms.

**Content:**
- The main types of data the application handles (e.g., "Customer records", "Invoices", "Time entries")
- For each data type:
  - What it represents in the real world
  - What information is captured (key fields, in plain language)
  - How it relates to other data types
  - Who can view/create/edit/delete it
- Data lifecycle: how data enters the system, how it changes, and what happens to old data

**Note:** Avoid database column names. Translate technical schemas into business concepts. A "customer_id FK on invoice table" becomes "Each invoice is linked to exactly one customer."

---

## 7. Business Rules and Logic

**Purpose:** Document the rules and conditions that govern how the application behaves.

**Content:**
- Validation rules (what must be true before an action is allowed)
- Calculation rules (how amounts, scores, or statuses are computed)
- Workflow rules (what triggers transitions between states)
- Notification rules (what events trigger alerts or messages)
- Authorization rules (what determines who can do what)

**Tone:** Precise but accessible. "An invoice can only be sent if all line items have a unit price greater than zero" rather than "invoice.lineItems.every(li => li.unitPrice > 0)".

---

## 8. Integrations and External Systems

**Purpose:** Explain how the application connects to the outside world.

**Content:**
- For each integration:
  - What external system or service is involved
  - What data flows between them (direction: in, out, or both)
  - When the exchange happens (real-time, scheduled, on-demand)
  - What happens if the external system is unavailable

**Examples:** Payment processors, email services, authentication providers, third-party APIs, databases, file storage, messaging systems.

---

## 9. Security and Access Control

**Purpose:** Explain how the application protects itself and its data.

**Content:**
- How users authenticate (login method, SSO, MFA, etc.)
- How permissions are managed (role-based, attribute-based, etc.)
- What sensitive data is handled and how it is protected
- Key security measures visible in the code (encryption, rate limiting, input validation, CORS, etc.)

**Tone:** Factual. Do not overstate security. Document what is implemented, not what should be.

---

## 10. Technical Overview

**Purpose:** A concise, accessible description of the technical foundation — for readers who want to understand "how it's built" without reading code.

**Content:**
- Architecture pattern (monolith, microservices, serverless, etc.)
- Front-end technology and approach
- Back-end technology and approach
- Database(s) and storage
- Hosting / deployment environment
- Key libraries and frameworks (only the important ones)
- Development and build tools

**Tone:** Explain each technology briefly. "React is a JavaScript library for building user interfaces" — one sentence per technology is sufficient.

**Length:** Keep this section concise. It's a technical summary, not a developer guide.

---

## 11. Deployment and Environments

**Purpose:** Explain how the application goes from code to a running system.

**Content:**
- Environments (development, staging, production)
- How deployments happen (CI/CD pipeline, manual, etc.)
- Configuration and environment variables (what they control, not their values)
- Monitoring and logging (if visible in the code)

---

## 12. Limitations and Known Constraints

**Purpose:** Honest documentation of what the application does NOT do, or does imperfectly.

**Content:**
- Features that are incomplete or marked as TODO in the code
- Known technical debt or workarounds
- Scalability considerations
- Browser/device/platform limitations
- Any hard-coded values or assumptions that could break

**Tone:** Factual, not critical. This section helps readers understand the boundaries of the application.

---

## 13. Glossary

**Purpose:** Define all domain-specific and technical terms used in the document.

**Content:**
- Every term that might be unfamiliar to a non-technical reader
- Business/domain terms specific to the application's industry
- Acronyms and abbreviations

**Format:** Alphabetical list. Keep definitions to one sentence each.

---

## Appendices (Optional)

Add appendices as needed for:
- Detailed data model diagrams (if useful)
- API endpoint inventory
- Configuration reference
- Screen/page inventory with descriptions
