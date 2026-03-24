# Tasks: Food Calorie MVP

**Input**: Design documents from `D:\Project\CalSnap\specs\001-food-calorie-mvp\`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api.yaml`, `quickstart.md`

**Tests**: Verification is required for this feature. Contract, integration, and
demo-critical validation tasks are included because the spec, constitution, contracts,
and quickstart all require them.

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when the task touches different files and does not depend
  on incomplete work
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Every task includes exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the repository skeleton and baseline tooling for the mobile client
and API service.

- [X] T001 Create API workspace files in `api/package.json`, `api/tsconfig.json`, and `api/vitest.config.ts`
- [X] T002 [P] Create Flutter workspace files in `mobile/pubspec.yaml` and `mobile/analysis_options.yaml`
- [X] T003 [P] Create API bootstrap files in `api/src/app.ts` and `api/src/server.ts`
- [X] T004 [P] Create mobile bootstrap files in `mobile/lib/main.dart`, `mobile/lib/app/app.dart`, and `mobile/lib/app/bootstrap.dart`
- [X] T005 Create environment examples and startup placeholders in `api/.env.example`, `api/src/config/env.ts`, and `mobile/.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the core plumbing required by all user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Create the initial SQLite schema and migration in `api/src/db/schema.ts`, `api/src/db/client.ts`, and `api/src/db/migrations/001_initial.sql`
- [X] T007 [P] Implement shared HTTP error utilities in `api/src/shared/http-errors.ts` and `api/src/middleware/error-handler.ts`
- [X] T008 [P] Implement session authentication middleware in `api/src/middleware/auth.ts` and `api/src/modules/auth/auth.schemas.ts`
- [X] T009 [P] Implement upload storage helpers in `api/src/lib/storage.ts`
- [X] T010 [P] Implement PackyCode relay integration and structured response validation in `api/src/lib/packycode/client.ts`, `api/src/lib/packycode/prompts.ts`, and `api/src/lib/packycode/validate-result.ts`
- [X] T011 Wire shared API middleware and module registration in `api/src/app.ts` and `api/src/server.ts`
- [X] T012 [P] Implement shared mobile networking and session persistence in `mobile/lib/core/api/api_client.dart` and `mobile/lib/core/auth/session_store.dart`
- [X] T013 [P] Implement protected app routing shell in `mobile/lib/app/router.dart` and `mobile/lib/core/ui/app_scaffold.dart`

**Checkpoint**: Foundation ready. User story work can now proceed in priority order.

---

## Phase 3: User Story 1 - Sign In And Analyze One Item (Priority: P1) MVP

**Goal**: Let a user sign up or sign in, submit one clear food or beverage image, and
receive a structured estimate or retry guidance.

**Independent Test**: A new user can authenticate, submit a single-item image, receive
structured results with estimate messaging, and see the successful result stored.

### Tests for User Story 1

- [X] T014 [P] [US1] Add auth endpoint contract tests in `api/tests/contract/auth.contract.test.ts`
- [X] T015 [P] [US1] Add analysis endpoint contract tests covering success and retry responses in `api/tests/contract/analysis.contract.test.ts`
- [ ] T016 [P] [US1] Add end-to-end mobile auth and analysis test in `mobile/integration_test/auth_analysis_flow_test.dart`

### Implementation for User Story 1

- [X] T017 [P] [US1] Implement auth service and route handlers in `api/src/modules/auth/auth.service.ts` and `api/src/modules/auth/auth.routes.ts`
- [X] T018 [P] [US1] Implement analysis request and response schemas in `api/src/modules/analysis/analysis.schemas.ts`
- [X] T019 [US1] Implement analysis service with success persistence and retry refusal handling in `api/src/modules/analysis/analysis.service.ts`
- [X] T020 [US1] Connect auth and analysis modules to API startup in `api/src/app.ts` and `api/src/server.ts`
- [X] T021 [P] [US1] Implement mobile auth data and state management in `mobile/lib/features/auth/data/auth_repository.dart` and `mobile/lib/features/auth/logic/auth_controller.dart`
- [X] T022 [P] [US1] Implement mobile auth screens in `mobile/lib/features/auth/presentation/sign_in_page.dart` and `mobile/lib/features/auth/presentation/sign_up_page.dart`
- [X] T023 [P] [US1] Implement mobile analysis data and state management in `mobile/lib/features/analysis/data/analysis_repository.dart` and `mobile/lib/features/analysis/logic/analysis_controller.dart`
- [X] T024 [US1] Implement image capture, result display, estimate disclaimer, and retry messaging screens in `mobile/lib/features/analysis/presentation/capture_page.dart` and `mobile/lib/features/analysis/presentation/result_page.dart`
- [X] T025 [US1] Finalize session restoration and protected navigation in `mobile/lib/app/router.dart` and `mobile/lib/main.dart`

**Checkpoint**: User Story 1 should now be functional and demoable on its own.

---

## Phase 4: User Story 2 - Review Analysis History (Priority: P2)

**Goal**: Let an authenticated user browse only their own saved analysis history and
open one record in detail.

**Independent Test**: After one successful analysis exists, the same account can view a
reverse-chronological history list and open a matching detail screen.

### Tests for User Story 2

- [X] T026 [P] [US2] Add history list and detail contract tests in `api/tests/contract/history.contract.test.ts`
- [ ] T027 [P] [US2] Add mobile integration test for browsing saved history in `mobile/integration_test/history_flow_test.dart`

### Implementation for User Story 2

- [X] T028 [P] [US2] Implement history schemas and owner-scoped response mapping in `api/src/modules/history/history.schemas.ts` and `api/src/modules/history/history.service.ts`
- [X] T029 [US2] Implement history route handlers for list and detail in `api/src/modules/history/history.routes.ts`
- [ ] T030 [P] [US2] Implement mobile history data and state management in `mobile/lib/features/history/data/history_repository.dart` and `mobile/lib/features/history/logic/history_controller.dart`
- [ ] T031 [US2] Implement mobile history list and detail screens in `mobile/lib/features/history/presentation/history_list_page.dart` and `mobile/lib/features/history/presentation/history_detail_page.dart`
- [ ] T032 [US2] Link analysis results into history navigation in `mobile/lib/features/analysis/presentation/result_page.dart` and `mobile/lib/app/router.dart`

**Checkpoint**: User Stories 1 and 2 should now work independently and together.

---

## Phase 5: User Story 3 - Remove An Unwanted Record (Priority: P3)

**Goal**: Let an authenticated user delete one of their own saved records without
affecting other accounts or records.

**Independent Test**: A signed-in user can delete their own history record, see it
removed from the list, and cannot delete another user's record.

### Tests for User Story 3

- [X] T033 [P] [US3] Add delete authorization and ownership integration tests in `api/tests/integration/history_delete_auth.test.ts`
- [ ] T034 [P] [US3] Add mobile integration test for deleting a saved record in `mobile/integration_test/history_delete_flow_test.dart`

### Implementation for User Story 3

- [X] T035 [US3] Implement owner-scoped delete behavior in `api/src/modules/history/history.service.ts` and `api/src/modules/history/history.routes.ts`
- [ ] T036 [US3] Implement delete confirmation and action flow in `mobile/lib/features/history/presentation/history_detail_page.dart` and `mobile/lib/features/history/logic/history_controller.dart`
- [ ] T037 [US3] Refresh history list state after deletion in `mobile/lib/features/history/data/history_repository.dart` and `mobile/lib/features/history/presentation/history_list_page.dart`

**Checkpoint**: All planned user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete cross-story validation and final demo hardening.

- [ ] T038 [P] Add mobile widget coverage for estimate disclaimer and retry UI in `mobile/test/features/analysis/result_page_test.dart`
- [ ] T039 [P] Add API integration coverage for logout and unauthorized history access in `api/tests/integration/auth_history_guard.test.ts`
- [ ] T040 Run the documented demo-critical validation flow and update any clarified steps in `D:\Project\CalSnap\specs\001-food-calorie-mvp\quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; start immediately
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion; defines the MVP
- **User Story 2 (Phase 4)**: Depends on successful analysis persistence from User Story 1
- **User Story 3 (Phase 5)**: Depends on history list and detail support from User Story 2
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1**: No dependency on later stories; delivers the first demoable slice
- **US2**: Depends on US1 because history requires stored successful analysis records
- **US3**: Depends on US2 because deletion acts on history detail and list flows

### Within Each User Story

- Write verification tasks before implementation tasks
- Implement API contracts and services before wiring final mobile UI flows
- Complete story-specific happy path before cross-story polish

### Parallel Opportunities

- `T002`, `T003`, and `T004` can run in parallel after `T001` starts
- `T007` through `T010` can run in parallel after `T006`
- `T014`, `T015`, and `T016` can run in parallel within US1
- `T021` and `T022` can run in parallel once `T017` defines the auth contract shape
- `T026` and `T027` can run in parallel within US2
- `T033` and `T034` can run in parallel within US3
- `T038` and `T039` can run in parallel during polish

---

## Parallel Example: User Story 1

```bash
# Launch US1 verification work together:
Task: "T014 [US1] Add auth endpoint contract tests in api/tests/contract/auth.contract.test.ts"
Task: "T015 [US1] Add analysis endpoint contract tests covering success and retry responses in api/tests/contract/analysis.contract.test.ts"
Task: "T016 [US1] Add end-to-end mobile auth and analysis test in mobile/integration_test/auth_analysis_flow_test.dart"

# Launch mobile and API implementation tracks together after shared foundations:
Task: "T017 [US1] Implement auth service and route handlers in api/src/modules/auth/auth.service.ts and api/src/modules/auth/auth.routes.ts"
Task: "T021 [US1] Implement mobile auth data and state management in mobile/lib/features/auth/data/auth_repository.dart and mobile/lib/features/auth/logic/auth_controller.dart"
Task: "T023 [US1] Implement mobile analysis data and state management in mobile/lib/features/analysis/data/analysis_repository.dart and mobile/lib/features/analysis/logic/analysis_controller.dart"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the auth-plus-analysis demo loop

### Incremental Delivery

1. Deliver US1 for the core promise: authenticate and analyze one item
2. Add US2 to make the product persistent and reviewable
3. Add US3 to improve trust and account control
4. Run Phase 6 validation before calling the MVP complete

### Suggested MVP Scope

- Phase 1
- Phase 2
- Phase 3

---

## Notes

- All history-facing tasks preserve user-scoped authorization
- Analysis tasks preserve structured results and unsupported-scene retry behavior
- Quickstart validation is part of the deliverable, not optional follow-up work
- PackyCode integration remains server-only throughout implementation
