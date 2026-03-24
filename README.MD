# CalSnap

CalSnap is a monorepo with two runtime projects:

- `api/`: Node.js + TypeScript backend API
- `mobile/`: Flutter mobile app

This repository keeps one Git history, but both apps remain operationally independent.

## Monorepo Workflow (Root-First)

Run all common commands from the repository root.

### 1. Prerequisites

- Node.js `24.x` (see `.nvmrc`)
- `corepack` enabled
- Flutter stable SDK

### 2. Bootstrap

```bash
corepack enable
pnpm run setup
```

`pnpm run setup` will:

1. Install Node dependencies through pnpm workspace
2. Run Flutter dependency bootstrap in `mobile/`

Note: `pnpm setup` is a built-in pnpm command, so repository setup is exposed as `pnpm run setup`.

### 3. Daily Commands

```bash
# API
pnpm api:dev
pnpm api:migrate
pnpm test:api

# Mobile
pnpm mobile:run -- --dart-define=API_BASE_URL=http://10.0.2.2:3000
pnpm test:mobile

# Cross-project checks
pnpm check
```

`pnpm check` runs `analyze`, `test`, and `build` sequentially for both `api` and `mobile`.

## Repository Layout

```text
CalSnap/
  api/
  mobile/
  specs/
  .github/workflows/
  package.json
  pnpm-workspace.yaml
  turbo.json
```

## Environment Variables

Environment ownership stays local to each app.

- API config: `api/.env` (server-only secrets, DB path, relay credentials)
- Mobile config: Dart defines (for example `API_BASE_URL`) and optional `mobile/.env.example` references

There is no root `.env`.

## CI

GitHub Actions is split by path:

- `API CI`: triggers on `api/**` and root monorepo tooling files
- `Mobile CI`: triggers on `mobile/**` and root monorepo tooling files

Default CI does not run emulator-based `integration_test/`. Keep that in a separate workflow or manual run.
For portability, the default `mobile` build check compiles the web target (`flutter build web --debug`).

## Existing Architecture Rules

- Keep API routes, services, adapters, and persistence separated
- Keep PackyCode credentials on the server side only
- Preserve structured analysis result contracts
- Enforce user-scoped access for all history operations

## Optional Direct Subdirectory Commands

Root commands are recommended. If needed, direct commands still work:

```bash
cd api && pnpm dev
cd mobile && flutter run
```
