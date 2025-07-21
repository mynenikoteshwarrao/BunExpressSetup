# Koti - Bun API Generator

A CLI tool that generates Bun-based API projects with Express.js and MongoDB setup. This tool creates a complete, production-ready API project structure with authentication, security middleware, and best practices built-in.

## ⚠️ Development Version Disclaimer

**Current Version: 2.0.0-beta.1 - Beta Release**

This is a development version with significant improvements and may contain errors, bugs, or security vulnerabilities. Please use with caution:

- **Review all generated code** before using in production environments
- **Test thoroughly** in development environments first
- **Update dependencies** to latest secure versions after generation
- **Implement proper security measures** for production deployment
- **Use at your own discretion and risk**

This software is provided "as-is" without warranty of any kind. Always review and validate generated code before production use.

## 🚀 New Features in v2.0.0-beta.1

### ✨ **Latest Improvements**
- **Enhanced Stability**: Improved error handling and bug fixes
- **Better Performance**: Optimized code generation and template processing
- **Security Updates**: Latest dependency versions and security improvements
- **Documentation Refresh**: Cleaner, more comprehensive documentation
- **Version Consistency**: Centralized version management across all components

### 🔧 **Previous Major Features (v1.0.6)**
- **Modern TypeScript Templates**: Complete migration from JavaScript to TypeScript
- **UUID Implementation**: Uses UUIDs instead of ObjectIds for better JSON serialization
- **Enhanced Security**: Updated middleware with better error handling and validation
- **Improved Documentation**: Complete Swagger/OpenAPI 3.0 documentation
- **Better Project Structure**: Organized with proper TypeScript architecture
- **Modern Dependencies**: Updated to latest versions of all dependencies

## Features

- **TypeScript First**: Full TypeScript support with type safety
- **Bun Runtime**: Optimized for speed with modern JavaScript runtime
- **Express.js**: Minimal and flexible web framework
- **MongoDB Integration**: Complete setup with Mongoose ODM and UUIDs
- **JWT Authentication**: Ready-to-use authentication system with refresh tokens
- **Security First**: Helmet, CORS, rate limiting, and password hashing
- **Error Handling**: Centralized error handling middleware
- **Request Validation**: Joi validation with detailed error messages
- **API Documentation**: Complete Swagger/OpenAPI 3.0 documentation
- **Environment Config**: Comprehensive environment variable setup
- **Modern Structure**: Well-organized folder structure following best practices

## Installation

### Global Installation (Recommended)

Install globally via npm:

```bash
npm install -g koti@2.0.0-beta.1
```

### Development Setup

For development or local testing:

1. **Clone this repository**:
   ```bash
   git clone https://github.com/mynenikoteshwarrao/BunExpressSetup.git
   cd BunExpressSetup
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the CLI**:
   ```bash
   npm run build
   ```

## Usage

### Create a new Bun API project:

```bash
koti new my-awesome-api
```

Or use the create alias:

```bash
koti create my-awesome-api
```

### Enhanced TypeScript Code Generation:

**Create TypeScript models with UUIDs:**
```bash
koti create:model Product
# Interactive prompt for fields, types, validation rules
# Generates model with UUID primary key, proper TypeScript interfaces
```

**Create TypeScript enums:**
```bash
koti create:enum Status
# Interactive prompt for enum type (string/number) and values
```

**Create TypeScript controllers:**
```bash
koti create:controller Product
# Generates controller with CRUD operations and proper error handling
```

**Create TypeScript services:**
```bash
koti create:service Product
# Generates service layer with business logic
```

**Create TypeScript middleware:**
```bash
koti create:middleware Auth
# Generates middleware with proper TypeScript types
```

**CRUD Generation:**
```bash
koti create:model Product
# When prompted, choose 'y' for CRUD generation
# Automatically creates model, controller, service, and routes
```

## Generated Project Structure

```
my-awesome-api/
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB connection with UUID support
│   │   ├── email.ts            # Email configuration
│   │   ├── logger.ts           # Logger configuration
│   │   ├── passport.ts         # Passport.js configuration
│   │   ├── s3.ts               # AWS S3 configuration
│   │   └── swagger.ts          # Swagger/OpenAPI 3.0 configuration
│   ├── controllers/
│   │   ├── auditController.ts  # Audit logging controller
│   │   ├── authController.ts   # Authentication controllers
│   │   ├── documentController.ts # Document management controller
│   │   ├── tinyUrlController.ts # URL shortening controller
│   │   └── index.ts           # Controller exports
│   ├── middleware/
│   │   ├── auditMiddleware.ts  # Audit logging middleware
│   │   ├── auth.ts            # JWT authentication middleware
│   │   ├── errorHandler.ts    # Custom error handling middleware
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
│   │   ├── auditService.ts    # Audit logging service
│   │   ├── authService.ts     # Authentication service
│   │   ├── documentService.ts # Document management service
│   │   ├── tinyUrlService.ts  # URL shortening service
│   │   └── index.ts           # Service exports
│   ├── types/
│   │   └── api.ts             # API response types and interfaces
│   ├── utils/
│   │   ├── AppError.ts        # Custom error class
│   │   ├── logger.ts          # Logging utility
│   │   ├── responseHelper.ts  # Response formatting utilities
│   │   ├── tokenUtils.ts      # JWT token utilities
│   │   └── index.ts           # Utility exports
│   └── server.ts              # Main server file with middleware setup
├── dist/                      # Compiled JavaScript output
├── uploads/                   # File upload storage (if file upload enabled)
├── .env                       # Environment variables
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── bun.lockb                 # Bun lock file
└── README.md                 # Project documentation
```

## Quick Start for Generated Project

1. **Navigate to your project**:
   ```bash
   cd my-awesome-api
   ```

2. **Install dependencies** (automatically done during generation):
   ```bash
   bun install
   ```

3. **Set up MongoDB**:
   - Install and start MongoDB locally, or
   - Get a MongoDB Atlas connection string

4. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Update MongoDB URI and other settings
   - Generate secure JWT secrets

5. **Start development server**:
   ```bash
   bun run dev
   ```

6. **View API documentation**:
   - Open `http://localhost:8000/api-docs` for Swagger UI

## API Endpoints

### Health Check
- `GET /health` - Server health status

### General API
- `GET /api/` - API welcome message
- `GET /api/status` - Detailed API status

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Documentation
- `GET /api-docs` - Interactive Swagger UI documentation
- `GET /docs/api` - Alternative documentation endpoint

## Environment Variables

The generated `.env` file includes:

```env
# Environment Configuration
NODE_ENV=development
PORT=8000

# Database
MONGODB_URI=mongodb://localhost:27017/your-project-name

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5000

# API Configuration
API_URL=http://localhost:8000

# Pagination Configuration
DEFAULT_PAGE_LIMIT=10
MAX_PAGE_LIMIT=100

# Security Configuration
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Dependencies Included

### Production Dependencies
- **express**: Web framework
- **mongoose**: MongoDB ODM with TypeScript support
- **typescript**: TypeScript language support
- **dotenv**: Environment variable management
- **cors**: Cross-origin resource sharing
- **helmet**: Security headers
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token management
- **express-rate-limit**: Request rate limiting
- **joi**: Request validation
- **swagger-jsdoc**: API documentation generation
- **swagger-ui-express**: Interactive API documentation
- **uuid**: UUID generation for primary keys

### Development Dependencies
- **ts-node**: TypeScript execution
- **nodemon**: Development server with auto-restart
- **@types/**: TypeScript type definitions

## Security Features

- **JWT Authentication**: Access and refresh token system
- **Password Hashing**: bcrypt with configurable rounds
- **Rate Limiting**: Protection against brute force attacks
- **CORS Configuration**: Secure cross-origin requests
- **Helmet**: Sets various HTTP headers for security
- **Input Validation**: Comprehensive Joi validation
- **Error Handling**: Prevents information leakage
- **UUID Primary Keys**: Better security than sequential IDs
- **Audit Logging**: Complete audit trail for all operations

## Development Commands

```bash
# Start production server
bun run start

# Start development server with hot reload
bun run dev

# Build TypeScript to JavaScript
bun run build

# Type checking
bun run type-check

# Run linting
bun run lint

# Run tests (when implemented)
bun run test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - feel free to use this tool for personal and commercial projects.

## Support

If you encounter any issues or have questions:

1. Check the generated project's README for specific setup instructions
2. Ensure MongoDB is running and accessible
3. Verify environment variables are properly configured
4. Check that all dependencies are installed

---

**Generated with ❤️ by [Koti CLI](https://www.npmjs.com/package/koti) v2.0.0-beta.1**