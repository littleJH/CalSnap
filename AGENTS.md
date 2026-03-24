# CalSnap Development Guidelines

Auto-generated from active feature planning context. Last updated: 2026-03-23

## Active Technologies

- Flutter mobile client using Dart 3.x on the current stable SDK
- TypeScript 5.x API service on a current Node.js LTS runtime
- flutter_riverpod, go_router, dio, flutter_secure_storage
- Express 5, multer, zod, better-sqlite3, bcrypt, nanoid

## Planned Project Structure

```text
api/
  src/
  tests/

mobile/
  lib/
  test/
```

## Planned Commands

```bash
cd api && npm install && npm run db:migrate && npm run dev
cd mobile && flutter pub get && flutter run
```

## Code Style

- Keep mobile UI, API routes, AI adapter logic, and persistence layers separated
- Keep PackyCode credentials server-side only
- Preserve single-item analysis behavior and structured result contracts
- Enforce user-scoped access for all history operations

## Recent Changes

- 001-food-calorie-mvp: Added implementation planning context for the Food Calorie MVP

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
