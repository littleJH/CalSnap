<!--
Sync Impact Report
Version change: 1.0.0 -> 1.0.1
Modified principles:
- IV. Server-Side Secrets And User Isolation -> IV. Server-Side Secrets And User Isolation
- V. Local-First, Migration-Ready Architecture -> V. Local-First, Migration-Ready Architecture
Added sections:
- None
Removed sections:
- None
Templates requiring updates:
- None
Follow-up TODOs:
- None
-->
# CalSnap Constitution

## Core Principles

### I. Demo-Ready MVP
CalSnap MUST prioritize a complete, locally runnable user loop over feature breadth.
Every approved feature MUST protect or improve the end-to-end path of registration or
login, image capture or upload, AI analysis, result viewing, and history viewing.
V1 MUST stay inside the declared MVP scope and MUST NOT expand into multi-food meal
splitting, medical advice, subscriptions, community features, SMS login, or production
cloud deployment unless the constitution is amended first.

Rationale: the project exists to validate the real user workflow quickly, not to
simulate a full nutrition platform.

### II. Single-Item Structured Analysis
V1 analysis MUST target exactly one primary food or beverage per image. The backend
MUST return structured data, not free-form prose, with at least the recognized item
name, portion description, estimated calories in `kcal`, estimated protein, carbs,
fat, and a confidence or retry guidance field. When the image contains multiple main
foods, poor lighting, blur, or insufficient portion evidence, the system MUST prefer a
safe refusal with retake guidance over a fabricated estimate.

Rationale: the product promise is "photo in, usable estimate out" for simple scenes,
and trust drops quickly when the system pretends certainty in unsupported cases.

### III. Transparent Estimates
All calorie and macro outputs MUST be presented as estimates for reference only. User
facing flows and API contracts MUST surface confidence cues or explicit trust messaging,
and MUST never imply medical, diagnostic, or dietitian-grade precision. Specs, plans,
and tasks MUST include handling for unsupported scenes and recovery paths for model,
network, and service failures.

Rationale: honest uncertainty is part of product quality for an AI nutrition tool.

### IV. Server-Side Secrets And User Isolation
PackyCode relay API credentials and any equivalent upstream model credentials MUST
remain on the server and MUST never be shipped in the Flutter client. Passwords MUST
be stored as salted hashes. Authenticated users MUST only be able to access, inspect,
and delete their own `FoodRecord` data. Any plan or task set that touches
authentication, AI access, or history MUST include explicit access-control and
session-state handling.

Rationale: even a demo product needs real trust boundaries around accounts, data, and
credentials.

### V. Local-First, Migration-Ready Architecture
The MVP MUST run in a local development environment using Flutter, Express, SQLite,
and a server-side PackyCode relay integration for model access. The architecture MUST
keep the mobile client, HTTP API, AI analysis adapter, and persistence concerns
cleanly separated so the team can later replace SQLite, the relay provider, or local
deployment without rewriting core product behavior. New complexity MUST be justified
against the demo goal and rejected when a simpler local-first option can satisfy the
requirement.

Rationale: we want fast iteration now without trapping the product in an unscalable
shape later.

## Product Scope & Safety Boundaries

- Supported V1 inputs are camera photos or gallery images that contain one clear,
  primary food or beverage.
- Supported V1 outputs are item name, portion description, calorie estimate, macro
  estimates, and confidence or retry guidance.
- Typical single-analysis completion time SHOULD target `5-10` seconds in the local
  demo environment.
- History MUST be account-bound. If delete is implemented, it MUST be scoped to the
  current authenticated user.
- All user messaging about nutrition values MUST clearly indicate they are estimates
  for reference only.
- Unsupported V1 scenarios include multi-item meal decomposition, medical advice,
  coaching, payments, social sharing, and public-cloud-only dependencies.

## Delivery Workflow & Quality Gates

- `spec.md` MUST document user stories for the main product loop, functional
  requirements, non-functional requirements, edge cases, assumptions, and explicit
  out-of-scope boundaries.
- `plan.md` MUST document the chosen mobile/API/storage boundaries, the `User` and
  `FoodRecord` data shapes, interface contracts for auth, analysis, and history, and a
  constitution check against every core principle.
- `tasks.md` MUST include work for authentication, structured AI response validation,
  error-state handling, user-scoped history access, and local verification of the
  demo-critical journey.
- Completion claims MUST be backed by verification evidence. If any required local
  verification cannot be run, the limitation MUST be stated explicitly in the final
  report.
- Any scope increase that breaks single-item analysis, weakens trust messaging, or
  bypasses server-side secret handling requires a constitution amendment before work
  continues.

## Governance

This constitution is the highest-authority project rule set for CalSnap. All specs,
plans, tasks, implementation reviews, and analysis outputs MUST comply with it.

Amendment policy:
- Amendments MUST be written in this file and include any required template sync.
- A MAJOR version bump is required for removed or materially redefined principles.
- A MINOR version bump is required for new principles, new mandatory gates, or new
  governance sections.
- A PATCH version bump is required for clarifications that do not change project
  obligations.

Compliance review policy:
- `/speckit.specify` outputs MUST satisfy the scope, trust, and requirement sections in
  this constitution.
- `/speckit.plan` outputs MUST fail fast on unresolved constitution gate violations.
- `/speckit.tasks` outputs MUST preserve coverage for auth, structured analysis, error
  handling, and user isolation.
- `/speckit.analyze` findings that violate a MUST statement in this constitution are
  automatically CRITICAL.

**Version**: 1.0.1 | **Ratified**: 2026-03-23 | **Last Amended**: 2026-03-23
