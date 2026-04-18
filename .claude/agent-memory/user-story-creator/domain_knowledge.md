---
name: Domain Knowledge
description: Application domain context, personas, glossary, modules, business rules, and integrations for consistent story generation
type: project
---

## Application Overview

**Application Name:** [Your application name]
**Purpose:** [What the application does — 2-3 sentences]
**Target User Base:** [Who uses it — types of users, scale, geography if relevant]
**Current Stage:** [e.g., MVP live, scaling, major v2 in progress]

---

## Domain Glossary

Terminology the agent MUST use consistently across all stories.

| Term | Definition |
|------|------------|
| [Term 1] | [What it means in this application's context] |
| [Term 2] | [What it means in this application's context] |
| [Term 3] | [What it means in this application's context] |

> Add all domain-specific terms here. The agent will use these exact words in story titles, AC labels, and descriptions.

---

## Personas

Use these exact persona names and descriptions in all generated stories. Do NOT invent new personas unless instructed.

### Persona 1: [Name / Role Title]
- **Who they are:** [Job title, team, seniority]
- **Primary goal:** [What they are trying to achieve with this application]
- **Pain points:** [What frustrates them today]
- **Technical comfort:** [e.g., non-technical, power user, developer]
- **Typical context:** [When / where do they use the app]

### Persona 2: [Name / Role Title]
- **Who they are:**
- **Primary goal:**
- **Pain points:**
- **Technical comfort:**
- **Typical context:**

### Persona 3: [Name / Role Title]
- **Who they are:**
- **Primary goal:**
- **Pain points:**
- **Technical comfort:**
- **Typical context:**

> Add more personas as needed. Remove unused ones.

---

## Application Modules / Feature Areas

Already-built modules the agent should be aware of. Stories for new EPICs must not re-implement these unless explicitly extending them.

| Module | Description | Status |
|--------|-------------|--------|
| [Module 1] | [What it does] | Live |
| [Module 2] | [What it does] | Live |
| [Module 3] | [What it does] | In Progress |
| [Module 4] | [What it does] | Planned |

---

## Business Rules & Constraints

Rules that MUST be reflected in Acceptance Criteria or Out of Scope sections.

- [Rule 1 — e.g., "All monetary values must be displayed in GBP with 2 decimal places"]
- [Rule 2 — e.g., "Users must re-authenticate after 30 minutes of inactivity"]
- [Rule 3 — e.g., "All data exports must be audit-logged"]
- [Rule 4 — e.g., "Role: Admin can see all records; Role: Viewer sees only their own"]

---

## Compliance & Accessibility

- **Accessibility standard:** WCAG 2.1 AA (default — update if different)
- **Data regulations:** [e.g., GDPR, HIPAA, SOC2 — list applicable ones]
- **Other compliance:** [e.g., "Payment flows must comply with PCI-DSS"]

---

## Integration Landscape

External systems this application connects to. Reference these in Technical Notes and Dependencies sections of stories.

| System | Purpose | Integration Type |
|--------|---------|-----------------|
| [System 1] | [What data/function it provides] | [REST API / Webhook / MCP / etc.] |
| [System 2] | [What data/function it provides] | |
| [System 3] | [What data/function it provides] | |

---

## Tech Stack Constraints

Constraints that shape story Technical Notes. Do NOT include implementation prescriptions in story statements — only use these in the Technical Notes section.

- **Frontend:** [e.g., React 18, TypeScript]
- **Backend:** [e.g., Node.js, Express]
- **Database:** [e.g., PostgreSQL]
- **Auth:** [e.g., OAuth 2.0 via Auth0]
- **Hosting:** [e.g., AWS, Azure]
- **Key constraints:** [e.g., "No third-party analytics libraries allowed", "All APIs must be versioned"]

---

## Story Sizing Reference

Calibration guide for the 1/2/3/5/8 Fibonacci scale used in SCRUM project.

| Points | Meaning | Example story type |
|--------|---------|-------------------|
| 1 | Trivial — config change, label update | Change button label, update tooltip text |
| 2 | Small — single UI component or simple API call | Add a read-only field to a form |
| 3 | Medium — new feature with straightforward AC | User can filter a list by status |
| 5 | Large — multi-component feature or non-trivial logic | User can configure notification preferences |
| 8 | Very large — consider splitting | Full new screen with complex state and integrations |

---

## Notes for the Agent

- [Any other standing instructions specific to how stories should be written for this application]
- [e.g., "Always include a CMS ticket note in DoD for any user-facing text changes"]
- [e.g., "Prefer splitting error states into separate ACs rather than separate stories"]
