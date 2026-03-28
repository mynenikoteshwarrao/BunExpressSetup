# Koti CLI v2.0.3 — Development Plan

**Branch:** `emergent-code`
**Created:** 2026-03-26
**Updated:** 2026-03-27
**Goal:** Document completion of v2.0.3 — all critical bugs, security hardening, core features, RBAC system, User CRUD, seed data, and comprehensive .env template.

---

## Phase 1 — Critical Bug Fixes (Priority: Immediate)

These are issues that would break the CLI for users installing from npm.

### 1.1 Fix `package.json` "files" field — missing `dist/` ✓

**Status:** COMPLETED
**File:** `package.json`
**Problem:** The `files` array includes `"koti"` and `"templates/"` but not `"dist/"`. Since `"bin"` points to `./dist/cli.js`, anyone installing via `npm install -g koti` gets a broken package — the compiled JS is never shipped.
**Fix Applied:** Added `"dist/"` to the `files` array. Also verified `"version.json"` is included since `cli.ts` reads it at runtime.

```json
"files": [
  "dist/",
  "templates/",
  "version.json",
  "README.md",
  "LICENSE"
]
```

### 1.2 Fix duplicated version string in README install command ✓

**Status:** COMPLETED
**File:** `README.md` (line 57)
**Problem:** `npm install -g koti@2.0.0-beta.1-beta.1` — the `-beta.1` suffix is doubled.
**Fix Applied:** Changed to `npm install -g koti@2.0.0-beta.1`.

### 1.3 Fix hardcoded version `'1.0.0'` in template server.ts ✓

**Status:** COMPLETED
**File:** `templates/src/server.ts` (line 56)
**Problem:** The health endpoint returns `version: '1.0.0'` instead of reading from `version.json` or `package.json`. The inline `generateServerTemplate()` in cli.ts does this correctly with `getVersion()`, but the template file doesn't.
**Fix Applied:** Updated to read version from `package.json` at runtime using `getVersion()`.

### 1.4 Fix inconsistent casing in CRUD generator ✓

**Status:** COMPLETED
**Files:** `src/cli.ts` — `generateCRUDController`, `generateCRUDService`, `generateCRUDRoutes`
**Problem:** Some generators use `modelName.toLowerCase()` while others use `toCamelCase(modelName)`. For a model named `UserProfile`, this produces `userprofile` vs `userProfile`, causing mismatched import paths that break compilation.
**Fix Applied:** Standardized on `toCamelCase()` everywhere for file naming. Verified with integration tests.

### 1.5 Fix `uuid` dependency mismatch ✓

**Status:** COMPLETED
**Files:** `README.md`, `src/cli.ts` (projectTemplates package.json)
**Problem:** README advertises UUID support, but the generated `package.json` doesn't include the `uuid` package, and generated models still use standard Mongoose `_id`.
**Fix Applied:** Removed UUID claims from README to match current implementation. Using Mongoose's native `_id` field.

---

## Phase 2 — Architecture Improvements (Priority: High)

These are structural changes that will make v2.0.0 maintainable long-term.

### 2.1 Split monolithic `cli.ts` into modules

**Status:** NOT COMPLETED (Deferred for v2.1)
**File:** `src/cli.ts` (~2700+ lines)
**Problem:** Every generator, every template string, every command handler, and every helper lives in one file. This makes it very hard to navigate, test, or extend.
**Proposed structure:**

```
src/
├── cli.ts                    # Entry point — only command registration
├── commands/
│   ├── new.ts                # `koti new` command
│   ├── model.ts              # `koti model` command
│   ├── modelEdit.ts          # `koti model:edit` command
│   ├── enum.ts               # `koti enum` command
│   ├── controller.ts         # `koti controller` command
│   ├── service.ts            # `koti service` command
│   └── middleware.ts         # `koti middleware` command
├── generators/
│   ├── model.ts              # generateTypeScriptModel, generateCRUDController, etc.
│   ├── enum.ts               # generateTypeScriptEnum
│   ├── controller.ts         # generateTypeScriptController
│   ├── service.ts            # generateTypeScriptService
│   ├── middleware.ts         # generateTypeScriptMiddleware
│   ├── routes.ts             # generateCRUDRoutes, updateMainRoutes
│   └── essentialFiles.ts     # generateEssentialFiles, generateServerTemplate
├── utils/
│   ├── colors.ts             # ANSI color helpers
│   ├── prompt.ts             # readline helpers (askQuestion, createReadlineInterface)
│   ├── strings.ts            # capitalize, toCamelCase, toKebabCase
│   ├── version.ts            # getVersion
│   └── parser.ts             # parseExistingModel, checkCRUDExists
└── types/
    └── index.ts              # DataType, ProjectTemplates, Colors interfaces
```

### 2.2 Resolve template duplication between `templates/` and inline strings ✓

**Status:** COMPLETED
**Problem:** The `templates/src/` directory contains complete, production-quality files (authService with Google auth, email verification, proper refresh token rotation). But `generateEssentialFiles()` in cli.ts overwrites some of these with simpler inline versions that have `// TODO` placeholders.
**Fix Applied:** Removed inline template overwrites from `generateEssentialFiles()`. Now uses `templates/` directory as single source of truth with template variable substitution.

### 2.3 Replace `createBackupWithNewCode` with clean file replacement ✓

**Status:** COMPLETED
**Problem:** When `model:edit` updates CRUD files, it comments out the entire old file and appends new code below. This produces files that won't compile (duplicate exports, duplicate class names, duplicate imports).
**Fix Applied:** Now writes backups to `.bak` files (e.g., `productController.ts.bak`) and does clean replacement of the original file.

### 2.4 Replace regex-based model parser with AST parsing

**Status:** NOT COMPLETED (Deferred for v2.1)
**File:** `parseExistingModel()` in cli.ts
**Problem:** Uses basic regex to extract schema fields. Breaks on nested schemas, array types with sub-schemas, multi-line field definitions, schemas with comments, or any non-trivial Mongoose schema.
**Proposed Fix:** Use `ts-morph` (TypeScript AST manipulation library) to properly parse the model file. This also opens the door for smarter code generation and editing.

---

## Phase 3 — Security & Robustness (Priority: Medium-High)

### 3.1 Auto-generate secure JWT secrets during project creation ✓

**Status:** COMPLETED
**File:** `generateEssentialFiles()` — `.env` generation
**Problem:** Generated `.env` ships with placeholder secrets (`your-super-secret-jwt-key-change-this-in-production`). Many developers will forget to change these.
**Fix Applied:** Now uses `crypto.randomBytes(64).toString('hex')` to generate unique random secrets during `koti new` and inserts them into the `.env` file.

### 3.2 Add graceful shutdown handling to generated server ✓

**Status:** COMPLETED
**File:** `templates/src/server.ts` and `generateServerTemplate()`
**Problem:** No `SIGTERM`/`SIGINT` handling for clean MongoDB disconnection, which matters for container deployments.
**Fix Applied:** Added graceful shutdown handlers to generated server for clean MongoDB disconnection on SIGTERM/SIGINT signals.

### 3.3 Harden `getVersion()` with fallback ✓

**Status:** COMPLETED
**Problem:** If `version.json` isn't found (symlink setups, monorepos, certain npm install scenarios), `getVersion()` calls `process.exit(1)` with a generic error.
**Fix Applied:** Implemented multiple fallback strategies. Tries `version.json` then `package.json`, returns `'0.0.0-unknown'` if both fail instead of crashing.

---

## Phase 4 — Missing Features (Priority: Medium)

### 4.1 Wire Joi validation into generated CRUD routes ✓

**Status:** COMPLETED
**Problem:** README lists Joi validation as a feature, but generated CRUD routes have no validation middleware. The validation middleware template exists in `templates/src/middleware/validation.ts` but is never used.
**Fix Applied:** Auto-generates Joi validation schemas alongside each model and applies them in the CRUD routes. Validators are created based on model field definitions.

### 4.2 Add a test framework ✓

**Status:** COMPLETED
**Problem:** No tests exist for the CLI or for generated projects. The test script is just `echo "Error: no test specified"`.
**Fix Applied:** Added `vitest` as a dev dependency to the CLI project. Wrote 55+ integration tests covering:
- Project generation with `koti new`
- Model and CRUD generation with `koti model`
- File existence and format validation
- Compiled output verification
- No import path mismatches in generated files
- Package.json validity checks

---

## Phase 5 — Polish (Priority: Low)

### 5.1 Add `--skip-install` and `--skip-git` flags to `koti new`

Allow users to skip the auto-install step (useful in CI or air-gapped environments) and optionally skip `git init`.

### 5.2 Add a `koti doctor` command

A diagnostic command that checks:
- Are all expected files present?
- Does `tsconfig.json` match the expected configuration?
- Are all route files registered in `routes/index.ts`?
- Are there any import path mismatches?

### 5.3 Improve the Swagger schema generation for CRUD models

Currently, the generated Swagger schema for CRUD models only includes `id`, `createdAt`, and `updatedAt`. It should also include all the user-defined fields with their types.

---

## Phase 6 — RBAC System (Priority: High) ✓

**Status:** COMPLETED
**Branch:** `emergent-code`

A complete role-based access control (RBAC) system has been implemented and integrated into the template. This provides a flexible foundation for authorization across the generated applications.

### Implementation Details

#### Core Models & Structures
- **Role Model:** Defines roles with:
  - `name` (string, unique) — e.g., 'Super Admin', 'Editor', 'Viewer'
  - `tasks` (array of Task enum values) — permissions granted to this role
  - `isSystem` (boolean) — whether role is system-protected (cannot be deleted)
  - `isActive` (boolean) — whether role is available for assignment
  - `createdAt` / `updatedAt` (timestamps)

- **Task Enum:** All available permissions in the system (Task type)
  - `SUPER_ADMIN` — default/catch-all permission
  - Extensible structure for adding new tasks

- **TaskDescriptions Record:** Human-readable descriptions for each task, used in CLI and documentation

#### Authorization Infrastructure
- **Middleware (`authorize.ts`):**
  - Extracts user roles from request context
  - Validates role existence and permissions
  - `SUPER_ADMIN` bypass: users with SUPER_ADMIN task can access anything
  - Returns 403 Forbidden if unauthorized
  - Returns 401 Unauthorized if no roles present

- **Usage Example:**
  ```typescript
  router.delete('/:id', authorize('ROLE_DELETE'), controller.delete);
  ```

#### Seed Data
- Master seed script (`seed.ts`) creates roles and default users
- `seedRoles.ts` creates roles independently
- Idempotent — safe to run multiple times

#### CLI Enhancement
- **`koti task` Command:** Allows developers to add new tasks to the system
  - Interactive prompt for task name and description
  - Generates/updates Task enum entry
  - Updates TaskDescriptions record
  - Makes new tasks immediately available for role assignment

#### User Model Integration
- User schema includes `roles` reference field (array of ObjectId → Role)
- Enables flexible role assignment (users can have multiple roles)
- Supports role-based access in middleware without refactoring

#### Benefits
- Granular permission control without hardcoded role names
- Easy to add new permissions via `koti task`
- Flexible (users → roles → tasks) hierarchy
- Production-ready with system role protection
- Integrates seamlessly with generated CRUD operations

---

## Phase 7 — User CRUD, checkPermission, Seed Data, Auto Tasks & Barrel Updates ✓

**Status:** COMPLETED
**Branch:** `emergent-code`

### 7.1 User CRUD Operations ✓
- Created `userService.ts` — getUsers (paginated, searchable), getUserById, createUser, updateUser, deleteUser (soft-delete), assignRoles
- Created `userController.ts` — full CRUD controller class
- Created `routes/user.ts` — all routes at `/api/users` with Swagger docs, protected by `auth` + `checkPermission`
- Added User CRUD tasks to Task.ts: `VIEW_USERS`, `CREATE_USER`, `UPDATE_USER`, `DELETE_USER`, `MANAGE_USER_ROLES`

### 7.2 Independent checkPermission Middleware ✓
- Created `checkPermission.ts` — separate from `auth` middleware
- `auth` handles authentication (JWT validation), `checkPermission` handles authorization (task checks)
- Routes that only need authentication use just `auth`; routes needing permissions chain `auth, checkPermission(Task.X)`
- SUPER_ADMIN bypass: users with SUPER_ADMIN task skip all permission checks
- Fetches user with populated roles, collects tasks from active roles

### 7.3 Login Response Enrichment ✓
- Modified `authService.ts` login to return `roles` (active role objects) and `tasks` (flat deduplicated array)
- Frontend can use the `tasks` array to conditionally render UI components

### 7.4 Auto Task Generation on Model Creation ✓
- `koti model` with CRUD now prompts: "Add CRUD tasks for permission control? (y/n)"
- If yes, auto-creates VIEW_X, CREATE_X, UPDATE_X, DELETE_X tasks in Task.ts
- Generated routes include `checkPermission` middleware with the appropriate tasks
- Uses `addTaskToEnum()` utility to safely insert into enum and TaskDescriptions

### 7.5 Barrel File Auto-Updates ✓
- Created `updateIndexExport()` utility — idempotent, creates index.ts if missing
- All CLI commands now auto-update barrel files:
  - `koti model` → models/index.ts (+ controllers/index.ts, services/index.ts if CRUD)
  - `koti controller` → controllers/index.ts
  - `koti service` → services/index.ts
  - `koti middleware` → middleware/index.ts
  - `koti enum` → enums/index.ts

### 7.6 Master Seed Data ✓
- Created `seed.ts` — seeds both roles and users
- Roles: Super Admin (SUPER_ADMIN task), Admin (user management tasks)
- Users: superadmin (superadmin@app.com), admin (admin@app.com) with assigned roles
- Updated `seedRoles.ts` to also include Admin role
- Added `npm run seed` and `npm run seed:roles` commands to package.json

---

## Phase 8 — .env Template, TypeScript Fixes & v2.0.3 Release ✓

**Status:** COMPLETED
**Branch:** `emergent-code`

### 8.1 Comprehensive .env Template ✓
- Created `templates/.env` with all configuration sections and sensible defaults
- Database always points to `mongodb://localhost:27017/{{PROJECT_NAME}}`
- Includes: Server, Database, JWT, Security, URLs, Pagination, Google OAuth, Email, TinyURL, File Upload/S3
- `generateEssentialFiles()` now reads the template `.env` and injects auto-generated JWT secrets via placeholder replacement
- Also copies `.env.example` (with JWT secrets commented out) to generated projects

### 8.2 TypeScript Strict Mode Fixes ✓
- Fixed `delete ret._id` / `delete ret.__v` errors in `Role.ts`, `User.ts`, `Document.ts`
- Added `any` typing to `toJSON.transform` function parameters (`doc: any, ret: any`)
- `ts-node` (used by `npm run seed`) enforces strict mode where `delete` requires optional operands

### 8.3 Fixed Invalid Dependency Version ✓
- **File:** `templates/package.json`
- **Problem:** `@types/passport-google-oauth20` was initially set to `^2.0.24`, which doesn't exist in npm registry
- **Fix Applied:** Corrected to `^2.0.14` which is the correct and available version
- **Verification:** Template builds without errors; generated projects compile successfully

---

## Completion Summary

### Completed in v2.0.3
- [x] 1.1 Fix `package.json` "files" field
- [x] 1.2 Fix README version typo
- [x] 1.3 Fix hardcoded version in template server.ts
- [x] 1.4 Fix inconsistent casing in CRUD generator
- [x] 1.5 Fix UUID dependency mismatch
- [x] 2.2 Resolve template duplication
- [x] 2.3 Replace backup approach with .bak files
- [x] 3.1 Auto-generate secure JWT secrets
- [x] 3.2 Add graceful shutdown handling
- [x] 3.3 Harden getVersion() with fallback
- [x] 4.1 Wire Joi validation into CRUD routes
- [x] 4.2 Add test framework (vitest, 55+ tests)
- [x] Phase 6 — Complete RBAC system implementation
- [x] 7.1 User CRUD operations (controller, service, routes)
- [x] 7.2 Independent checkPermission middleware
- [x] 7.3 Login response enrichment (roles + tasks)
- [x] 7.4 Auto task generation on model creation
- [x] 7.5 Barrel file auto-updates for all CLI commands
- [x] 7.6 Master seed data (roles + users)
- [x] 8.1 Comprehensive .env template with all defaults
- [x] 8.2 TypeScript strict mode fixes (delete operator in model transforms)
- [x] 8.3 Fixed invalid dependency version (@types/passport-google-oauth20)

### Deferred to v2.1
- [ ] 2.1 Split monolithic `cli.ts` into modules
- [ ] 2.4 Replace regex-based model parser with AST parsing
- [ ] 5.x Polish items (--skip-install, --skip-git, koti doctor, Swagger improvements)

---

## Success Criteria for v2.0.3 Stable — ALL MET ✓

- [x] `npm install -g koti` works and runs successfully
- [x] `koti new my-project` generates a project that compiles with zero errors
- [x] `koti model Product` with CRUD generates files with matching import paths
- [x] `koti model:edit Product` produces files that compile (now uses .bak backups)
- [x] All features mentioned in README actually work
- [x] 55+ integration tests pass in CI
- [x] No placeholder secrets ship in generated `.env` files (crypto.randomBytes)
- [x] Generated server handles graceful shutdown (SIGTERM/SIGINT handlers)
- [x] RBAC system fully implemented and integrated
- [x] Joi validation wired into CRUD operations
- [x] Version handling robust with multiple fallback strategies
