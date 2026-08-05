# Koti - Bun API Generator

A CLI tool that generates Bun-based API projects with your choice of **Express** or **Elysia** framework and **MongoDB** or **PostgreSQL** database. Creates a complete, production-ready API project structure with authentication, RBAC, security middleware, and best practices built-in — identical features on every combination.

## Current Version: 3.2.0

> **Note:** Review all generated code before using in production environments. Update dependencies to latest secure versions after generation. This software is provided "as-is" without warranty of any kind.

## What's New in v3.2.0 🐘

Koti gains a second axis: pick your **database** the same way you pick your framework.

- **`koti new --database mongodb|postgres`** — PostgreSQL projects come with Drizzle ORM, `pg`, drizzle-kit, an initial migration for the built-in tables, and `db:generate` / `db:migrate` scripts. Everything else (auth, RBAC, audit log, documents, tiny URLs, Swagger) is feature-identical to the MongoDB output.
- **`koti model` speaks both dialects** — the same eight field types emit a Mongoose schema on MongoDB projects and a Drizzle `pgTable` on PostgreSQL ones, with matching CRUD services and validators (`Joi.string().uuid()` / `t.String({ format: 'uuid' })` for ObjectId fields on Postgres).
- **`koti db:switch <database>`** (MCP: `switch_database`) — converts an existing project between the two. Code only; see [Database Choice](#database-choice).
- **Models manifest** — `koti.config.json` now records every generated model's fields, so regeneration never has to re-parse your source.
- **Templates split along axes** — `templates/express|elysia` (framework), `templates/shared` (DB-neutral), `templates/db/mongodb|postgres` (database), composed at scaffold time. No file outside the MongoDB layer imports mongoose.
- **MCP server is now 10 tools**, with `create_project` taking a `database` parameter.

## What's New in v3.1.1 🛠️

Bug-fix release for the model generators (CLI and MCP alike):

- **Array fields now typecheck** — generated models emit Array-typed fields as `[{ type: Schema.Types.Mixed, ...options }]` instead of `{ type: Array }`, which Mongoose 8's TypeScript types reject. Models with Array fields now compile cleanly, alone or combined with `required`/`unique`/`index`/`default`.
- **`koti model:edit` no longer corrupts models** — editing a model previously dropped every `index: true` flag and silently removed Array-typed fields (the field parser couldn't read either back). Both are now parsed and preserved through regeneration.
- **Safer edits** — the model file is backed up to `.bak` before an edit overwrites it, matching the existing behavior for regenerated CRUD files.
- **Internal cleanup** — `cli.ts` reuses the shared generator helpers instead of local duplicates, `--framework` validation is driven by the shared `FRAMEWORKS` constant, and the publishing docs now describe what `npm run update-version` actually updates.

## What's New in v3.1.0 ⚙️

The shared generator core release — one code-generation engine behind both the CLI and the MCP server:

- **Framework-aware component generators** — `koti model`, `controller`, `service`, and `middleware` now emit idiomatic code for the project's framework (detected from `koti.config.json`). Elysia projects get Elysia controllers/routes and TypeBox validators; Express projects keep Joi. This delivers the follow-up promised in v3.0.0.
- **`koti model:edit` rebuilt** — permission-preserving CRUD regeneration with validator refresh, plus `index`/`default` support on model fields.
- **MCP server rewritten on the shared generators** — all 9 tools (`create_project`, `create_model`, `edit_model`, `create_enum`, `create_task`, `create_controller`, `create_service`, `create_middleware`, `seed_database`) call the generator core directly: real errors instead of false successes, no CLI stdin puppeteering, and a JSON-RPC stdio integration test covering every tool and resource.
- **`create_project` hardening** — optional `skipInstall`, hardened dependency install, and ~1,500 lines of dead code removed.
- **Version sync tooling** — `version.json` is the single source of truth; `npm run update-version` propagates it to `package.json`, `manifest.json`, and the README install line.
- **Real install docs + fresh bundle** — MCP install docs now describe the three real channels (global npm install + `koti-mcp`, `.mcpb` bundle, from source), with a fresh `.mcpb` built per release and `@modelcontextprotocol/sdk` pinned to 1.22.0 for stdio stability.

## What's New in v3.0.1 🔒

Security hardening for the generated auth layer (applies to **both** frameworks):

- **Fixed a silent auth bypass** — the Express auth middleware now `await`s the async token verification (previously an unawaited Promise was always truthy, so invalid tokens could pass). It also maps the token's `userId` onto `req.user.id` so RBAC/ownership checks work.
- **Corrected the refresh-token secret** — `tokenUtils` now reads the canonical `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` (matching `.env`, `.env.example`, and the docs). Previously a name mismatch meant refresh tokens silently used a hardcoded fallback secret.
- **No more hardcoded secret fallbacks** — missing `JWT_SECRET` now fails fast with a clear error instead of falling back to a default value.
- **Pinned JWT algorithm** — tokens are signed and verified with `HS256` only, preventing algorithm-confusion / `alg: none` attacks.

## What's New in v3.0.0 🎉

### Choose Your Framework: Express *or* Elysia

This major release adds **first-class [Elysia](https://elysiajs.com/) support** alongside Express, with **full feature parity** between the two.

- **Pick at create time** — `koti new my-api` now prompts you to choose Express or Elysia, or pass `--framework express|elysia` to skip the prompt (CI-friendly). The flag always wins; non-interactive runs default to Express.
- **Full parity** — Every Express feature is reproduced in idiomatic Elysia: JWT auth, RBAC (roles/permissions with `SUPER_ADMIN` wildcard), audit logging, document upload + S3, tinyURL shortener, Swagger/OpenAPI docs, email, and password reset/verification. Same endpoints, same response shapes, same env keys.
- **Idiomatic Elysia** — Auth + permissions implemented as a single Elysia macro, validation via TypeBox (`t`) schemas, global `onError` handler, `@elysiajs/swagger`, `elysia-rate-limit`, native `t.File()` uploads, and `Bun.file` streaming downloads. No Express shims.
- **`koti.config.json`** — Every generated project records its framework (and CLI version) so future tooling can detect it.

### Under the Hood

- **Restructured templates** — `templates/` is now split into `express/`, `elysia/`, and a framework-agnostic `shared/` layer (models, services, utils, enums, seeds, types) reused by both, so business logic stays single-sourced.
- **Framework-aware scaffolding** — `koti new` copies the chosen framework template + the shared layer, injects auto-generated JWT secrets, and writes `koti.config.json`. Inline Express code generation is now gated to Express only.
- **Validated** — Generated Elysia projects ship with zero `express` imports, all routes wired, type-clean against the shared baseline, and a green HTTP boot smoke (health, swagger spec, protected-route 401). CLI suite: 55/55 tests passing.

> **Note:** The framework choice currently applies to `koti new`. The component generators (`koti model/controller/service/middleware`) still emit Express-oriented code; framework-aware generators are planned for a follow-up release.

## What's New in v2.0.3

### RBAC & User Management
- **User CRUD** — Built-in user management at `/api/users` with list, create, update, soft-delete, and role assignment endpoints.
- **Independent `checkPermission` middleware** — Separate from `auth`. Routes that only need authentication use just `auth`; routes needing permissions chain `auth, checkPermission(Task.X)`. SUPER_ADMIN bypasses all permission checks.
- **Login response enrichment** — Login now returns `roles` (active role objects) and `tasks` (flat deduplicated array) so the frontend can control UI visibility.
- **Auto task generation** — `koti model` with CRUD now prompts to auto-create VIEW/CREATE/UPDATE/DELETE tasks and wire `checkPermission` into generated routes.
- **Master seed data** — `npm run seed` creates Super Admin + Admin roles and default users (`superadmin@app.com` / `admin@app.com`).
- **Barrel file auto-updates** — All CLI commands (`model`, `controller`, `service`, `middleware`, `enum`) auto-update their respective `index.ts` barrel files.

### Environment & Configuration
- **Comprehensive `.env` template** — `koti new` generates a full `.env` with all configuration sections: Server, Database, JWT, Security, Pagination, Google OAuth, Email, TinyURL, File Upload/S3. Database always points to `mongodb://localhost:27017/<project-name>`.
- **Auto-generated JWT secrets** — Cryptographically secure JWT and refresh token secrets injected via `crypto.randomBytes()`. No more placeholder secrets.
- **`.env.example` included** — Ships with every generated project as a reference template.

### Security & Fixes
- **TypeScript strict mode compatibility** — Fixed `delete` operator errors in model `toJSON` transforms for `ts-node` compatibility (`npm run seed` now works out of the box).

### CRUD & Validation
- **Joi validation generation** — `koti model` with CRUD now generates Joi validation schemas in `src/validators/` with `create` and `update` schemas mapped to your model fields.
- **Route-level validation** — Generated CRUD routes automatically wire up `validate()` middleware on POST/PUT endpoints.
- **Fixed CRUD file naming** — Changed from `toLowerCase()` to `toCamelCase()`, so `koti model UserProfile` correctly generates `userProfileController.ts`, `userProfileService.ts`, etc.

### Model Editing
- **Clean `.bak` backups** — `koti model:edit` now saves previous files as `.bak` instead of commenting out old code in the same file. Updated files are clean and compilable.
- **Fixed field parser** — `parseExistingModel` regex now correctly extracts all existing fields when editing models.

### Project Scaffolding
- **Template placeholder replacement** — `koti new` now recursively replaces `{{PROJECT_NAME}}` in all `.ts` and `.json` files copied from templates.
- **Validators directory** — `koti new` creates `src/validators/` alongside other src directories.
- **No more template overwrites** — `generateEssentialFiles()` no longer overwrites production-quality template files with simpler inline versions. Only `.env` is generated dynamically.

### Server & Runtime
- **Graceful shutdown** — Generated `server.ts` includes SIGTERM/SIGINT handlers that close the database connection.
- **Dynamic version** — Server reads version from `package.json` at startup instead of hardcoding `1.0.0`.

### Developer Experience
- **Hardened `getVersion()`** — Falls back gracefully through `version.json` → `package.json` → `0.0.0-unknown` instead of calling `process.exit(1)`.
- **Comprehensive test suite** — 55 tests (16 static + 39 integration) covering all CLI commands using vitest.
- **Centralized version** — Single `version.json` as the source of truth, referenced by CLI and tests.

## Features

- **Framework Choice**: Scaffold with **Express** or **Elysia** — full feature parity on either
- **TypeScript First**: Full TypeScript support with type safety
- **Bun Runtime**: Optimized for speed with modern JavaScript runtime
- **Express.js or Elysia**: Pick a minimal, flexible web framework at create time
- **Database Choice**: **MongoDB** (Mongoose ODM) or **PostgreSQL** (Drizzle ORM) — pick at create time, or convert later with `koti db:switch`
- **JWT Authentication**: Access and refresh token system with Google OAuth support
- **Security First**: Helmet, CORS, rate limiting, and password hashing
- **Input Validation**: Joi schemas on Express; TypeBox (`t`) schemas on Elysia — validation idiomatic to each framework
- **API Documentation**: Complete Swagger/OpenAPI 3.0 documentation
- **Graceful Shutdown**: Proper signal handling and database cleanup
- **Audit Logging**: Built-in audit trail for operations
- **Email Support**: Nodemailer integration for password reset and verification
- **File Uploads**: Multer-based file upload with S3 support

## MCP Server (use Koti from Claude)

Koti ships an MCP server so AI agents can scaffold and grow projects directly:

    npm install -g koti
    claude mcp add koti -- koti-mcp

10 tools: `create_project` (Express or Elysia × MongoDB or PostgreSQL), `create_model`
(+CRUD +RBAC), `edit_model`, `create_enum`, `create_task`, `create_controller`,
`create_service`, `create_middleware`, `seed_database`, `switch_database`.
Resources describe the project pointed to by
`KOTI_PROJECT_ROOT`. See MCP_DISTRIBUTION_GUIDE.md for Claude Desktop setup.

## Installation

### Global Installation (Recommended)

```bash
npm install -g koti@3.2.0
```

### Development Setup

```bash
git clone https://github.com/mynenikoteshwarrao/BunExpressSetup.git
cd BunExpressSetup
npm install
npm run build
```

## Commands

### `koti new <project-name>`

Creates a complete API project with all boilerplate, templates, and auto-installed dependencies. Prompts for the framework (Express or Elysia) unless `--framework` is supplied.

```bash
# Interactive — choose the framework and database when prompted
koti new my-awesome-api

# Non-interactive — choose explicitly (CI-friendly)
koti new my-awesome-api --framework elysia --database postgres
koti new my-awesome-api --framework express --database mongodb

# Either flag may be omitted; the defaults are express and mongodb
koti new my-awesome-api --database postgres

# `create` is an alias for `new`
koti create my-awesome-api --framework elysia
```

The generated project includes a `koti.config.json` recording the chosen framework and database.

### `koti model <name>`

Interactive command to create a data model with TypeScript types — a Mongoose schema on MongoDB projects, a Drizzle `pgTable` on PostgreSQL ones. Prompts for field names, types (String, Number, Date, Boolean, ObjectId, Array, Mixed, JSON), required/unique/indexed flags, and default values. Optionally generates full CRUD (controller, service, routes, Joi validation).

```bash
koti model Product
```

### `koti model:edit <name>`

Interactive command to add or delete fields on an existing model. Detects and optionally updates associated CRUD files. Previous files are saved as `.bak` backups.

### `koti db:switch <database>`

Converts an existing project between MongoDB and PostgreSQL. Run it from the project root.

```bash
koti db:switch postgres
koti db:switch mongodb
```

See [Database Choice](#database-choice) for exactly what it rewrites and what it leaves alone.

```bash
koti model:edit Product
```

### `koti controller <name>`

Generates a TypeScript controller with CRUD operation stubs.

```bash
koti controller Product
# Creates src/controllers/productController.ts
```

### `koti service <name>`

Generates a TypeScript service layer with business logic stubs.

```bash
koti service Product
# Creates src/services/productService.ts
```

### `koti middleware <name>`

Generates an Express middleware with proper TypeScript types.

```bash
koti middleware RateLimit
# Creates src/middleware/rateLimit.ts
```

### `koti enum <name>`

Interactive command to create a TypeScript enum (string or number type).

```bash
koti enum Status
```

### `koti task <name>`

Adds a new task to the RBAC Task enum with a description. Tasks can also be auto-generated when creating models with CRUD.

```bash
koti task MANAGE_ORDERS
# Adds MANAGE_ORDERS to src/enums/Task.ts
```

## Generated Project Structure

```
my-awesome-api/
├── src/
│   ├── config/
│   │   ├── database.ts         # Database connection (Mongoose or Drizzle)
│   │   ├── email.ts            # Email configuration
│   │   ├── logger.ts           # Logger configuration
│   │   ├── passport.ts         # Passport.js / Google OAuth
│   │   ├── s3.ts               # AWS S3 configuration
│   │   └── swagger.ts          # Swagger/OpenAPI 3.0 setup
│   ├── controllers/
│   │   ├── auditController.ts  # Audit logging controller
│   │   ├── authController.ts   # Authentication controller
│   │   ├── documentController.ts # Document management
│   │   ├── tinyUrlController.ts  # URL shortening
│   │   ├── userController.ts   # User CRUD controller
│   │   └── index.ts
│   ├── middleware/
│   │   ├── auditMiddleware.ts  # Audit logging middleware
│   │   ├── auth.ts             # JWT authentication
│   │   ├── authorize.ts        # RBAC authorization middleware
│   │   ├── checkPermission.ts  # Independent permission check middleware
│   │   ├── errorHandler.ts     # Centralized error handling
│   │   ├── validation.ts       # Joi validation middleware
│   │   └── index.ts
│   ├── models/
│   │   ├── AuditLog.ts         # Audit log model
│   │   ├── Document.ts         # Document model
│   │   ├── Role.ts             # Role model for RBAC
│   │   ├── TinyUrl.ts          # URL shortening model
│   │   ├── User.ts             # User model
│   │   └── index.ts
│   ├── routes/
│   │   ├── audit.ts            # Audit routes
│   │   ├── auth.ts             # Auth routes
│   │   ├── document.ts         # Document routes
│   │   ├── tinyUrl.ts          # URL shortening routes
│   │   ├── user.ts             # User CRUD routes
│   │   └── index.ts            # Route registry
│   ├── seeds/
│   │   ├── seed.ts             # Master seed (roles + users)
│   │   └── seedRoles.ts        # Role-only seed data
│   ├── services/
│   │   ├── auditService.ts     # Audit service
│   │   ├── authService.ts      # Auth with Google OAuth & email verification
│   │   ├── documentService.ts  # Document service
│   │   ├── tinyUrlService.ts   # URL shortening service
│   │   ├── userService.ts      # User CRUD service
│   │   └── index.ts
│   ├── schemas/                # Reserved for JSON schemas
│   ├── enums/                  # TypeScript enums (via koti enum)
│   ├── validators/             # Joi validation schemas (via koti model --crud)
│   ├── types/
│   │   └── api.ts              # API response types & interfaces
│   ├── utils/
│   │   ├── AppError.ts         # Custom error class
│   │   ├── logger.ts           # Logging utility
│   │   ├── responseHelper.ts   # Response formatting
│   │   ├── tokenUtils.ts       # JWT token utilities
│   │   └── index.ts
│   └── server.ts               # Entry point with graceful shutdown
├── .env                        # Auto-generated with secure secrets
├── .gitignore
├── drizzle.config.ts            # PostgreSQL projects only
├── drizzle/                     # PostgreSQL projects only — SQL migrations
├── koti.config.json            # Records the framework, database, CLI version, and model manifest
├── package.json
├── tsconfig.json
└── README.md
```

> **Framework differences:** the tree above shows the **Express** output. The **Elysia**
> project mirrors it with idiomatic equivalents — `config/oauth.ts` (hand-rolled Google
> OAuth2) instead of `config/passport.ts`, TypeBox (`t`) schemas in `middleware/validation.ts`
> instead of Joi (no `validators/`), a single auth+permission macro in `middleware/auth.ts`,
> and `utils/respond.ts` instead of `responseHelper.ts`. Models, services, seeds, enums, and
> types are shared verbatim between both frameworks.

## Database Choice

Koti scaffolds against **MongoDB** (Mongoose ODM) or **PostgreSQL** (Drizzle ORM). The two
outputs are feature-identical: same routes, same auth and RBAC, same audit log, same
Swagger docs, same JSON on the wire — every response carries a string `id`, never a raw
`_id`, so a client cannot tell which database is underneath.

One documented asymmetry: where MongoDB embeds a related record (the actor on an audit
log entry, for example), the embedded object is keyed `_id` on MongoDB and `id` on
PostgreSQL — the same `_id`-to-`id` rule the rest of the wire contract already follows.

### Choosing at create time

```bash
koti new my-api --database postgres
koti new my-api --database mongodb   # the default
```

The choice is recorded in `koti.config.json` and drives every later generator, so
`koti model`, `koti service`, and the MCP tools emit the right idiom without being told.

PostgreSQL projects additionally get `drizzle.config.ts`, a `drizzle/` directory holding
the initial migration for the built-in tables, and two scripts:

```bash
npm run db:generate   # diff your schema into a new SQL migration
npm run db:migrate    # apply pending migrations
```

### Switching later

```bash
cd my-api
koti db:switch postgres
```

What it does, and what it deliberately does not:

- **Code only.** Every model, service, seed, validator, and the database config are
  regenerated in the target idiom from the model manifest in `koti.config.json`.
- **Your data does not move.** The target database starts empty; re-run `npm run seed`.
  Exporting and importing your own data is out of scope.
- **Nothing is destroyed.** Every file the switch overwrites is kept alongside it as
  `<file>.bak`. Review them, then delete them once you are happy.
- **Dependencies and `.env` are rewritten.** The old layer's dependencies and scripts are
  removed, the old connection variable is commented out rather than deleted, and the new
  one is appended to `.env` and `.env.example`.
- **Migration-history caveat.** Switching *away* from PostgreSQL leaves `drizzle/` only as
  a `.bak` copy. Switching back restores that history if the `.bak` is still present;
  otherwise the project starts again from the shipped initial migration, which will not
  match a database that already has your tables. Keep the `.bak` if you intend to return.

### Field-type mapping

The eight field types are the same on both databases — only the emission changes:

| Field type | Mongoose | Drizzle |
| --- | --- | --- |
| String | `String` | `text()` |
| Number | `Number` | `doublePrecision()` |
| Date | `Date` | `timestamp({ withTimezone: true })` |
| Boolean | `Boolean` | `boolean()` |
| ObjectId | `Schema.Types.ObjectId` | `uuid()` |
| Array | `[{ type: Schema.Types.Mixed }]` | `jsonb().$type<any[]>()` |
| Mixed | `Schema.Types.Mixed` | `jsonb()` |
| JSON | `Schema.Types.Mixed` | `jsonb()` |

`required` becomes `NOT NULL`, `unique` a unique constraint, `index` an `index()`, and
`default` carries over where it can be expressed — a Date default of `Date.now` becomes
`defaultNow()`. A default that has no PostgreSQL equivalent is skipped with a warning
rather than failing the generation. Primary keys are `ObjectId` on MongoDB and
`uuid` (`gen_random_uuid()`) on PostgreSQL.

### Planned (not in this release)

Koti stays a scaffolder — you own every generated line — but the database axis opens a
roadmap:

- **v3.3+**: pg-boss job-queue scaffold, transactional-outbox generator, and a supported
  runtime test-harness tier (pglite / testcontainers).
- **Later**: an SSR/storefront template, relation-aware modeling (field `ref` targets
  becoming real foreign keys with typed join helpers), and a Bun-native SQL driver option.

Data migration between databases, Prisma, MySQL, and SQLite are **not** planned.

## Quick Start

```bash
koti new my-api
cd my-api
# Dependencies are auto-installed via bun or npm

# MongoDB projects: set MONGODB_URI in .env and start MongoDB
# PostgreSQL projects: set DATABASE_URL in .env, start Postgres, then:
#   npm run db:migrate
# (JWT secrets are pre-generated either way)

# Seed default roles and users
npm run seed

# Start development server
bun run dev
```

Open `http://localhost:8000/api-docs` for Swagger UI.

## API Endpoints

### Health & Status
- `GET /health` — Server health check
- `GET /api/` — API welcome message

### Authentication
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — User login (returns roles & tasks)
- `GET /api/auth/profile` — Get current user profile (protected)
- `POST /api/auth/refresh-token` — Refresh access token
- `POST /api/auth/logout` — User logout
- `POST /api/auth/forgot-password` — Request password reset email
- `POST /api/auth/reset-password` — Reset password with token

### User Management
- `GET /api/users` — List users (protected, VIEW_USERS)
- `GET /api/users/:id` — Get user by ID (protected, VIEW_USERS)
- `POST /api/users` — Create user (protected, CREATE_USER)
- `PUT /api/users/:id` — Update user (protected, UPDATE_USER)
- `DELETE /api/users/:id` — Soft-delete user (protected, DELETE_USER)
- `PUT /api/users/:id/roles` — Assign roles (protected, MANAGE_USER_ROLES)

### Documentation
- `GET /api-docs` — Interactive Swagger UI

## Environment Variables

The generated `.env` includes auto-generated secure secrets:

```env
NODE_ENV=development
PORT=8000

# MongoDB projects
MONGODB_URI=mongodb://localhost:27017/my-api
# PostgreSQL projects
DATABASE_URL=postgres://postgres:postgres@localhost:5432/my-api

JWT_SECRET=<auto-generated 128-char hex>
JWT_REFRESH_SECRET=<auto-generated 128-char hex>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:5000
API_URL=http://localhost:8000

DEFAULT_PAGE_LIMIT=10
MAX_PAGE_LIMIT=100

BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Dependencies (generated projects)

Framework and database dependencies are merged into one `package.json` at scaffold time.

### Express template
express, typescript, dotenv, cors, helmet, bcryptjs, jsonwebtoken, express-rate-limit, joi, swagger-jsdoc, swagger-ui-express, passport, passport-google-oauth20, express-session, nodemailer, multer, aws-sdk

### Elysia template
elysia, @elysiajs/cors, @elysiajs/swagger, elysia-rate-limit, dotenv, bcryptjs, jsonwebtoken, nodemailer, aws-sdk (validation via Elysia's built-in TypeBox `t`; uploads/downloads via native `t.File()` + `Bun.file` — no multer; OAuth2 hand-rolled — no passport)

### MongoDB layer
mongoose

### PostgreSQL layer
drizzle-orm, pg (dev: drizzle-kit, @types/pg) — plus the `db:generate` and `db:migrate` scripts.
Drizzle is a dependency of the *generated project* only; koti itself never depends on it.

### Development
ts-node / bun, @types/* (TypeScript type definitions)

## Testing

The CLI itself is tested with 59 vitest tests covering all commands, template integrity, and the auth/token security guards:

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests: `npm test`
4. Submit a pull request

## License

MIT License — free for personal and commercial use.

---

**Generated with Koti CLI v3.2.0** — [npm](https://www.npmjs.com/package/koti) | [GitHub](https://github.com/mynenikoteshwarrao/BunExpressSetup)
