# Implementation Plan: Food Calorie MVP

**Branch**: `001-food-calorie-mvp` | **Date**: 2026-03-23 | **Spec**: [spec.md](D:\Project\CalSnap\specs\001-food-calorie-mvp\spec.md)
**Input**: Feature specification from `D:\Project\CalSnap\specs\001-food-calorie-mvp\spec.md`

**Note**: This plan implements the single-item food calorie MVP defined in the feature
spec and constrained by the CalSnap constitution.

## Summary

Build a locally runnable mobile-plus-API MVP where a Flutter app handles authentication,
photo capture or selection, result presentation, and history screens, while an Express
API handles account security, image upload, PackyCode relay analysis, structured result
validation, and SQLite persistence. The implementation favors a clean boundary between
mobile UI, API contracts, AI integration, and storage so the demo can run locally now
and change model providers or persistence strategies later without rewriting product
flows.

## Technical Context

**Language/Version**: Dart 3.x with current Flutter stable SDK; TypeScript 5.x on a
current Node.js LTS runtime  
**Primary Dependencies**: Flutter, flutter_riverpod, go_router, dio,
flutter_secure_storage, image_picker or camera, Express 5, multer, zod,
better-sqlite3, bcrypt, nanoid  
**Storage**: SQLite for structured data plus local filesystem storage for uploaded demo
images  
**Testing**: flutter_test, integration_test, Vitest, Supertest  
**Target Platform**: iOS and Android client plus local Windows-hosted API server  
**Project Type**: Mobile app with companion API service  
**Performance Goals**: Supported demo analyses return within 5-10 seconds; auth and
history calls feel near-instant in local use  
**Constraints**: Single primary food or beverage per image; PackyCode credentials stay
server-side; unsupported scenes must return retry guidance; users must only access
their own history; local-first setup with low operational complexity  
**Scale/Scope**: Internal demo or small trial release, low concurrency, one mobile app,
one local API, one SQLite database

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Scope remains inside the approved MVP and does not add excluded capabilities
      such as multi-food decomposition, medical advice, payments, or community
      features without an approved amendment.
- [x] The design preserves single-item analysis and defines a structured result
      contract with item name, portion description, `kcal`, protein, carbs, fat,
      and confidence or retry guidance.
- [x] Secrets stay server-side, password storage is protected, and every history or
      account-facing interface is explicitly user-scoped.
- [x] Failure handling covers unsupported images, low-confidence analysis, and
      network or service failures with a retry path the user can understand.
- [x] The architecture keeps Flutter client, Express API, AI adapter, and
      persistence boundaries separable so local SQLite can later be replaced.
- [x] The plan includes a way to verify the demo-critical path locally: register or
      login, capture or upload, analyze, view result, and view history.

## Project Structure

### Documentation (this feature)

```text
specs/001-food-calorie-mvp/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- api.yaml
`-- tasks.md
```

### Source Code (repository root)

```text
api/
|-- package.json
|-- tsconfig.json
|-- src/
|   |-- server.ts
|   |-- app.ts
|   |-- config/
|   |   `-- env.ts
|   |-- db/
|   |   |-- client.ts
|   |   |-- migrations/
|   |   `-- schema.ts
|   |-- lib/
|   |   |-- storage.ts
|   |   `-- packycode/
|   |       |-- client.ts
|   |       |-- prompts.ts
|   |       `-- validate-result.ts
|   |-- middleware/
|   |   |-- auth.ts
|   |   `-- error-handler.ts
|   |-- modules/
|   |   |-- auth/
|   |   |   |-- auth.routes.ts
|   |   |   |-- auth.service.ts
|   |   |   `-- auth.schemas.ts
|   |   |-- analysis/
|   |   |   |-- analysis.routes.ts
|   |   |   |-- analysis.service.ts
|   |   |   `-- analysis.schemas.ts
|   |   `-- history/
|   |       |-- history.routes.ts
|   |       |-- history.service.ts
|   |       `-- history.schemas.ts
|   `-- shared/
|       `-- http-errors.ts
`-- tests/
    |-- contract/
    `-- integration/

mobile/
|-- pubspec.yaml
|-- lib/
|   |-- main.dart
|   |-- app/
|   |   |-- app.dart
|   |   |-- router.dart
|   |   `-- bootstrap.dart
|   |-- core/
|   |   |-- api/
|   |   |   `-- api_client.dart
|   |   |-- auth/
|   |   |   `-- session_store.dart
|   |   `-- ui/
|   |       `-- app_scaffold.dart
|   `-- features/
|       |-- auth/
|       |   |-- data/
|       |   |-- logic/
|       |   `-- presentation/
|       |-- analysis/
|       |   |-- data/
|       |   |-- logic/
|       |   `-- presentation/
|       `-- history/
|           |-- data/
|           |-- logic/
|           `-- presentation/
`-- test/
    |-- features/
    `-- widgets/
```

**Structure Decision**: Use an explicit `mobile/` and `api/` split. This matches the
product boundary, keeps server-only secrets and AI integration isolated from the
Flutter client, and makes future migration of storage or model provider less risky.

## Complexity Tracking

No constitution violations currently require justification.
