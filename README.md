# Koti - Bun API Generator

A CLI tool that generates Bun-based API projects with Express.js and MongoDB setup. Creates a complete, production-ready API project structure with authentication, security middleware, and best practices built-in.

## Current Version: 2.0.3

> **Note:** Review all generated code before using in production environments. Update dependencies to latest secure versions after generation. This software is provided "as-is" without warranty of any kind.

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
- **Graceful shutdown** — Generated `server.ts` includes SIGTERM/SIGINT handlers with `mongoose.connection.close()`.
- **Dynamic version** — Server reads version from `package.json` at startup instead of hardcoding `1.0.0`.

### Developer Experience
- **Hardened `getVersion()`** — Falls back gracefully through `version.json` → `package.json` → `0.0.0-unknown` instead of calling `process.exit(1)`.
- **Comprehensive test suite** — 55 tests (16 static + 39 integration) covering all CLI commands using vitest.
- **Centralized version** — Single `version.json` as the source of truth, referenced by CLI and tests.

## Features

- **TypeScript First**: Full TypeScript support with type safety
- **Bun Runtime**: Optimized for speed with modern JavaScript runtime
- **Express.js**: Minimal and flexible web framework
- **MongoDB Integration**: Complete setup with Mongoose ODM
- **JWT Authentication**: Access and refresh token system with Google OAuth support
- **Security First**: Helmet, CORS, rate limiting, and password hashing
- **Input Validation**: Joi validation with auto-generated schemas for CRUD models
- **API Documentation**: Complete Swagger/OpenAPI 3.0 documentation
- **Graceful Shutdown**: Proper signal handling and database cleanup
- **Audit Logging**: Built-in audit trail for operations
- **Email Support**: Nodemailer integration for password reset and verification
- **File Uploads**: Multer-based file upload with S3 support

## Installation

### Global Installation (Recommended)

```bash
npm install -g koti@2.0.3
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

Creates a complete API project with all boilerplate, templates, and auto-installed dependencies.

```bash
koti new my-awesome-api
# or
koti create my-awesome-api
```

### `koti model <name>`

Interactive command to create a Mongoose model with TypeScript interfaces. Prompts for field names, types (String, Number, Date, Boolean, ObjectId, Array, Mixed, JSON), required/unique/indexed flags, and default values. Optionally generates full CRUD (controller, service, routes, Joi validation).

```bash
koti model Product
```

### `koti model:edit <name>`

Interactive command to add or delete fields on an existing model. Detects and optionally updates associated CRUD files. Previous files are saved as `.bak` backups.

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
│   │   ├── database.ts         # MongoDB connection
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
├── package.json
├── tsconfig.json
└── README.md
```

## Quick Start

```bash
koti new my-api
cd my-api
# Dependencies are auto-installed via bun or npm

# Configure MongoDB URI in .env (JWT secrets are pre-generated)
# Start MongoDB, then:

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

MONGODB_URI=mongodb://localhost:27017/my-api

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

## Dependencies

### Production
express, mongoose, typescript, dotenv, cors, helmet, bcryptjs, jsonwebtoken, express-rate-limit, joi, swagger-jsdoc, swagger-ui-express, morgan, passport, passport-google-oauth20, nodemailer, multer

### Development
ts-node, nodemon, @types/* (TypeScript type definitions)

## Testing

The CLI itself is tested with 55 vitest tests covering all commands:

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

**Generated with Koti CLI v2.0.3** — [npm](https://www.npmjs.com/package/koti) | [GitHub](https://github.com/mynenikoteshwarrao/BunExpressSetup)
