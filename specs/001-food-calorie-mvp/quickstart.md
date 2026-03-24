# Quickstart: Food Calorie MVP

## Prerequisites

- Current Flutter stable SDK with mobile toolchains configured
- Current Node.js LTS runtime and `npm`
- SQLite support on the local machine
- A valid PackyCode relay base URL, API key, and target model name

## Planned Environment Variables

Create `api/.env` with:

```env
PORT=3000
DATABASE_PATH=./data/calsnap.db
UPLOAD_DIR=./storage/uploads
PACKYCODE_BASE_URL=https://<relay-host>
PACKYCODE_API_KEY=<server-only-secret>
PACKYCODE_MODEL=<model-name>
SESSION_TOKEN_BYTES=32
SESSION_TTL_DAYS=7
```

Create `mobile/.env` or flavor config with:

```env
API_BASE_URL=http://10.0.2.2:3000
```

## Planned Local Startup

### API

```bash
cd api
npm install
npm run db:migrate
npm run dev
```

Expected result: API server starts on `http://localhost:3000`.

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

Expected result: App launches on an emulator or device and can reach the local API.

## Demo-Critical Validation Flow

### 1. Happy Path

1. Register a new account with a unique email and password.
2. Confirm the app remains signed in after relaunch.
3. Capture or choose a clear image with one primary food item.
4. Submit the image.
5. Verify the result screen shows:
   - food name
   - portion description
   - calories in `kcal`
   - protein, carbs, and fat
   - confidence label or explanation
   - visible estimate disclaimer
6. Open history and verify the new record appears.
7. Open the record detail view and confirm the saved values match the result screen.

### 2. Unsupported Scene Validation

1. Sign in with a valid account.
2. Submit an image with multiple main foods or poor lighting.
3. Verify the app shows retry guidance instead of a normal calorie result.
4. Verify that no new history record is created for this refusal response.

### 3. Ownership Validation

1. Create two separate user accounts.
2. Generate at least one saved history record under account A.
3. Sign in as account B.
4. Verify account B cannot view account A's history entry.
5. Attempt to access or delete account A's record from account B's session.
6. Verify the API denies the action and returns no record data.

### 4. Logout Validation

1. Log out from an authenticated session.
2. Relaunch the app or revisit a protected screen.
3. Verify the user is redirected to authentication before history or analysis access.

## Known Validation Limits

- Real calorie accuracy against nutrition databases is outside MVP validation scope.
- Public internet reliability and cloud deployment behavior are outside this quickstart.
- Final command names may change during implementation, but the validation workflow must
  remain equivalent.
