# Research: Food Calorie MVP

## Decision 1: Use a split `mobile/` + `api/` repository structure

- **Decision**: Implement the product as a Flutter mobile client in `mobile/` and an
  Express API in `api/`.
- **Rationale**: This mirrors the product boundary, keeps PackyCode credentials fully
  server-side, and makes mobile UI work independent from backend iteration.
- **Alternatives considered**:
  - Single mixed project structure: rejected because it blurs client/server
    responsibilities and makes secret handling easier to violate.
  - Direct-to-model mobile integration: rejected because it conflicts with the
    constitution's server-side secret rule.
- **Constitution impact**: Satisfies IV. Server-Side Secrets And User Isolation and V.
  Local-First, Migration-Ready Architecture.

## Decision 2: Use server-managed opaque session tokens instead of client-trusted JWTs

- **Decision**: Create an `AuthSession` record in SQLite and return a random opaque
  bearer token whose hash is stored server-side.
- **Rationale**: This gives clean logout behavior, simple session invalidation, and
  straightforward ownership checks without introducing refresh token complexity for the
  MVP.
- **Alternatives considered**:
  - Stateless JWT-only auth: rejected because logout and revocation are weaker and more
    error-prone for a local MVP.
  - Cookie-based browser sessions: rejected because the primary client is a mobile app.
- **Constitution impact**: Satisfies IV. Server-Side Secrets And User Isolation and the
  requirement to preserve user-scoped history access.

## Decision 3: Use `better-sqlite3` with simple SQL migrations

- **Decision**: Store `User`, `AuthSession`, and `FoodRecord` data in SQLite using
  `better-sqlite3` and repository-style access layers.
- **Rationale**: It is lightweight, fast for local development, requires minimal
  runtime overhead, and keeps schema ownership explicit for an MVP.
- **Alternatives considered**:
  - Prisma with SQLite: rejected because it adds tooling overhead without solving a
    current MVP problem.
  - Raw JSON file persistence: rejected because relational ownership and query patterns
    matter for auth and history.
- **Constitution impact**: Satisfies I. Demo-Ready MVP and V. Local-First,
  Migration-Ready Architecture.

## Decision 4: Use a dedicated PackyCode adapter with schema validation

- **Decision**: Route all model calls through `api/src/lib/packycode/` and validate
  responses against a strict analysis schema before the API returns data.
- **Rationale**: This isolates provider-specific logic, ensures structured outputs, and
  provides a single place to enforce retry behavior for unsupported scenes.
- **Alternatives considered**:
  - Calling the relay directly inside route handlers: rejected because it couples HTTP
    concerns to provider behavior.
  - Passing free-form model text to the client: rejected because it violates the
    structured result requirement.
- **Constitution impact**: Satisfies II. Single-Item Structured Analysis, III.
  Transparent Estimates, and V. Local-First, Migration-Ready Architecture.

## Decision 5: Persist uploaded demo images locally and store relative paths

- **Decision**: Save uploaded images under a local storage directory and store a
  relative image path on each `FoodRecord`.
- **Rationale**: This keeps the MVP self-contained for demo replay and avoids
  introducing cloud object storage before it is needed.
- **Alternatives considered**:
  - Do not persist images at all: rejected because it weakens debugging and history
    fidelity.
  - Cloud image storage: rejected because it is outside current scope.
- **Constitution impact**: Satisfies I. Demo-Ready MVP and V. Local-First,
  Migration-Ready Architecture.

## Decision 6: Verify with end-to-end happy path plus refusal and ownership scenarios

- **Decision**: The first validation pass will include one happy-path food image, one
  unsupported multi-item or poor-quality image, and two-user account-isolation checks.
- **Rationale**: These scenarios cover the main product promise, the trust boundary,
  and the most important failure behavior without overexpanding the MVP.
- **Alternatives considered**:
  - Happy-path-only verification: rejected because it misses refusal behavior and data
    isolation, which are constitution-critical.
  - Full-scale device matrix testing: rejected because it is unnecessary for local MVP
    planning.
- **Constitution impact**: Satisfies III. Transparent Estimates, IV. Server-Side
  Secrets And User Isolation, and the Delivery Workflow & Quality Gates section.
