#!/bin/bash
# Run this script locally to create all GitHub issues for the v2.0.0 development plan.
# Requires: gh CLI authenticated (run `gh auth login` first)
# Usage: chmod +x create-issues.sh && ./create-issues.sh

REPO="mynenikoteshwarrao/BunExpressSetup"
LABELS_CREATED=false

# Create labels first
echo "Creating labels..."
gh label create "bug" --description "Something isn't working" --color "d73a4a" --repo "$REPO" 2>/dev/null
gh label create "architecture" --description "Structural improvements" --color "0075ca" --repo "$REPO" 2>/dev/null
gh label create "security" --description "Security related" --color "e4e669" --repo "$REPO" 2>/dev/null
gh label create "feature" --description "New feature" --color "a2eeef" --repo "$REPO" 2>/dev/null
gh label create "polish" --description "Nice to have improvements" --color "d4c5f9" --repo "$REPO" 2>/dev/null
gh label create "critical" --description "Must fix before release" --color "b60205" --repo "$REPO" 2>/dev/null
gh label create "v2.0.0" --description "Target: v2.0.0 stable release" --color "006b75" --repo "$REPO" 2>/dev/null
echo ""

# --- Phase 1: Critical Bug Fixes ---

echo "Creating Phase 1 issues (Critical Bug Fixes)..."

gh issue create --repo "$REPO" \
  --title "Fix package.json 'files' field — dist/ and version.json missing from npm package" \
  --label "bug,critical,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
The `files` array in `package.json` includes `"koti"` and `"templates/"` but not `"dist/"` or `"version.json"`.

Since `"bin"` points to `./dist/cli.js` and the CLI reads `version.json` at runtime, anyone installing via `npm install -g koti` gets a broken package — the compiled JS and version file are never shipped.

## Fix
Update the `files` array:

```json
"files": [
  "dist/",
  "templates/",
  "version.json",
  "README.md",
  "LICENSE"
]
```

## Impact
**Critical** — npm installs are completely broken without this fix.

## Files
- `package.json`
EOF
)"

gh issue create --repo "$REPO" \
  --title "Fix duplicated version string in README install command" \
  --label "bug,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
README.md line 57 reads:
```
npm install -g koti@2.0.0-beta.1-beta.1
```
The `-beta.1` suffix is duplicated.

## Fix
Change to:
```
npm install -g koti@2.0.0-beta.1
```

## Files
- `README.md`
EOF
)"

gh issue create --repo "$REPO" \
  --title "Fix hardcoded version '1.0.0' in template server.ts health endpoint" \
  --label "bug,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
`templates/src/server.ts` line 56 has `version: '1.0.0'` hardcoded in the health endpoint. The inline `generateServerTemplate()` in `cli.ts` correctly calls `getVersion()`, but the template file doesn't.

Projects created from template files get a stale version number.

## Fix
Read version from the generated project's `package.json`:
```typescript
const packageJson = require('../package.json');
// In health endpoint:
version: packageJson.version
```

## Files
- `templates/src/server.ts`
EOF
)"

gh issue create --repo "$REPO" \
  --title "Fix inconsistent casing in CRUD file naming (toLowerCase vs toCamelCase)" \
  --label "bug,critical,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
CRUD generators inconsistently use `modelName.toLowerCase()` and `toCamelCase(modelName)` for file/import naming.

For a model named `UserProfile`:
- `toLowerCase()` → `userprofile`
- `toCamelCase()` → `userProfile`

This causes mismatched import paths that break TypeScript compilation.

## Fix
Standardize on `toCamelCase()` for all file naming in generators:
- `generateCRUDController`
- `generateCRUDService`
- `generateCRUDRoutes`
- `updateMainRoutes`

## Files
- `src/cli.ts` — all CRUD generator functions
EOF
)"

gh issue create --repo "$REPO" \
  --title "Fix UUID dependency mismatch — documented but not implemented" \
  --label "bug,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
README advertises UUID support ("Uses UUIDs instead of ObjectIds for better JSON serialization"), but:
1. Generated `package.json` doesn't include `uuid` or `@types/uuid`
2. Generated models still use standard Mongoose `_id`

## Fix
Either:
- **Option A:** Add `uuid` + `@types/uuid` to generated deps and wire UUID into generated models
- **Option B:** Remove UUID claims from README until properly implemented

## Files
- `README.md`
- `src/cli.ts` (projectTemplates, generateTypeScriptModel)
EOF
)"

# --- Phase 2: Architecture ---

echo "Creating Phase 2 issues (Architecture)..."

gh issue create --repo "$REPO" \
  --title "Split monolithic cli.ts (~2700 lines) into separate modules" \
  --label "architecture,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
`src/cli.ts` contains everything — all template generators, all commands, all string templates, all helpers — in a single ~2700 line file. This makes it extremely hard to navigate, test, or extend.

## Proposed Structure
```
src/
├── cli.ts                    # Entry point — only command registration
├── commands/
│   ├── new.ts
│   ├── model.ts
│   ├── modelEdit.ts
│   ├── enum.ts
│   ├── controller.ts
│   ├── service.ts
│   └── middleware.ts
├── generators/
│   ├── model.ts
│   ├── enum.ts
│   ├── controller.ts
│   ├── service.ts
│   ├── middleware.ts
│   ├── routes.ts
│   └── essentialFiles.ts
├── utils/
│   ├── colors.ts
│   ├── prompt.ts
│   ├── strings.ts
│   ├── version.ts
│   └── parser.ts
└── types/
    └── index.ts
```

## Effort
4-6 hours

## Files
- `src/cli.ts` → split into ~20 files
EOF
)"

gh issue create --repo "$REPO" \
  --title "Remove template duplication — generateEssentialFiles overwrites better template files" \
  --label "architecture,bug,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
The `templates/src/` directory has complete, production-quality files (authService with Google auth, email verification, refresh token rotation). But `generateEssentialFiles()` in cli.ts overwrites some of them with simpler inline versions full of `// TODO` placeholders.

The `new` command first copies from `templates/` then calls `generateEssentialFiles()` which overwrites:
- `routes/index.ts`
- `routes/auth.ts`
- `controllers/authController.ts`
- `middleware/auth.ts`
- `middleware/errorHandler.ts`
- `services/authService.ts`
- `utils/tokenUtils.ts`
- `.env`

## Fix
Remove the inline template strings from `generateEssentialFiles()`. Use the `templates/` directory as the single source of truth. Apply `{{PROJECT_NAME}}` replacement for dynamic values.

## Effort
2 hours

## Files
- `src/cli.ts` (generateEssentialFiles function)
- `templates/src/*`
EOF
)"

gh issue create --repo "$REPO" \
  --title "Fix model:edit backup approach — produces non-compilable files" \
  --label "architecture,bug,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
When `model:edit` updates CRUD files via `createBackupWithNewCode()`, it comments out the entire old file and appends new code below. This produces files with:
- Duplicate exports
- Duplicate class names
- Duplicate imports

These files will **not compile**.

## Fix
- **Option A:** Write backup to a `.bak` file and do a clean replacement
- **Option B:** Do a clean replacement and let git track the history (preferred)

## Files
- `src/cli.ts` — `createBackupWithNewCode()` and `model:edit` command
EOF
)"

gh issue create --repo "$REPO" \
  --title "Replace regex-based model parser with AST parsing (ts-morph)" \
  --label "architecture,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
`parseExistingModel()` uses basic regex to extract schema fields. It breaks on:
- Nested schemas
- Array types with sub-schemas
- Multi-line field definitions
- Schemas with comments
- Any non-trivial Mongoose schema

## Fix
Use `ts-morph` to properly parse TypeScript model files. This also enables smarter code generation and editing.

## Effort
3-4 hours

## Files
- `src/cli.ts` — `parseExistingModel()`
EOF
)"

# --- Phase 3: Security ---

echo "Creating Phase 3 issues (Security & Robustness)..."

gh issue create --repo "$REPO" \
  --title "Auto-generate secure JWT secrets during project creation" \
  --label "security,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
Generated `.env` ships with placeholder secrets:
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```
Many developers will forget to change these.

## Fix
Use `crypto.randomBytes(64).toString('hex')` during `koti new` to generate unique random secrets and insert them into `.env`.

## Effort
15 minutes

## Files
- `src/cli.ts` — `.env` generation in `generateEssentialFiles()`
EOF
)"

gh issue create --repo "$REPO" \
  --title "Add graceful shutdown handling to generated server" \
  --label "security,feature,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
Generated server has no SIGTERM/SIGINT handling for clean MongoDB disconnection. This matters for container/Docker deployments.

## Fix
Add to generated server template:
```typescript
const gracefulShutdown = async (signal: string) => {
  console.log(\`Received \${signal}. Shutting down gracefully...\`);
  await mongoose.connection.close();
  process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

## Effort
15 minutes

## Files
- `templates/src/server.ts`
- `src/cli.ts` — `generateServerTemplate()`
EOF
)"

gh issue create --repo "$REPO" \
  --title "Harden getVersion() — handle missing version.json gracefully" \
  --label "security,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
If `version.json` isn't found (symlink setups, monorepos), `getVersion()` calls `process.exit(1)` with a generic error. No helpful message, no fallback.

## Fix
Try multiple resolution strategies (version.json → package.json) and fall back to `'0.0.0-unknown'` instead of crashing.

## Effort
10 minutes

## Files
- `src/cli.ts` — `getVersion()`
EOF
)"

# --- Phase 4: Missing Features ---

echo "Creating Phase 4 issues (Missing Features)..."

gh issue create --repo "$REPO" \
  --title "Wire Joi validation into generated CRUD routes" \
  --label "feature,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
README lists Joi validation as a feature, but generated CRUD routes have no validation middleware. The validation middleware template exists in `templates/src/middleware/validation.ts` but is never used in generated routes.

## Fix
1. Auto-generate Joi validation schemas based on model fields
2. Apply validation middleware in generated CRUD routes:
```typescript
router.post('/', auth, validate(createSchema), controller.create);
router.put('/:id', auth, validate(updateSchema), controller.update);
```

## Effort
2 hours

## Files
- `src/cli.ts` — CRUD route generator
- New: validation schema generator
EOF
)"

gh issue create --repo "$REPO" \
  --title "Add test framework and basic integration tests" \
  --label "feature,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
No tests exist. Both the CLI and generated projects have `"test": "echo \"Error: no test specified\" && exit 1"`.

## Fix
1. Add `vitest` as a dev dependency
2. Write integration tests:
   - `koti new test-project` generates all expected files
   - `koti model Product` with CRUD generates compilable TypeScript
   - Generated `package.json` is valid with all required deps
   - No import path mismatches in generated CRUD files
3. Add test script to generated projects

## Effort
3-4 hours

## Files
- `package.json`
- New: `tests/` directory
EOF
)"

# --- Phase 5: Polish ---

echo "Creating Phase 5 issues (Polish)..."

gh issue create --repo "$REPO" \
  --title "Improve Swagger schema generation for CRUD models" \
  --label "polish,v2.0.0" \
  --body "$(cat <<'EOF'
## Problem
Generated Swagger schema for CRUD models only includes `id`, `createdAt`, `updatedAt`. User-defined fields with their types are not included.

## Fix
Include all user-defined model fields in the generated Swagger schema with proper OpenAPI types.

## Files
- `src/cli.ts` — `generateCRUDRoutes()`
EOF
)"

echo ""
echo "Done! All issues created successfully."
echo "View them at: https://github.com/$REPO/issues"
