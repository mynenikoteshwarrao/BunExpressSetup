# Elysia Support — Development Plan

> Goal: make `koti new myapp --framework elysia` generate a **full-feature-parity** Elysia
> application that matches the existing Express template exactly (same endpoints, same auth,
> RBAC, audit, documents/S3, tinyURL, swagger, email), reusing the framework-agnostic
> `templates/shared/` code.
>
> Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Review Notes (incorporated)

> Consolidated multi-lens review applied **2026-06-16**. The plan was a strong parity
> inventory but, as an executable spec, had gaps that would yield an app that compiles yet
> diverges from Express (or breaks outright). Five lens themes drove the revisions:

1. **Factual mismatches vs the real Express template** — §1.1 mount list, the swagger surface,
   the `.env` key set, and the audit middleware were described inaccurately. The audit
   middleware is **dead/unwired code**; real audit logging happens **inside services**.
   *(Fixed in §1.1, §1.3, §1.4, §4.2 audit.ts, §4.6/§1.4 env.)*
2. **Framework-coupling the plan missed** — `shared/services/documentService.ts` is typed to
   `Express.Multer.File`, and shared services/seeds hard-import framework-provided config
   modules (`../config/{database,email,s3,logger}`). Neither was in §3. *(Added to §3.)*
3. **CLI wiring understated as "verify" when it is actively broken** — the shared copy is
   nested inside an `if framework/src exists` guard (no-ops for elysia), and
   `generateEssentialFiles` unconditionally writes Express Router files and overwrites `.env`.
   *(Rewritten in §5, reordered in §8.)*
4. **Elysia-specific correctness landmines** — async `verifyAccessToken` with `userId→id`
   remap, `t.File` web-File vs multer-object impedance, plugin scoping (`as:'global'`),
   validation 422-vs-400 contract, and per-route multer size/mime/field-name tiers.
   *(Fixed across §2, §4.2, §4.4.)*
5. **Testability** — done-criteria were mostly manual runtime checks requiring live
   Mongo/S3/SMTP/Google with no static typecheck gate and no parity matrix; the CLI is
   bundled to `dist/cli.js`, so `src/cli.ts` edits need a rebuild before vitest is meaningful.
   *(Split §7 into static/runtime tiers, added parity matrix, added build-before-test gate.)*

---

## ✅ Implementation Status (2026-06-16)

**Elysia support is built and validated to full parity.** Summary of what landed:

- **§3 shared decouple** — `types/api.ts` neutralized (express types moved to
  `express/src/types/express-api.ts`), `responseHelper.ts` relocated to express,
  `documentService` retyped to a neutral `UploadedFile` DTO, trivial `Types` import bug
  fixed, stray `.claude-flow/` removed from shared.
- **§5 CLI wiring** — inline Express writers gated behind `framework==='express'`; shared
  copy un-nested (now runs for elysia); `koti.config.json` written; **TTY-guarded**
  interactive framework prompt (`--framework` flag still wins; non-interactive → express);
  dead `generateServerTemplate` deleted.
- **§4 elysia/src** — full app authored: 6 config (database/logger/s3/email copied,
  swagger + oauth rewritten), 5 middleware (combined auth+RBAC macro, global `onError`,
  `t` validation, audit helper, respond util), all **5 resources** (auth, users, tiny,
  documents, audit) controllers + routes, `server.ts`, index. package.json/.env reconciled.
- **Validation** — generated Elysia project: **zero `from 'express'` imports**; **33 route
  registrations** (31 active + 2 conditional Google = parity); **`tsc --noEmit` adds ZERO
  errors** over the documented shared baseline; module graph loads under Bun (S3/email
  eager-init respect disabled flags); **HTTP boot smoke** green — `/api/health` 200,
  swagger spec served (25 OpenAPI paths), protected route returns **401** (auth macro +
  global error handler + plugin-scope propagation all confirmed). Repo suite **55/55 pass**
  (express scaffold regression + cli commands), incl. updated template-path tests.

**Intentional divergences from Express (documented inline):** combined auth+permission into
one macro (avoids Elysia macro-ordering hazard); dropped the redundant `/api/auth`
double-mount (URLs identical via index router); helmet replaced with a minimal header
setter (`@elysiajs/cors` ≠ helmet); JWT reuses `tokenUtils` (no `@elysiajs/jwt`).

**Not yet done (follow-ups):** runtime smoke with a live Mongo (register→login→CRUD round
trips, §7b) needs `mongodb-memory-server`; framework-aware generator commands
(`koti model/controller/...` emitting Elysia code) remain Express-only per §5 note.

---

## 0. Current State (why this is needed)

- `templates/express/src/` — complete Express app (server, 6 route files, 5 controllers, 7 middleware, config).
- `templates/shared/src/` — models, services, utils, enums, seeds, types (meant to be framework-agnostic).
- `templates/elysia/` — **only** `package.json`, `tsconfig.json`, `.env`, `.env.example`, `.gitignore`. **No `src/` at all.**
- Consequence: choosing Elysia today copies Elysia deps but `generateEssentialFiles` injects Express code → broken project.

The whole job below is to author `templates/elysia/src/` to full parity and decouple the shared layer.

---

## 1. Express Feature Inventory (the parity target)

Everything in this list must exist and behave identically in the Elysia template.

### 1.1 Server bootstrap (`server.ts`)
- [ ] MongoDB connect on boot (`config/database`)
- [ ] **Security headers — `helmet` is NOT CORS**: `@elysiajs/cors` does **not** provide
      helmet's security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.).
      Add an explicit decision for helmet parity — use an `elysia-helmet` plugin **or** a
      manual `onAfterHandle`/`onRequest` header setter to reproduce the security headers.
      CORS is a **separate** concern handled by `@elysiajs/cors` (applied globally).
- [ ] Rate limiting **scoped to `/api/*` only** (`app.use('/api/', limiter)` in Express —
      not global) (`elysia-rate-limit`) — 100 req / 15 min (see §2 for IP-keying).
- [ ] Body parsing (native in Elysia) — **JSON body limit is 10mb** in Express; reproduce it.
- [ ] Swagger mounted (`@elysiajs/swagger`)
- [ ] **Mount list (corrected to match real `server.ts`)**: mount **`indexRoutes` at `/api`**
      (which *internally* mounts `/auth`, `/users`, `/tiny`, `/documents`, `/audit`) **PLUS** a
      **redundant** `authRoutes` at `/api/auth` (so auth is double-mounted). It does **NOT**
      mount `/api/users`, `/api/tiny`, `/api/documents`, `/api/audit` directly. **Decision:**
      keep or drop the redundant `/api/auth` double-mount and record it as an intentional
      decision so URL paths stay parity-correct.
- [ ] `GET /health` (status, uptime, env, version)
- [ ] Global error handler (`.onError()`)
- [ ] 404 handler — reproduce the Express `notFound` 404 **body** as an `onError`
      `NOT_FOUND` branch (the 404 handler is a separate Express middleware, distinct from
      AppError mapping). The global `.onError` must distinguish Elysia built-in codes
      `NOT_FOUND` / `VALIDATION` / `PARSE` / `INTERNAL_SERVER_ERROR`.
- [ ] **Response serialization / status codes**: Elysia returns HTTP 200 for plain objects by
      default, but Express explicitly uses `res.status(201)` on register/create/upload. For
      each non-200 success endpoint (**201** on register, user create, document upload) set
      `set.status` explicitly per-endpoint rather than relying on the generic rule.
- [ ] Graceful shutdown (SIGTERM/SIGINT → mongoose close)
- [ ] Listen on `0.0.0.0:PORT`, log startup banner

### 1.2 Endpoints (full enumeration — all must match)
**`/api` (index)**
- [ ] `GET /api/health`
- [ ] `GET /api` (API info + endpoint map)

**`/api/auth`**
- [ ] `POST /register`
- [ ] `POST /login`
- [ ] `POST /forgot-password`
- [ ] `POST /reset-password`
- [ ] `POST /refresh`
- [ ] `POST /logout`
- [ ] `POST /verify-email`
- [ ] `POST /resend-verification`
- [ ] `GET /profile` (auth)
- [ ] `POST /profile-image` (auth + single image upload, 5 MB, image-only)
- [ ] `GET /google` + `GET /google/callback` (conditional on `ENABLE_GOOGLE_AUTH=true`)

**`/api/users`** (all `auth` + RBAC `checkPermission`)
- [ ] `GET /` → `VIEW_USERS` (pagination/search/sort/isActive query)
- [ ] `GET /:id` → `VIEW_USERS`
- [ ] `POST /` → `CREATE_USER`
- [ ] `PUT /:id` → `UPDATE_USER`
- [ ] `DELETE /:id` → `DELETE_USER` (soft delete)
- [ ] `PUT /:id/roles` → `MANAGE_USER_ROLES`

**`/api/documents`** (all `auth`)
- [ ] `POST /profile` (image upload, 10 MB, image-only)
- [ ] `POST /` (file upload, 50 MB, any type)
- [ ] `GET /` (list w/ pagination + filters)
- [ ] `GET /:id`
- [ ] `GET /:id/download` (streams file bytes; S3 or local)
- [ ] `PUT /:id` (metadata)
- [ ] `DELETE /:id`

**`/api/tiny`**
- [ ] `POST /shorten`
- [ ] `POST /redirect/:id`
- [ ] `GET /:id`

**`/api/audit`** (all `auth`)
- [ ] `GET /entity/:entityType/:entityId`
- [ ] `GET /my-history`
- [ ] `GET /stats`

### 1.3 Middleware behaviors
- [ ] `auth` — Bearer JWT verify → attach `user` to context
- [ ] `authorize(...tasks)` — RBAC, SUPER_ADMIN wildcard, role.isActive, OR-match
- [ ] `checkPermission(...tasks)` — same RBAC pattern (independent of auth)
- [ ] `errorHandler` + `notFound` — AppError → status/message, dev stack trace
- [ ] `validation` — request body validation (Joi today)
- [ ] `auditMiddleware` — **CORRECTION: this Express middleware is DEAD/UNWIRED CODE.**
      `captureAuditInfo`/`logAuditTrail` (the `res.json` override) is never imported or wired
      into any route or `server.ts`, and it depends on `req.sessionID` (express-session, which
      is not configured). **Real audit logging happens INSIDE services**:
      `documentService.updateDocument/deleteDocument` call `AuditService.logAction` directly,
      gated on an `updatedBy`/`deletedBy` actor id; `userService.deleteUser` takes `deletedBy`.
      → Do **not** port the middleware as the primary mechanism (it would double-log). See
      §4.2 audit.ts.

### 1.4 Config
- [ ] `database` — mongoose connect
- [ ] `swagger` — **full surface (larger than just `/docs/api` + `/api-docs`)**: the real
      `config/swagger.ts` exposes **FIVE endpoints plus a redirect**: `/docs/api` (UI),
      `/api-docs` (legacy alias UI), `/docs/api.json`, `/api-docs.json` (raw OpenAPI JSON),
      and `GET /docs` → **302 redirect** to `/docs/api`. `@elysiajs/swagger` serves one path by
      default, so all aliases + the redirect need **explicit extra routes**. Pass
      `documentation: { info, tags, components: { securitySchemes: { bearerAuth (http/JWT),
      apiKey } } }` into the plugin, and add per-route `detail: { security: [{ bearerAuth: [] }],
      tags }` on protected routes — auto-derived `t` schemas will **NOT** reproduce the
      hand-authored reusable component schemas (`ApiResponse`, `PaginatedResponse`,
      `ErrorResponse`, `ValidationError`) or the two securitySchemes. **Pin** whether to use
      `@elysiajs/swagger` vs `@elysiajs/openapi` for the Elysia version in use.
- [ ] `passport` — Google OAuth2 strategy (conditional)
- [ ] `s3` — AWS SDK manager: `uploadFile`, `deleteFile`, `getSignedUrl`, enable-gating
- [ ] `email` — nodemailer transport
- [ ] `logger` — logging util
- [ ] **Export-name parity is mandatory** (shared services/seeds import these by exact name):
      `database`→`connectDB`, `email`→`sendEmail` + `emailTemplates`, `s3`→`s3Config`,
      `logger`→`logger`. See §3 (cross-layer coupling) and §4.1.

### 1.5 Shared (reused as-is — DO NOT rewrite logic, only decouple types)
- Models: `User`, `Role`, `Document`, `TinyUrl`, `AuditLog`
- Services: `authService`, `userService`, `documentService`, `tinyUrlService`, `auditService`
- Utils: `AppError`, `logger`, `tokenUtils` (jsonwebtoken — works in Bun)
- Enums: `Task`; Seeds: `seed`, `seedRoles`

---

## 2. Express → Elysia Translation Rules

These are the idiom mappings every file must follow.

- [ ] **Handler signature**: `(req, res, next)` → context destructuring `({ body, params, query, set, headers, user }) => return value`. Return data instead of `res.json`; set status via `set.status`.
- [ ] **Router**: `express.Router()` → `new Elysia({ prefix: '/auth' })` with chained `.get/.post/...`.
- [ ] **Controllers**: class methods → plain functions taking Elysia context (or inline handlers). Keep calling the same `shared/services/*` — business logic unchanged.
- [ ] **Validation**: Joi schemas → Elysia `t` (TypeBox) on each route's `{ body, query, params }`.
      **Status/contract mismatch — must fix:** TypeBox validation returns **HTTP 422** by
      default, but the Express/Joi contract returns **400** with `{success:false, message,
      error:'ValidationError', statusCode:400}`. In `onError`, match `code === 'VALIDATION'`,
      **explicitly set `set.status = 400`** (override the 422 default), and reshape the error
      into the existing `ErrorResponse` body so clients see the identical 400 + message format
      as Joi. **Preserve the Joi rules exactly:** the password complexity regex (lowercase +
      uppercase + digit + special, min 8) and username 3-30 must be reproduced via
      `t.RegExp`/`t.String` constraints (or a handler-level check) — **decide and document**
      which.
- [ ] **Auth**: `auth` middleware → Elysia `derive`/`resolve` macro that reads `Authorization`
      header, calls `verifyAccessToken` (reuse `shared/utils/tokenUtils`) **or** `@elysiajs/jwt`
      + `@elysiajs/bearer`. Pick one — see §6 decisions. **Two correctness issues to fix:**
      (1) `verifyAccessToken` in `shared/utils/tokenUtils.ts` is **ASYNC** (returns a Promise) —
      the macro must `await` it (Express's `auth.ts` omits the `await`, a latent bug where
      `req.user.id` is undefined at runtime; the Elysia port should do it correctly and note
      this **intentional divergence**). (2) The token payload field is **`userId`**, but RBAC
      and all controllers read **`user.id`**. Use an async resolve/derive that does
      `const decoded = await verifyAccessToken(token)`, returns **401 on null**, and maps to a
      stable shape `user = { id: decoded.userId, email: decoded.email, username:
      decoded.username }` so downstream `user.id` keeps working. If the macro attaches the raw
      decoded payload, **ALL** RBAC + getProfile + ownership lookups break.
- [ ] **RBAC**: `authorize`/`checkPermission` → an Elysia **macro**. The logic needs an async
      DB call (`User.findById(...).populate('roles')`). In Elysia 1.x a macro that needs async
      guard logic must use **object-syntax** returning a `beforeHandle` (a `beforeHandle` cannot
      return context values; a naive `derive` runs for **every** request regardless of guard).
      Specify: `.macro({ permission: (tasks) => ({ async beforeHandle({ user, set }) { /* load
      roles, apply Set / SUPER_ADMIN wildcard / role.isActive / OR-match, throw new
      AppError('Forbidden', 403) on fail */ } }) })`. It must run **AFTER** the auth resolve
      (ordering matters) and must **THROW** `AppError` (caught by `onError`) rather than
      returning a body, to preserve error-shape parity.
- [ ] **Plugin encapsulation / scoping** (#1 cause of "my middleware silently doesn't apply"):
      by default, lifecycle hooks (`onError`, `derive`, auth/RBAC macros) registered inside a
      child Elysia plugin are **LOCAL** to that instance and do **NOT** propagate to the parent
      app or sibling route groups. Without `as: 'global'` (or applying on the root instance),
      the central `errorHandler` `.onError` and shared derives will **not** fire for routes
      mounted from other files. → Register the `errorHandler` `.onError` and any cross-cutting
      hook with `as: 'global'` (or on the root instance); expose auth/RBAC macros via a plugin
      applied to each protected route group with explicit scope. (Verified by the §7 check that
      a protected route in a separately-mounted file actually 401s/403s.)
- [ ] **Errors**: `errorHandler` → `.onError()`; `AppError` carries `statusCode`/`message`; dev stack in non-prod.
- [ ] **Rate limit**: `express-rate-limit` → `elysia-rate-limit`. **`elysia-rate-limit` does
      NOT key by client IP out of the box** like `express-rate-limit` — under Bun derive the IP
      via `server.requestIP(request)?.address` (with header fallback) in a `generator`, or the
      default generator may rate-limit all requests globally or throw. Express scopes the limiter
      to `/api/` only → mount the rate-limit plugin only on the `/api` Elysia sub-instance (not
      the root). Preserve the 100 req/15min and the "Too many requests" message.
- [ ] **CORS**: `cors` → `@elysiajs/cors` (security headers are a **separate** helmet concern, see §1.1).
- [ ] **File upload**: `multer` → native `t.File()` in body schema. **Three concrete per-route
      tiers (field names differ):** auth profile-image → field **`profileImage`**, **5MB**,
      image-only; documents/profile → field **`file`**, **10MB**, image-only; documents → field
      **`file`**, **50MB**, any type. Model as
      `t.Object({ profileImage: t.File({ type: 'image', maxSize: '5m' }) })`,
      `{ file: t.File({ type: 'image', maxSize: '10m' }) }`,
      `{ file: t.File({ maxSize: '50m' }) }`. **Field-name parity matters** (`profileImage` vs
      `file`). Add a handler-side mime re-check matching Express's explicit
      `mimetype.startsWith('image/')` guard. Note: Elysia only parses multipart when the body
      schema declares files, so these routes implicitly use `multipart/form-data` and must **not**
      be parsed as JSON.
- [ ] **File download/stream**: `res.download`/pipe → **two real branches** (don't conflate):
      **S3** → return a **302 redirect** to the signed URL (`set.redirect = await
      documentService.getDownloadUrl(...)`). **Local** → check existence (throw `AppError` 404 if
      missing), set `set.headers['Content-Disposition'] = 'attachment; filename=...'` and
      `Content-Type`, then `return Bun.file(filePath)` (streams lazily, no buffering). Note:
      `documentService` hardcodes `process.cwd()/uploads` (ignores `UPLOAD_PATH`), so the local
      round-trip works regardless of `UPLOAD_PATH`.
- [ ] **Swagger**: `swagger-jsdoc` (JSDoc comments) → `@elysiajs/swagger`; per-route `detail` + `t` schemas become the source of truth (JSDoc blocks dropped). See §1.4 for the full endpoint/alias/securityScheme surface.
- [ ] **Google OAuth**: `passport-google-oauth20` → manual OAuth2 redirect/callback (or an Elysia
      OAuth plugin). **"Reuse the same upsert logic" is not directly actionable** — that logic is
      embedded inside the passport Strategy closure (find by `googleId`, else link by email, else
      create), **not** a reusable function, and passport also uses `serializeUser`/`deserializeUser`
      + sessions. → First **extract** the upsert into a plain `async function
      upsertGoogleUser(profile)`. The hand-rolled OAuth2 callback calls it, issues the same
      access/refresh tokens as the password-login path, and redirects to `FRONTEND_URL` with
      tokens (matching `googleCallback`). **Drop** passport session serialize/deserialize entirely
      — the Elysia flow is stateless JWT.
- [ ] **Audit hook**: **do NOT use `onAfterHandle`/`mapResponse` as the primary mechanism** — the
      Express middleware it mirrors is dead code (§1.3) and a global response-level hook would
      **double-log**. Instead, thread `user.id` into `updateDocument(..., updatedBy)`,
      `deleteDocument(..., deletedBy)`, `deleteUser(..., deletedBy)` exactly as Express does
      (audit is logged inside the services). Drop the `req.sessionID` dependency. A global
      response-level audit hook is allowed only as a **deliberate enhancement BEYOND Express
      parity** — mark it as such.
- [ ] **tinyURL**: `tinyUrlController` builds the short-URL base from `process.env.TINY_BASE_URL
      || ` `` `${req.protocol}://${req.get('host')}` `` — `TINY_BASE_URL` is **absent** from
      `elysia/.env.example` and `req.protocol`/`req.get('host')` have no Elysia equivalent. →
      Supply `TINY_BASE_URL` in elysia `.env` and derive the fallback from Elysia request headers
      (`request.url` origin / `headers.host`). Keep the exact verbs: `POST /shorten`,
      `POST /redirect/:id` (reads optional `shortUrl` from **JSON body** — not GET), `GET /:id`.

---

## 3. Decouple the "shared" layer (prerequisite)

`templates/shared` currently has **Express imports** — it is not truly framework-neutral. Fix before building Elysia.

- [ ] `shared/src/types/api.ts` imports `Request from 'express'` (`AuthenticatedRequest`,
      `RequestHandler`, `AuthenticatedRequestHandler`). **Consumers (10 files):** all 5 express
      controllers AND all 5 express middleware import these from `'../types/api'`. Because
      `shared/types/api.ts` is flattened into express `src` as `types/api.ts`, the
      Express-`Request` types must remain resolvable **at that path** for express. →
      Keep framework-neutral DTOs (`ApiResponse`, `Pagination*`, `ErrorResponse`,
      `LoginRequest`, etc.) in `shared/src/types/api.ts` with **ZERO** express import; move
      `AuthenticatedRequest`/`RequestHandler`/`AuthenticatedRequestHandler` into
      `templates/express/src/types/express-api.ts` (or a type-augmentation), and **repoint the
      10 express files**. Confirm `shared/types/api.ts` compiles standalone.
- [ ] `shared/src/utils/responseHelper.ts` imports `Response from 'express'` and calls
      `res.status().json()`. → Either (a) move it to `express/` and create an Elysia-native
      equivalent (returns objects + sets `set.status`), or (b) refactor to return `{ status,
      body }` plainly. Decide in §6.
- [ ] **responseHelper barrel regression**: `shared/src/utils/index.ts` re-exports it
      (`export { sendSuccess, sendError, sendPaginatedResponse, sendValidationError } from
      './responseHelper';`). If responseHelper is moved/deleted from shared **without** editing
      this barrel, the shared utils barrel fails to compile and **breaks the EXISTING Express
      template**. → When relocating responseHelper, update `templates/shared/src/utils/index.ts`
      to drop/repoint the re-export, and grep for express consumers of
      `sendSuccess`/`sendError`/etc. to repoint their imports.
- [ ] **`shared/services/documentService.ts` is typed against `Express.Multer.File`** and reads
      `file.buffer` (Node Buffer), `file.originalname`, `file.mimetype`, `file.size` in **BOTH**
      `uploadDocument()` and `uploadProfileImage()`. Elysia's `t.File()` yields a web `File`/`Blob`
      exposing `.name`, `.type`, `.size` and async `.arrayBuffer()` — there is **no**
      `.buffer`/`.originalname`/`.mimetype`, so passing it straight in **fails at runtime**. →
      Change the shared service signature to a framework-neutral DTO `{ buffer: Buffer;
      originalname: string; mimetype: string; size: number }`; the Elysia controller builds it via
      `const buffer = Buffer.from(await file.arrayBuffer())`, mapping `file.name→originalname` and
      `file.type→mimetype`. (This file was previously missing from the decouple checklist.)
- [ ] **Cross-layer config coupling (previously missed):** `shared/services` and `shared/seeds`
      import framework-provided config modules that physically live in the **framework template**,
      not in shared. Confirmed: `documentService.ts` imports `../config/s3` (`s3Config`) and
      `../config/logger` (`logger`); `authService.ts` imports `../config/email` (`sendEmail`,
      `emailTemplates`); `seed.ts` and `seedRoles.ts` import `../config/database` (`connectDB`).
      These resolve only because the CLI flattens framework/src + shared/src into one `src/`. →
      The Elysia config modules (§4.1) **MUST export the EXACT same names** (see §1.4). Add a §7
      done-criterion that shared/services typecheck against the elysia config exports.
- [ ] Audit-related signature `AuditableRequest` (Express) → ensure `auditService.extractChanges`/`logAction` take plain params (no Express types) so both frameworks call them.
- [ ] Verify `tokenUtils`, `AppError`, `logger`, all models, all services, seeds, `Task` enum have **zero** `express` imports (grep). Anything that does → relocate or neutralize.
- [ ] **Exit-gate + rollback for the shared split** (this is the §8 step-1 prerequisite that
      "unblocks everything"; the split touches code consumed app-wide by Express and can silently
      break the Express regression target): after the split, scaffold an **EXPRESS** project and
      run `tsc --noEmit` — it **must pass BEFORE starting §4**. Do the split on a branch; if
      Express `tsc` fails and cannot be fixed quickly, **revert `shared/`** and instead **duplicate
      the two coupled files** (`api.ts`, `responseHelper.ts`) per-framework. (This
      duplicate-per-framework fallback is promoted to a §6 decision.)

---

## 4. Build `templates/elysia/src/` (the bulk)

Mirror the Express folder layout. Each item = one file at full parity.

### 4.1 Config
- [ ] `config/database.ts` — copy from express (mongoose, no HTTP coupling)
- [ ] `config/logger.ts` — copy/share
- [ ] `config/s3.ts` — copy from express (AWS SDK, no HTTP coupling)
- [ ] `config/email.ts` — copy from express (nodemailer)
- [ ] `config/swagger.ts` — **rewrite** for `@elysiajs/swagger` — full surface per §1.4 (info,
      securitySchemes `bearerAuth` (http/JWT) + `apiKey`, tags, reusable component schemas, the
      five UI/JSON endpoints + the `GET /docs` 302 redirect)
- [ ] `config/oauth.ts` — **rewrite** of passport Google strategy as plain OAuth2 helper
      (conditional on `ENABLE_GOOGLE_AUTH`). Extract `upsertGoogleUser(profile)` (see §2); drop
      passport session serialize/deserialize.
- [ ] **Bun eager-init note for `config/email.ts` and `config/s3.ts`**: both instantiate at
      **import time** (email creates a module-level transporter via `createEmailTransporter()`;
      s3 instantiates `new S3ConfigManager()`). When copied into elysia and imported by
      `shared/services` on boot, these run **eagerly under Bun**. → Verify they construct cleanly
      under Bun and respect the enable-gating env flags **before** failing. (See §7 boot smoke
      test.)

### 4.2 Middleware (Elysia plugins/macros)
- [ ] `middleware/auth.ts` — async `resolve` macro: `await verifyAccessToken(token)`, 401 on
      null, map `userId→id` to `user = { id, email, username }` (see §2 auth)
- [ ] `middleware/rbac.ts` — object-syntax macro returning an **async `beforeHandle`** (not a
      naive derive) that loads roles and **throws `AppError(403)`**; runs AFTER auth (see §2 RBAC)
- [ ] `middleware/errorHandler.ts` — `.onError()` plugin registered with **`as: 'global'`** (so it
      fires for routes mounted from other files — see §2 plugin scoping). Distinguish
      `NOT_FOUND`/`VALIDATION`/`PARSE`/`INTERNAL_SERVER_ERROR`; **force `VALIDATION` to 400** with
      the Joi-shaped `ErrorResponse` body; AppError mapping; dev stack in non-prod.
- [ ] `middleware/audit.ts` — **NOT** the primary mechanism. Express's audit middleware is dead
      code (§1.3); audit is logged **inside services** via `updatedBy`/`deletedBy` actor ids
      threaded from controllers. A global `onAfterHandle` audit hook is allowed only as a
      **deliberate enhancement beyond parity** (and must not double-log). Drop the `req.sessionID`
      dependency; derive metadata from `server.requestIP(request)` + `headers['user-agent']`.
- [ ] `middleware/validation.ts` — Elysia `t` schemas replacing the Joi register/login/forgot/reset
      schemas. Reproduce the **password complexity regex** (lower+upper+digit+special, min 8) and
      **username 3-30** via `t.RegExp`/`t.String` (or handler-level check). Validation must surface
      as **400** (not Elysia's default 422) via `onError` (see §2 validation).

### 4.3 Controllers (functions over Elysia context, reuse shared services)
- [ ] `controllers/authController.ts` — register, login, forgotPassword, resetPassword, refreshToken, logout, getProfile, googleAuth, googleCallback, verifyEmail, resendVerification, uploadProfileImage
- [ ] `controllers/userController.ts` — getAll, getById, create, update, delete, assignRoles
- [ ] `controllers/documentController.ts` — upload, uploadProfileImage, getUserDocuments, getDocumentById, downloadDocument (stream), updateDocument, deleteDocument
- [ ] `controllers/tinyUrlController.ts` — shortenUrl, redirectUrl, getUrl
- [ ] `controllers/auditController.ts` — getEntityHistory, getMyHistory, getAuditStats

### 4.4 Routes (Elysia instances with `t` schemas + `detail` for swagger)
- [ ] `routes/index.ts` — `GET /health`, `GET /`, mount sub-routers
- [ ] `routes/auth.ts` — all auth endpoints + conditional Google routes + profile-image upload schema
- [ ] `routes/user.ts` — CRUD + roles, each guarded by auth + rbac macro
- [ ] `routes/document.ts` — upload (`t.File`), list, get, download, update, delete
- [ ] `routes/tinyUrl.ts` — shorten, redirect/:id, get/:id
- [ ] `routes/audit.ts` — entity history, my-history, stats

### 4.5 Server
- [ ] `server.ts` — assemble all plugins/routes per §1.1, replace dead Express `generateServerTemplate`

### 4.6 Template config files (already present — AUDIT + reconcile, not "add deps")
- [ ] `templates/elysia/package.json` — **this is an audit/reconcile task, not an "add X" list.**
      The current `package.json` **ALREADY** contains `@elysiajs/cors`, `@elysiajs/swagger`,
      `@elysiajs/jwt`, `@elysiajs/bearer`, `@elysiajs/static`, `elysia-rate-limit`, `nodemailer`,
      `aws-sdk`, `bcryptjs`, `jsonwebtoken`, `joi`, `mongoose` — so the old "add X" list is stale
      and would cause duplicate churn. **Reconcile with §6:** if JWT decision = reuse `tokenUtils`
      (the lean), **REMOVE** `@elysiajs/jwt` and `@elysiajs/bearer`; if validation fully moves to
      `t` (the lean), **REMOVE** `joi` (shared Joi validation is express-only); decide whether
      `@elysiajs/static` is needed (local download uses `Bun.file`, so likely **not**); and **lock
      the swagger package name/version** (`@elysiajs/swagger` vs `@elysiajs/openapi`). List the
      **FINAL intended dependency set** rather than "confirm deps."
- [ ] `tsconfig.json` / `.env` / `.env.example` — **regenerate to a byte-identical key-set to
      `templates/express/.env.example`** (the current elysia `.env.example` is **NOT** at parity:
      it has `EMAIL_SERVICE`, `EMAIL_PASSWORD`, and only `JWT_SECRET`). Verify by grepping
      `process.env` across `templates/shared` and `templates/elysia/src`. The keys actually read
      by shared/express code: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`,
      `EMAIL_SECURE`, `EMAIL_FROM` (nodemailer); `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRES_IN`,
      `JWT_SECRET`, `JWT_EXPIRES_IN` (tokenUtils); `BCRYPT_ROUNDS`; `ENABLE_S3_UPLOADS`;
      `ENABLE_GOOGLE_AUTH`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`;
      `TINY_BASE_URL`; `FRONTEND_URL`; `MONGODB_URI`; `API_URL`; `UPLOAD_PATH`; `MAX_FILE_SIZE_MB`;
      `MAX_IMAGE_SIZE_MB`; `RATE_LIMIT_WINDOW_MS`; `RATE_LIMIT_MAX_REQUESTS`; `DEFAULT_PAGE_LIMIT`;
      `MAX_PAGE_LIMIT`. **Delete** the non-parity `EMAIL_SERVICE`/`EMAIL_PASSWORD` keys.

---

## 5. CLI wiring (so the template is actually used)

- [ ] **NEW** (grep confirms neither exists in `src/cli.ts` today — no inquirer/prompt/readline):
      add an interactive framework prompt ("Express or Elysia?") — requires a prompt lib or simple
      `readline`; the `--framework` flag bypasses it.
- [ ] **NEW** (no `koti.config` reference exists today): write `koti.config.json` (`{ framework,
      kotiVersion }`) into the generated project root **after** `generateEssentialFiles`, reusing
      the existing `getVersion()` helper for `kotiVersion`.
- [ ] **BLOCKING BUG — `generateEssentialFiles` is actively broken for elysia, not just an
      adjustment.** It is called **unconditionally** for both frameworks (`src/cli.ts` ~2786) and
      (a) writes `src/routes/index.ts` and `src/routes/auth.ts` containing `import { Router } from
      'express'` (~lines 1720-1721), and (b) **overwrites** `projectPath/.env` (~line 2207)
      **AFTER** the template `.env` was already copied. For elysia this injects Express route files
      and clobbers the copied elysia routes/`.env`. → **Gate ALL inline route/controller/middleware
      writers behind `if (framework === 'express')`.** Confirm via grep that no `fs.writeFile` in
      `generateEssentialFiles` targets routes/controllers/middleware for elysia. **IMPORTANT:** the
      `.env`-secret injection must still run for **BOTH** frameworks (it writes secrets the template
      `.env` lacks) — make it **framework-agnostic**, do **not** delete it. **This fix MUST land
      before any elysia route smoke test** (see reordered §8).
- [ ] **Shared copy is currently a no-op for elysia — fix the nesting.** In `src/cli.ts` (~line
      2733) `fs.copy(sharedSrcPath, projectSrcPath)` is **NESTED** inside `if (await
      fs.pathExists(templateSrcPath))` (the framework's *own* `src`). `templates/elysia` has no
      `src/`, so for elysia the whole block is skipped and shared is **NEVER** copied. →
      Un-nest the shared copy so `fs.copy(sharedSrcPath, projectSrcPath)` runs as its own
      top-level block guarded only on `pathExists(sharedSrcPath)`, independent of `templateSrcPath`.
      Verify shared is copied for **BOTH** express and elysia (elysia/src must exist for elysia to
      get framework files at all). Also fix the corrupted glyph in the success log
      (`? Copied shared source files`).
- [ ] Delete dead `generateServerTemplate`

> (Framework-aware generator commands — `koti model/controller/...` emitting Elysia code — are a
> separate follow-up tracked in the main implementation plan; this doc covers the **app template**.)

---

## 6. Open Decisions (resolve during implementation)

- [ ] **JWT**: reuse `shared/utils/tokenUtils` (jsonwebtoken, zero new deps, identical tokens to
      Express) vs `@elysiajs/jwt` (idiomatic). → *Lean: reuse tokenUtils for true parity & shared
      services.* **BLOCKING dependency — resolve BEFORE building §4.2 auth.** If reuse tokenUtils,
      the `@elysiajs/jwt`/`@elysiajs/bearer` deps are dead weight (remove per §4.6).
- [ ] **Shared-split strategy**: in-place split vs **duplicate the two coupled files (`api.ts`,
      `responseHelper.ts`) per-framework**. → *Lean: attempt the in-place split, but if the Express
      `tsc --noEmit` exit-gate (§3) fails and can't be fixed quickly, fall back to
      duplicate-per-framework.*
- [ ] **responseHelper**: refactor to framework-neutral return shape vs per-framework copies. →
      *Lean: Elysia controllers return plain objects; provide a tiny `elysia/utils/respond.ts` for
      status setting.* **Note:** the Express `sendValidationError` **ignores its `errors`
      argument** (the body never includes the passed errors). **Decide explicitly** whether the
      Elysia respond util mirrors this exactly for parity or fixes it as an intentional improvement
      — do not leave it ambiguous when claiming behavioral parity.
- [ ] **Validation**: full migration Joi→`t` vs keep Joi inside handlers. → *Lean: `t` schemas
      (gives free swagger).* **Caveat:** `t` defaults to **422**; the Joi contract is **400** — the
      `onError` override (§2) is mandatory, not optional.
- [ ] **Google OAuth**: hand-rolled OAuth2 vs third-party Elysia plugin. → *Lean: minimal
      hand-rolled to avoid extra dep churn.*
- [ ] **Swagger source**: per-route `detail` only vs a hand-written OpenAPI doc. → *Lean: per-route
      `detail` + `t` schemas* (plus hand-authored reusable component schemas + securitySchemes per
      §1.4).

---

## 7. Validation / Done criteria

> Split into two tiers because most runtime checks silently require **live services** (Mongo, S3,
> SMTP, Google) and are un-runnable in CI. The static tier needs **no external services**.

### 7a. Static / CI tier (no live services — wire into the existing vitest harness)

> `tests/commands.test.ts` already scaffolds via the **built** CLI (`CLI_PATH=dist/cli.js`).
> **The CLI is bundled — any `src/cli.ts` edit requires `npm run build` BEFORE tests/manual runs**,
> or the suite runs **stale code** (false-green). Reuse the existing `runCLI`/`TEST_DIR` harness.

- [ ] `koti new demo --framework elysia` scaffolds without error
- [ ] `bun install` succeeds in generated project
- [x] **DECISION (2026-06-16): typecheck gate = NO-NEW-ERRORS vs baseline, not exit 0.** The
      existing Express/shared templates were **never `tsc --noEmit` clean** (they target Bun/
      `ts-node` loose runtime; build is `bun build`). A scaffolded Express project has a
      **55-error baseline** (~19 in `templates/shared`, inherited by Elysia too — deep mongoose
      `.lean()` casts, schema static/instance methods not on the TS interface, barrel mismatches).
      Cleaning all of that is a separate Express type-hygiene project, out of Elysia scope.
      Baseline snapshot: `/tmp/koti-baseline-express-errors.txt` (regenerate into the repo as a
      committed fixture before relying on it in CI).
- [ ] **Automated static typecheck gate (revised):** after scaffolding an elysia project, run
      `bunx tsc --noEmit` and assert it adds **ZERO new errors beyond the documented shared
      baseline** (the ~19 shared-layer errors will appear; Elysia-authored `src/` must contribute
      none of its own). Trivial shared bugs fixed opportunistically: `documentService` missing
      `import { Types }` (done in §3).
- [ ] **Zero express imports:** recursively grep generated `src` and assert **ZERO** matches for
      `/from ['"]express['"]/`.
- [ ] **Express regression typecheck:** run the same `tsc --noEmit` gate on a scaffolded **EXPRESS**
      project to catch shared-layer-split regressions; Express template still generates (regression
      check).
- [ ] All **31** routes (per §1.2) present; swagger JSON contains every path.
- [ ] `shared/services` typecheck against the **elysia config exports** (`connectDB`, `sendEmail`+
      `emailTemplates`, `s3Config`, `logger`) — proves §3 export-name parity.
- [ ] **Cross-framework token parity:** a token minted by the **Express** template verifies in the
      **Elysia** template and vice-versa (same secret/alg/claims).
- [ ] `GET /api` returns the same endpoint-map keys as Express.

### 7b. Runtime smoke tier (explicit prerequisites)

> Prereqs: local Mongo (use **`mongodb-memory-server`** for CI), **S3 disabled → local storage**,
> **`ENABLE_GOOGLE_AUTH=false`**.

- [ ] **Boot smoke test:** importing `shared/services` does **not** throw when S3/email are disabled
      (verifies the §4.1 Bun eager-init note).
- [ ] `bun start` boots; `GET /health` and `GET /api` return expected JSON
- [ ] Auth flow works: register → login → `GET /profile` with Bearer token
- [ ] RBAC: protected user route 403s without permission, 200s with SUPER_ADMIN
- [ ] **Scope propagation:** a protected route in a **separately-mounted file** actually 401s/403s
      (proves plugin scope per §2 — `as: 'global'`).
- [ ] One document upload + download round-trips (local storage)
- [ ] tinyURL shorten + lookup works
- [ ] Swagger UI loads at `/docs/api` and lists all routes
- [ ] **Audit:** an audit row is written for a 2xx **mutating** request, captured with **ip +
      user-agent + change diff** (derive ip from `server.requestIP(request)`, ua from
      `headers['user-agent']`; sessionID has no stateless equivalent).
- [ ] List endpoints honor `page`/`limit`/`search`/`sort`/`isActive` query params; DELETE routes do
      **soft-delete**.

### 7c. Parity matrix (so "full parity" is measurably verifiable)

> Current criteria sampled only ~6 of the 31 endpoints — forgot/reset/refresh/logout/verify-email/
> resend-verification, all 6 user routes, and all 3 audit routes were never asserted. Fill in a
> table and make **"all rows checked"** a done-criterion.

| Express route + middleware | Elysia route | status-code parity | response-shape parity | checked |
|---|---|---|---|---|
| _(one row per all 31 §1.2 endpoints + 6 middleware)_ | | | | [ ] |

- [ ] **All rows checked** is a done-criterion.

---

## 8. Suggested execution order

1. **§3 decouple shared layer** (unblocks everything) — then run the **Express `tsc --noEmit`
   exit-gate** (§3); must pass before §4. Branch + revert/duplicate fallback ready.
2. **§5 `generateEssentialFiles` framework-agnostic fix + un-nest the shared copy** (moved EARLY
   from old step 5). Rationale: with it at the end, the steps below would smoke-test against
   **Express-clobbered** routes/auth/`.env` output and mislead. Do this **before** any elysia
   route smoke test.
3. **De-risking SPIKE (HIGH risk)** — prove the hardest, most uncertain Elysia idioms in isolation
   before full parity: `t.File` upload + `Bun.file` stream **download round-trip**; OAuth2
   **redirect/callback**; **swagger emitted from per-route `t` schemas**; plus an `onAfterHandle`
   reading body+status+user (for the optional audit enhancement).
4. §4.1 config + §4.2 middleware (foundation)
5. §4.3 controllers + §4.4 routes, one resource at a time: **auth → users → tiny → documents →
   audit**. **Google OAuth last/optional** for the parity gate (already conditional on
   `ENABLE_GOOGLE_AUTH`) so it cannot block core done-criteria.
6. §4.5 server assembly
7. §7 validation — **7a static/CI tier first**, then **7b runtime smoke** (with Mongo-memory/S3-off/
   Google-off), then **7c parity matrix**.
8. **Final:** `npm run build` (regenerate `dist/cli.js`) **then** `npm test` — both express and
   elysia scaffold tests must pass.
