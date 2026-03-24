# Data Model: Food Calorie MVP

## Entity: User

**Purpose**: Represents an authenticated account owner.

**Fields**:

- `id`: string, primary key
- `email`: string, unique, normalized to lowercase
- `passwordHash`: string, bcrypt hash
- `createdAt`: ISO timestamp
- `updatedAt`: ISO timestamp

**Validation Rules**:

- `email` must be syntactically valid and unique
- `passwordHash` is never returned to the client

**Relationships**:

- One `User` has many `AuthSession` records
- One `User` has many `FoodRecord` records

## Entity: AuthSession

**Purpose**: Represents a mobile sign-in session controlled by the server.

**Fields**:

- `id`: string, primary key
- `userId`: string, foreign key to `User.id`
- `tokenHash`: string, hash of the opaque bearer token
- `createdAt`: ISO timestamp
- `expiresAt`: ISO timestamp
- `revokedAt`: ISO timestamp, nullable
- `lastSeenAt`: ISO timestamp, nullable

**Validation Rules**:

- `tokenHash` must never be returned in responses
- Only sessions with `revokedAt = null` and `expiresAt` in the future are valid

**Relationships**:

- Many `AuthSession` records belong to one `User`

**State Transitions**:

- `active` -> `revoked` when the user logs out
- `active` -> `expired` when `expiresAt` passes

## Entity: FoodRecord

**Purpose**: Represents a single saved analysis result for one primary food or beverage
image.

**Fields**:

- `id`: string, primary key
- `userId`: string, foreign key to `User.id`
- `imagePath`: string, local relative path to stored upload
- `recognizedName`: string
- `portionDescription`: string
- `caloriesKcal`: number
- `proteinGrams`: number
- `carbsGrams`: number
- `fatGrams`: number
- `confidenceLabel`: enum (`high`, `medium`, `low`)
- `confidenceReason`: string
- `retryRecommended`: boolean
- `retryReason`: string, nullable
- `analysisStatus`: enum (`succeeded`, `needs_retry`, `failed`)
- `createdAt`: ISO timestamp
- `updatedAt`: ISO timestamp

**Validation Rules**:

- `caloriesKcal`, `proteinGrams`, `carbsGrams`, and `fatGrams` must be zero or greater
- `analysisStatus = succeeded` requires calorie and macro values plus a recognized name
- `analysisStatus = needs_retry` requires `retryRecommended = true` and a non-empty
  `retryReason`
- Only `succeeded` records are persisted to user-visible history in V1

**Relationships**:

- Many `FoodRecord` records belong to one `User`

**State Transitions**:

- `failed` is internal-only for transient processing or provider errors
- `needs_retry` is returned to the client without creating a history record
- `succeeded` is stored and becomes visible in history

## Ownership And Access Rules

- Every `FoodRecord` must be queried by both `id` and `userId`
- History list, detail, and delete operations always scope by the authenticated user
- Session lookup must resolve to exactly one user before any history or analysis action
  proceeds
