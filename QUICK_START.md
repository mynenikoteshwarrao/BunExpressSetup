# Quick Start Guide

## For Users (Installing Koti CLI)

The Koti CLI is now published to npm! Install and use it with:

```bash
# Install globally
npm install -g koti

# Create a new Bun API project (prompts for framework and database)
koti new my-awesome-api

# Or choose both up front
koti new my-awesome-api --framework elysia --database postgres

# Navigate to project and start
cd my-awesome-api
bun install
bun run dev

# Create interactive models (inside project directory)
koti model Product
koti model Category
koti model Order

# Create tasks for RBAC
koti task CreateProduct
koti task DeleteProduct

# Edit existing models (add/delete fields)
koti model:edit Product
```

### Enhanced TypeScript Code Generation

The latest version provides comprehensive TypeScript code generation:

```bash
# Create TypeScript models
koti model Product

# Create TypeScript enums
koti enum Status

# Create TypeScript controllers
koti controller Product

# Create TypeScript services
koti service Product

# Create TypeScript middleware
koti middleware Auth

# Create tasks for role-based access control
koti task ViewDashboard
koti task EditSettings
```

## Generated Project Structure

When users run `koti new project-name`, they get:

```
project-name/
├── src/
│   ├── config/
│   │   ├── database.ts         # Database connection (Mongoose or Drizzle)
│   │   ├── email.ts            # Email configuration (nodemailer)
│   │   ├── logger.ts           # Logger configuration
│   │   ├── passport.ts         # Google OAuth Passport.js configuration
│   │   ├── s3.ts               # AWS S3 configuration for file uploads
│   │   └── swagger.ts          # Swagger/OpenAPI 3.0 configuration
│   ├── controllers/
│   │   ├── auditController.ts  # Audit logging controller
│   │   ├── authController.ts   # Authentication controllers
│   │   ├── documentController.ts # Document management controller
│   │   ├── tinyUrlController.ts # URL shortening controller
│   │   ├── userController.ts  # User CRUD controller
│   │   └── index.ts           # Controller exports
│   ├── enums/
│   │   ├── Task.ts            # Task definitions for RBAC
│   │   └── index.ts           # Enum exports
│   ├── middleware/
│   │   ├── auditMiddleware.ts  # Audit trail middleware
│   │   ├── auth.ts            # JWT authentication middleware
│   │   ├── authorize.ts       # RBAC authorization middleware
│   │   ├── checkPermission.ts # Independent permission check middleware
│   │   ├── errorHandler.ts    # Error handling middleware
│   │   ├── validation.ts      # Joi validation middleware
│   │   └── index.ts           # Middleware exports
│   ├── models/
│   │   ├── AuditLog.ts        # Audit logging model
│   │   ├── Document.ts        # Document management model
│   │   ├── Role.ts            # Role model for RBAC
│   │   ├── TinyUrl.ts         # URL shortening model
│   │   ├── User.ts            # User model with TypeScript
│   │   └── index.ts           # Model exports
│   ├── routes/
│   │   ├── audit.ts           # Audit logging routes
│   │   ├── auth.ts            # Authentication routes
│   │   ├── document.ts        # Document management routes
│   │   ├── tinyUrl.ts         # URL shortening routes
│   │   ├── user.ts            # User CRUD routes (with checkPermission)
│   │   └── index.ts           # General API routes
│   ├── seeds/
│   │   ├── seed.ts            # Master seed (roles + users)
│   │   └── seedRoles.ts       # Role-only seed data
│   ├── services/
│   │   ├── auditService.ts    # Audit logging business logic
│   │   ├── authService.ts     # Authentication service (returns roles & tasks on login)
│   │   ├── documentService.ts # Document management service
│   │   ├── tinyUrlService.ts  # URL shortening service
│   │   ├── userService.ts     # User CRUD service
│   │   └── index.ts           # Service exports
│   ├── types/
│   │   └── api.ts             # API response types and interfaces
│   ├── utils/
│   │   ├── AppError.ts        # Custom error class
│   │   ├── logger.ts          # Logging utility
│   │   ├── responseHelper.ts  # Response helpers
│   │   ├── tokenUtils.ts      # JWT utilities
│   │   └── index.ts           # Utility exports
│   ├── validators/
│   │   └── (custom validators for data validation)
│   └── server.ts              # Main server file
├── dist/                      # Compiled JavaScript
├── uploads/                   # File upload storage (optional)
├── .env                       # Environment variables
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── bun.lockb                 # Bun lock file
└── README.md                 # Project documentation
```

## Step-by-Step Setup

### 1. Create New Project

```bash
# Create a new project
koti new my-blog-api

# Navigate to the project
cd my-blog-api
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env  # or use your preferred editor
```

Update the `.env` file with your settings:
```env
NODE_ENV=development
PORT=8000
# MongoDB projects
MONGODB_URI=mongodb://localhost:27017/my-blog-api
# PostgreSQL projects
DATABASE_URL=postgres://postgres:postgres@localhost:5432/my-blog-api
JWT_SECRET=your-secure-jwt-secret-here
JWT_REFRESH_SECRET=your-secure-refresh-secret-here
```

### 3. Install Dependencies

```bash
# Install dependencies (automatically done during generation)
bun install

# If bun install fails, use npm
npm install
```

### 4. Start Development Server

```bash
# Start with hot reload
bun run dev

# Alternative: Start with npm
npm run dev
```

### 5. Test Your API

Open your browser and visit:
- **API Health**: `http://localhost:8000/health`
- **API Documentation**: `http://localhost:8000/api-docs`
- **API Welcome**: `http://localhost:8000/api/`

### 6. Generate Additional Code

```bash
# Create a blog post model with full CRUD
koti model Post
# Follow prompts to add fields like title, content, authorId

# Create status enum
koti enum PostStatus
# Add values like: draft, published, archived

# Create custom middleware
koti middleware RoleAuth

# Create custom service
koti service EmailService
```

## Features Included

- **TypeScript First**: Full TypeScript support with type safety
- **Bun Runtime**: High-performance JavaScript runtime
- **Express.js or Elysia**: Web framework with comprehensive security middleware
- **MongoDB or PostgreSQL**: Mongoose ODM or Drizzle ORM — chosen at create time, switchable with `koti db:switch`
- **JWT Authentication**: Complete auth system with refresh tokens
- **Google OAuth**: Optional Google authentication with Passport.js
- **Email Service**: Nodemailer integration for email notifications
- **File Upload**: Document management with AWS S3 integration
- **URL Shortening**: TinyURL service with custom short codes
- **Audit Logging**: Complete audit trail for all operations
- **Role-Based Access Control (RBAC)**: Task-based authorization with role management
- **Independent Permission Middleware**: `checkPermission` — separate from `auth`, supports SUPER_ADMIN bypass
- **User CRUD**: Built-in user management (list, create, update, delete, assign roles)
- **Login Response Enrichment**: Login returns user's roles and flat tasks array for UI security
- **Auto Task Generation**: `koti model` with CRUD optionally generates VIEW/CREATE/UPDATE/DELETE tasks
- **Barrel File Auto-Updates**: All CLI commands auto-update index.ts exports
- **Seed Data**: Master seed creates Super Admin + Admin roles and default users
- **Security**: Helmet, CORS, rate limiting, password hashing
- **Error Handling**: Centralized error management with custom error classes
- **Validation**: Joi validation with detailed error messages
- **Documentation**: Complete Swagger/OpenAPI 3.0 documentation
- **Environment Config**: Comprehensive .env setup

## API Endpoints Generated

### Health & Status
- `GET /health` - Health check
- `GET /api/` - API welcome
- `GET /api/status` - API status

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user (protected)
- `POST /api/auth/refresh-token` - Refresh access token
- `PUT /api/auth/profile` - Update profile (protected)
- `POST /api/auth/logout` - User logout (protected)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/google` - Google OAuth login (if enabled)

### Document Management
- `POST /api/documents` - Upload document (protected)
- `GET /api/documents` - Get user documents (protected)
- `GET /api/documents/:id` - Get specific document (protected)
- `DELETE /api/documents/:id` - Delete document (protected)
- `POST /api/documents/profile-image` - Upload profile image (protected)

### URL Shortening
- `POST /api/tinyurl` - Create short URL
- `GET /api/tinyurl/:shortCode` - Redirect to original URL
- `GET /api/tinyurl` - Get user's URLs (protected)
- `DELETE /api/tinyurl/:id` - Delete short URL (protected)

### User Management
- `GET /api/users` - List users (protected, VIEW_USERS)
- `GET /api/users/:id` - Get user by ID (protected, VIEW_USERS)
- `POST /api/users` - Create user (protected, CREATE_USER)
- `PUT /api/users/:id` - Update user (protected, UPDATE_USER)
- `DELETE /api/users/:id` - Soft-delete user (protected, DELETE_USER)
- `PUT /api/users/:id/roles` - Assign roles (protected, MANAGE_USER_ROLES)

### Audit Logging
- `GET /api/audit` - Get audit logs (admin only)
- `GET /api/audit/:entityId` - Get entity audit history (admin only)
- `GET /api/audit/users/:userId` - Get user audit history (admin only)

### Documentation
- `GET /api-docs` - Interactive Swagger UI
- `GET /docs/api` - Alternative documentation endpoint

## RBAC Workflow

### Role-Based Access Control Setup

```bash
# Step 1: Seed default roles and users
npm run seed
# Creates: Super Admin role (SUPER_ADMIN task)
#          Admin role (user management tasks)
#          superadmin user (superadmin@app.com / SuperAdmin@123)
#          admin user (admin@app.com / Admin@123)

# Step 2: Create a model with CRUD + auto-generated tasks
koti model Product
# Answer 'y' to "Generate CRUD operations?"
# Answer 'y' to "Add CRUD tasks for permission control?"
# Auto-creates: VIEW_PRODUCT, CREATE_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT

# Step 3: Or create tasks manually
koti task MANAGE_ORDERS

# Step 4: Routes use independent middleware:
#   auth          → checks JWT token (authentication)
#   checkPermission → checks user tasks (authorization)
#
# import { checkPermission } from '../middleware/checkPermission';
# import { Task } from '../enums/Task';
# router.get('/products', auth, checkPermission(Task.VIEW_PRODUCT), getAll);

# Step 5: SUPER_ADMIN users bypass all checkPermission checks
```

### Seeding

```bash
# Seed roles + users (recommended)
npm run seed

# Seed only roles
npm run seed:roles
```

### Login Response

Login now returns the user's roles and a flat list of tasks for UI-level security:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { ... },
  "roles": [{ "name": "Admin", "tasks": ["VIEW_USERS", "CREATE_USER", ...] }],
  "tasks": ["VIEW_USERS", "CREATE_USER", "UPDATE_USER", "DELETE_USER", "MANAGE_USER_ROLES"]
}
```

## Development Workflow

### 1. Model-First Development

```bash
# Step 1: Create your data models
koti model User
koti model Product
koti model Order

# Step 2: Create tasks for access control
koti task ViewUser
koti task EditUser
koti task DeleteUser

# Step 3: Create enums for constants
koti enum OrderStatus
koti enum UserRole

# Step 4: Create custom services
koti service PaymentService
koti service NotificationService

# Step 5: Create custom middleware
koti middleware RoleAuth
koti middleware AuditLogger
```

### 2. Testing Your API

```bash
# Register a new user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Use the token for protected routes
curl -X GET http://localhost:8000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Development Commands

```bash
# Start development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Type checking
bun run type-check

# Seed roles and users to database
npm run seed

# Seed only roles
npm run seed:roles

# Run tests (when implemented)
bun run test
```

## For Developers (Publishing to npm)

### 1. Quick Setup
```bash
# Run the setup script
./setup-npm.sh
```

### 2. Manual Setup
```bash
# Make executable
chmod +x koti

# Install dependencies
npm install

# Build TypeScript
npm run build

# Test locally
npm pack
```

### 3. Publish to npm
```bash
# Login to npm (first time only)
npm login

# Publish package
npm publish
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**

   MongoDB projects:
   ```bash
   # Make sure MongoDB is running
   mongod

   # Or use MongoDB Atlas connection string
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   ```

   PostgreSQL projects:
   ```bash
   # Make sure Postgres is running and DATABASE_URL points at it
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/my-blog-api

   # Then apply the migrations before seeding
   npm run db:migrate
   ```

2. **Port Already in Use**
   ```bash
   # Change port in .env file
   PORT=3000
   ```

3. **JWT Secret Error**
   ```bash
   # Generate secure JWT secrets
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

4. **TypeScript Compilation Error**
   ```bash
   # Check TypeScript configuration
   bun run type-check
   
   # Rebuild project
   bun run build
   ```

### Debug Mode

Enable debug mode for detailed error messages:
```env
NODE_ENV=development
DEBUG=true
```

## Support

For issues or questions:
1. Check the generated project's README.md
2. Review the main README.md for comprehensive documentation
3. Ensure your database (MongoDB or PostgreSQL) is running and environment variables are configured
4. Create an issue in the GitHub repository

---

**Koti CLI v2.0.3 - Stable Release**