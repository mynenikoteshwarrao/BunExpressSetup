# Quick Start Guide

## For Users (Installing Koti CLI)

The Koti CLI is now published to npm! Install and use it with:

```bash
# Install globally
npm install -g koti@1.0.9

# Create a new Bun API project
koti new my-awesome-api

# Navigate to project and start
cd my-awesome-api
bun install
bun run dev

# Create interactive models (inside project directory)
koti create:model Product
koti create:model Category
koti create:model Order
```

### Enhanced TypeScript Code Generation

The latest version provides comprehensive TypeScript code generation:

```bash
# Create TypeScript models with UUIDs
koti create:model Product

# Create TypeScript enums
koti create:enum Status

# Create TypeScript controllers
koti create:controller Product

# Create TypeScript services
koti create:service Product

# Create TypeScript middleware
koti create:middleware Auth
```

## Generated Project Structure

When users run `koti new project-name`, they get:

```
project-name/
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB connection with UUID support
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
│   │   └── index.ts           # Controller exports
│   ├── middleware/
│   │   ├── auditMiddleware.ts  # Audit trail middleware
│   │   ├── auth.ts            # JWT authentication middleware
│   │   ├── errorHandler.ts    # Error handling middleware
│   │   ├── validation.ts      # Joi validation middleware
│   │   └── index.ts           # Middleware exports
│   ├── models/
│   │   ├── AuditLog.ts        # Audit logging model
│   │   ├── Document.ts        # Document management model
│   │   ├── TinyUrl.ts         # URL shortening model
│   │   ├── User.ts            # User model with UUID and TypeScript
│   │   └── index.ts           # Model exports
│   ├── routes/
│   │   ├── audit.ts           # Audit logging routes
│   │   ├── auth.ts            # Authentication routes
│   │   ├── document.ts        # Document management routes
│   │   ├── tinyUrl.ts         # URL shortening routes
│   │   └── index.ts           # General API routes
│   ├── services/
│   │   ├── auditService.ts    # Audit logging business logic
│   │   ├── authService.ts     # Authentication service
│   │   ├── documentService.ts # Document management service
│   │   ├── tinyUrlService.ts  # URL shortening service
│   │   └── index.ts           # Service exports
│   ├── types/
│   │   └── api.ts             # API response types and interfaces
│   ├── utils/
│   │   ├── AppError.ts        # Custom error class
│   │   ├── logger.ts          # Logging utility
│   │   ├── responseHelper.ts  # Response helpers
│   │   ├── tokenUtils.ts      # JWT utilities
│   │   └── index.ts           # Utility exports
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
MONGODB_URI=mongodb://localhost:27017/my-blog-api
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
koti create:model Post
# Follow prompts to add fields like title, content, authorId

# Create status enum
koti create:enum PostStatus
# Add values like: draft, published, archived

# Create custom middleware
koti create:middleware RoleAuth

# Create custom service
koti create:service EmailService
```

## Features Included

- **TypeScript First**: Full TypeScript support with type safety
- **Bun Runtime**: High-performance JavaScript runtime
- **Express.js**: Web framework with comprehensive security middleware
- **MongoDB**: Database with Mongoose ODM and UUID support
- **JWT Authentication**: Complete auth system with refresh tokens
- **Google OAuth**: Optional Google authentication with Passport.js
- **Email Service**: Nodemailer integration for email notifications
- **File Upload**: Document management with AWS S3 integration
- **URL Shortening**: TinyURL service with custom short codes
- **Audit Logging**: Complete audit trail for all operations
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

### Audit Logging
- `GET /api/audit` - Get audit logs (admin only)
- `GET /api/audit/:entityId` - Get entity audit history (admin only)
- `GET /api/audit/users/:userId` - Get user audit history (admin only)

### Documentation
- `GET /api-docs` - Interactive Swagger UI
- `GET /docs/api` - Alternative documentation endpoint

## Development Workflow

### 1. Model-First Development

```bash
# Step 1: Create your data models
koti create:model User
koti create:model Product
koti create:model Order

# Step 2: Create enums for constants
koti create:enum OrderStatus
koti create:enum UserRole

# Step 3: Create custom services
koti create:service PaymentService
koti create:service NotificationService

# Step 4: Create custom middleware
koti create:middleware RoleAuth
koti create:middleware AuditLogger
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
# Copy package configuration
cp npm-package.json package.json

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

1. **MongoDB Connection Error**
   ```bash
   # Make sure MongoDB is running
   mongod
   
   # Or use MongoDB Atlas connection string
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
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
3. Ensure MongoDB is running and environment variables are configured
4. Create an issue in the GitHub repository

---

**Koti CLI v1.0.9 - Latest Release**