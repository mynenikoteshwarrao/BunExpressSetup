# {{PROJECT_NAME}}

A modern API built with Bun, Express.js, and MongoDB.

## ⚠️ Development Disclaimer

**This project was generated using Koti CLI v2.0.3**

This is an initial development release and may contain errors, bugs, or security vulnerabilities. Please:
- Review all generated code before using in production
- Test thoroughly in development environments
- Update dependencies to latest versions
- Implement proper security measures for production use
- Use at your own discretion and risk

Generated code is provided "as-is" without warranty of any kind.

## 🚀 Features

- **Bun Runtime**: Lightning-fast JavaScript runtime
- **Express.js**: Minimal and flexible web framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **Authentication**: JWT-based authentication system
- **Security**: Helmet, CORS, rate limiting
- **Error Handling**: Centralized error handling
- **Validation**: Request validation and sanitization
- **Environment Config**: Environment-based configuration
- **RBAC**: Role-Based Access Control with task-based permissions
- **Independent Permission Middleware**: `checkPermission` — separate from `auth`, SUPER_ADMIN bypass
- **User CRUD**: Built-in user management with role assignment
- **Login Response Enrichment**: Login returns roles and tasks array for UI-level security
- **Seed Data**: Master seed with Super Admin + Admin roles and default users

## 📋 Prerequisites

- [Bun](https://bun.sh/) installed
- [MongoDB](https://www.mongodb.com/) installed and running
- Node.js 16+ (for development tools)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd {{PROJECT_NAME}}
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=8000
   MONGODB_URI=mongodb://localhost:27017/{{PROJECT_NAME}}
   JWT_SECRET=your-super-secret-jwt-key
   ```

<!-- DB_SETUP -->

5. **Start the development server**
   ```bash
   bun run dev
   ```

## 🏗️BUN Project Structure

```
{{PROJECT_NAME}}/
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB connection setup
│   │   ├── email.ts            # Email configuration (nodemailer)
│   │   ├── logger.ts           # Logger configuration
│   │   ├── passport.ts         # Google OAuth Passport.js setup
│   │   ├── s3.ts               # AWS S3 configuration
│   │   └── swagger.ts          # Swagger/OpenAPI 3.0 setup
│   ├── controllers/
│   │   ├── auditController.ts  # Audit logging controller
│   │   ├── authController.ts   # Authentication controllers
│   │   ├── documentController.ts # Document management controller
│   │   ├── tinyUrlController.ts # URL shortening controller
│   │   ├── userController.ts  # User CRUD controller
│   │   └── index.ts           # Controller exports
│   ├── enums/
│   │   ├── Task.ts            # Task enumeration for RBAC
│   │   └── index.ts           # Enum exports
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication middleware
│   │   ├── authorize.ts       # Authorization middleware with RBAC
│   │   ├── checkPermission.ts # Independent permission check middleware
│   │   ├── errorHandler.ts    # Error handling middleware
│   │   ├── validation.ts      # Joi validation middleware
│   │   └── index.ts           # Middleware exports
│   ├── models/
│   │   ├── AuditLog.ts        # Audit logging model
│   │   ├── Document.ts        # Document management model
│   │   ├── Role.ts            # Role model for RBAC
│   │   ├── TinyUrl.ts         # URL shortening model
│   │   ├── User.ts            # User model with Mongoose
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
│   │   ├── auditService.ts    # Audit logging service
│   │   ├── authService.ts     # Authentication service (returns roles & tasks on login)
│   │   ├── documentService.ts # Document management service
│   │   ├── tinyUrlService.ts  # URL shortening service
│   │   ├── userService.ts     # User CRUD service
│   │   └── index.ts           # Service exports
│   ├── types/
│   │   └── api.ts             # TypeScript type definitions
│   ├── utils/
│   │   ├── AppError.ts        # Custom error class
│   │   ├── logger.ts          # Logging utility
│   │   ├── responseHelper.ts  # Response helpers
│   │   ├── tokenUtils.ts      # JWT utilities
│   │   └── index.ts           # Utility exports
│   ├── validators/
│   │   └── # Request validation schemas
│   └── server.ts              # Main server file
├── dist/                      # Compiled JavaScript
├── uploads/                   # File upload storage
├── .env                       # Environment variables
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── bun.lockb                 # Bun lock file
└── README.md                 # Project documentation
```

## 📡 API Endpoints

### Health Check
- `GET /health` - Server health status

### General API
- `GET /api/` - API welcome message
- `GET /api/status` - Detailed API status

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile (protected)
- `POST /api/auth/refresh-token` - Refresh access token
- `PUT /api/auth/profile` - Update user profile (protected)
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
- `GET /api-docs` - Interactive Swagger UI documentation


## 🔧 Development

### Adding New Features

Use the Koti CLI to generate new components:

```bash
# Create new model
koti model Product

# Edit existing model
koti model:edit Product

# Create new controller
koti controller Product

# Create new service
koti service Email

# Create new middleware
koti middleware Logger

# Create new enum
koti enum Status

# Create new task (for RBAC)
koti task MANAGE_USERS
```

## 🔐 Role-Based Access Control (RBAC)

This project includes a built-in RBAC system for managing user permissions and access control.

### Seeding Roles & Users

```bash
# Seed everything (roles + users)
npm run seed

# Seed only roles
npm run seed:roles
```

`npm run seed` creates:
- **Super Admin** role — `SUPER_ADMIN` task (bypasses all permission checks)
- **Admin** role — `VIEW_USERS`, `CREATE_USER`, `UPDATE_USER`, `DELETE_USER`, `MANAGE_USER_ROLES`
- **superadmin** user — `superadmin@app.com` / `SuperAdmin@123` → Super Admin role
- **admin** user — `admin@app.com` / `Admin@123` → Admin role

The script is idempotent — running it multiple times won't create duplicates.

### Creating New Tasks

Tasks define what actions users can perform. Two ways to add tasks:

```bash
# Manual: create a single task
koti task MANAGE_ORDERS

# Automatic: when creating a model with CRUD + tasks
koti model Product
# Answer 'y' to "Generate CRUD operations?"
# Answer 'y' to "Add CRUD tasks for permission control?"
# Auto-creates: VIEW_PRODUCT, CREATE_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT
```

### Using Permission Middleware

The system provides two independent middleware layers:
- `auth` — authentication only (is the JWT token valid?)
- `checkPermission` — authorization only (does the user have the required tasks?)

```typescript
import { checkPermission } from '../middleware/checkPermission';
import { Task } from '../enums/Task';

// Route needing only authentication
router.get('/profile', auth, controller.getProfile);

// Route needing authentication + specific permission
router.delete('/users/:id', auth, checkPermission(Task.DELETE_USER), controller.delete);

// SUPER_ADMIN users automatically bypass all checkPermission checks
```

### Login Response

Login returns the user's roles and a flat deduplicated tasks array for UI-level security:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { ... },
  "roles": [{ "name": "Admin", "tasks": ["VIEW_USERS", "CREATE_USER", ...] }],
  "tasks": ["VIEW_USERS", "CREATE_USER", "UPDATE_USER", "DELETE_USER", "MANAGE_USER_ROLES"]
}
```

### Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build project
- `bun run start` - Start production server
- `npm run seed` - Seed database with roles and default users
- `npm run seed:roles` - Seed only roles

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support, please open an issue in the repository or contact the maintainer.

---

Generated with ❤️ by [Koti CLI](https://www.npmjs.com/package/koti)