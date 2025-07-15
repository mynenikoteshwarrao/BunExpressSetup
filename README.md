# Koti - Bun API Generator

A CLI tool that generates Bun-based API projects with Express.js and MongoDB setup. This tool creates a complete, production-ready API project structure with authentication, security middleware, and best practices built-in.

## ⚠️ Development Version Disclaimer

**Current Version: 1.0.6 - Updated Development Release**

This is a development version with significant improvements and may contain errors, bugs, or security vulnerabilities. Please use with caution:

- **Review all generated code** before using in production environments
- **Test thoroughly** in development environments first
- **Update dependencies** to latest secure versions after generation
- **Implement proper security measures** for production deployment
- **Use at your own discretion and risk**

This software is provided "as-is" without warranty of any kind. Always review and validate generated code before production use.

## 🚀 New Features in v1.0.6

### ✨ **Major Improvements**
- **Modern TypeScript Templates**: Complete migration from JavaScript to TypeScript
- **UUID Implementation**: Uses UUIDs instead of ObjectIds for better JSON serialization
- **Enhanced Security**: Updated middleware with better error handling and validation
- **Improved Documentation**: Complete Swagger/OpenAPI 3.0 documentation
- **Better Project Structure**: Organized with proper TypeScript architecture
- **Modern Dependencies**: Updated to latest versions of all dependencies

### 🔧 **Technical Enhancements**
- **Type Safety**: Full TypeScript support with proper interfaces and types
- **Error Handling**: Comprehensive error handling with custom AppError class
- **Validation**: Joi validation with detailed error messages
- **Authentication**: JWT-based auth with access and refresh tokens
- **Logging**: Structured logging with development and production modes
- **API Documentation**: Auto-generated Swagger UI with interactive documentation

### 🛠️ **Development Tools**
- **Hot Reload**: Bun development server with hot reload
- **TypeScript Compilation**: Proper TypeScript build process
- **Environment Configuration**: Comprehensive .env template
- **Security Headers**: Helmet configuration with CORS and rate limiting

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
npm install -g koti@1.0.6
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

**CRUD Generation (NEW):**
```bash
koti create:model Product
# When prompted, choose 'y' for CRUD generation
# Automatically creates model, controller, service, and routes
```

### Enhanced Features:

#### 🚀 **TypeScript Architecture**
- **UUID Primary Keys**: All models use UUIDs for better JSON serialization
- **Complete Type Safety**: Proper interfaces and types throughout
- **Schema Registry**: Centralized schema definitions with automatic updates
- **Complete MVC Generation**: Auto-generates models, services, controllers, and routes
- **Routing Structure**: Maintains single routes/index.ts file with centralized route management
- **Type-Safe Validation**: Joi schemas that match TypeScript interfaces
- **Modern Error Handling**: Custom AppError class with operational error handling

#### 📋 **Enhanced Joi Validation**
- **Request Validation**: Automatic validation for create, update, and query operations
- **Custom Validation Schemas**: Generated validation schemas for each model
- **Error Handling**: Comprehensive validation error messages with field-level details
- **Password Validation**: Strong password requirements with pattern matching
- **Email Validation**: Proper email format validation

#### 📚 **Complete Swagger Documentation**
- **Auto-Generated Docs**: Complete API documentation with OpenAPI 3.0 specification
- **Interactive UI**: Swagger UI available at `/api-docs` endpoint
- **Model Documentation**: Automatic schema documentation for all generated models
- **Endpoint Documentation**: Comprehensive documentation for all CRUD operations
- **Authentication Support**: Built-in JWT authentication documentation with Bearer tokens

#### 🛡️ **Advanced Security Features**
- **JWT Access/Refresh Tokens**: Secure token-based authentication with refresh capability
- **Password Hashing**: bcrypt with configurable rounds and strong password policies
- **Rate Limiting**: Protection against brute force attacks
- **Request Logging**: Structured logging with development and production modes
- **CORS Configuration**: Secure cross-origin resource sharing
- **Helmet Integration**: Security headers middleware
- **Input Validation**: Comprehensive Joi validation for all inputs

## 🎯 Complete Example

Here's how to create a complete API with all features:

```bash
# 1. Create a new project
koti new my-blog-api
cd my-blog-api

# 2. Create enums for status values
koti create:enum PostStatus
# Choose: String enum
# Add values: draft, published, archived

# 3. Create models with CRUD operations
koti create:model User
# Add fields: username (String, required), email (String, required, unique), bio (String)
# Choose 'y' for CRUD generation

koti create:model Post
# Add fields: title (String, required), content (String), status (String), authorId (String)
# Choose 'y' for CRUD generation

# 4. Create custom middleware
koti create:middleware RoleAuth
koti create:middleware RequestLogger

# 5. Create custom services
koti create:service Analytics
koti create:service Email

# 6. Run your API
bun run dev
```

### Generated Project Structure:
```
my-blog-api/
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB connection with proper error handling
│   │   └── swagger.ts          # Swagger configuration with OpenAPI 3.0
│   ├── controllers/
│   │   ├── userController.ts   # User CRUD with validation and error handling
│   │   ├── postController.ts   # Post CRUD with validation and error handling
│   │   └── index.ts           # Controller exports
│   ├── enums/
│   │   ├── PostStatus.ts       # Post status enum
│   │   └── index.ts           # Enum exports
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication middleware
│   │   ├── roleAuth.ts        # Custom role authorization middleware
│   │   ├── requestLogger.ts   # Custom request logging middleware
│   │   ├── validation.ts      # Joi validation middleware
│   │   ├── errorHandler.ts    # Enhanced error handling
│   │   └── index.ts           # Middleware exports
│   ├── models/
│   │   ├── User.ts            # User model with UUID, validation, and methods
│   │   ├── Post.ts            # Post model with UUID, validation, and methods
│   │   └── index.ts           # Model exports
│   ├── routes/
│   │   ├── user.ts            # User routes with Swagger docs
│   │   ├── post.ts            # Post routes with Swagger docs
│   │   ├── auth.ts            # Authentication routes
│   │   └── index.ts           # Centralized route management
│   ├── services/
│   │   ├── userService.ts     # User business logic
│   │   ├── postService.ts     # Post business logic
│   │   ├── authService.ts     # Authentication logic
│   │   ├── analyticsService.ts # Analytics service
│   │   ├── emailService.ts     # Email service
│   │   └── index.ts           # Service exports
│   ├── types/
│   │   └── api.ts             # API response types and interfaces
│   ├── utils/
│   │   ├── AppError.ts        # Custom error class
│   │   ├── responseHelper.ts  # Response utilities
│   │   ├── logger.ts          # Logging utility
│   │   ├── tokenUtils.ts      # JWT token utilities
│   │   └── index.ts           # Utility exports
│   └── server.ts              # Main server file with middleware setup
├── dist/                      # Compiled JavaScript
├── .env                       # Environment variables
├── .gitignore                 # Git ignore rules
├── package.json               # Enhanced dependencies
├── tsconfig.json              # TypeScript configuration
└── README.md                  # Project documentation
```

### API Features:
- **📚 Complete Documentation**: Available at `http://localhost:8000/api-docs`
- **✅ Comprehensive Validation**: All endpoints validate requests with detailed error messages
- **🛡️ Security First**: JWT authentication, rate limiting, and security headers
- **📊 Monitoring**: Built-in health checks and request logging
- **🔍 Advanced Querying**: Search, pagination, and sorting on all list endpoints
- **🎯 Type Safety**: Full TypeScript support throughout the application
- **🚀 Modern Architecture**: Clean separation of concerns with proper dependency injection

## Generated Project Structure

```
my-awesome-api/
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB connection
│   │   └── swagger.ts          # Swagger configuration
│   ├── controllers/
│   │   ├── authController.ts   # Authentication controllers
│   │   └── index.ts           # Controller exports
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication middleware
│   │   ├── errorHandler.ts    # Error handling middleware
│   │   ├── validation.ts      # Joi validation middleware
│   │   └── index.ts           # Middleware exports
│   ├── models/
│   │   ├── User.ts            # User model with UUID
│   │   └── index.ts           # Model exports
│   ├── routes/
│   │   ├── auth.ts            # Authentication routes
│   │   ├── index.ts           # General API routes
│   │   └── api.ts             # API routes
│   ├── services/
│   │   ├── authService.ts     # Authentication service
│   │   └── index.ts           # Service exports
│   ├── types/
│   │   └── api.ts             # TypeScript definitions
│   ├── utils/
│   │   ├── AppError.ts        # Custom error class
│   │   ├── logger.ts          # Logging utility
│   │   ├── responseHelper.ts  # Response helpers
│   │   ├── tokenUtils.ts      # JWT utilities
│   │   └── index.ts           # Utility exports
│   └── server.ts              # Main server file
├── dist/                      # Compiled JavaScript
├── .env                       # Environment variables
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── README.md                  # Project documentation
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
   - Update `.env` file with your MongoDB URI
   - Generate a secure JWT secret
   - Adjust other settings as needed

5. **Start development server**:
   ```bash
   bun run dev
   ```

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
```

## Dependencies Included

### Production Dependencies
- **express**: Web framework
- **mongoose**: MongoDB ODM
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
- **typescript**: TypeScript support
- **ts-node**: TypeScript execution
- **nodemon**: Development server with auto-restart
- **@types/*** - TypeScript type definitions

## Security Features

- **JWT Authentication**: Access and refresh token system
- **Password Hashing**: bcrypt with configurable rounds
- **Rate Limiting**: Protection against brute force attacks
- **CORS Configuration**: Secure cross-origin requests
- **Helmet**: Sets various HTTP headers for security
- **Input Validation**: Comprehensive Joi validation
- **Error Handling**: Prevents information leakage
- **UUID Primary Keys**: Better security than sequential IDs

## Development Commands

```bash
# Start production server
bun run start

# Start development server with hot reload
bun run dev

# Start development server with TypeScript
npm run dev:ts

# Build TypeScript to JavaScript
npm run build

# Run tests (when implemented)
npm test

# Type checking
npx tsc --noEmit
```

## Advanced Usage

### Custom Model Generation

```bash
koti create:model Product
# Follow interactive prompts to define:
# - Field names and types
# - Validation rules (required, unique, indexed)
# - Default values
# - Generate complete CRUD operations
```

### Custom Middleware Generation

```bash
koti create:middleware RoleAuth
# Generates middleware with:
# - Proper TypeScript types
# - Error handling
# - Request/Response/NextFunction types
```

### Custom Service Generation

```bash
koti create:service EmailService
# Generates service with:
# - Business logic structure
# - Error handling
# - TypeScript interfaces
```

## Customization

The generated project is designed to be a starting point. You can:

1. **Add new routes**: Create new files in the `routes/` directory
2. **Add models**: Use `koti create:model` command
3. **Add middleware**: Use `koti create:middleware` command
4. **Add services**: Use `koti create:service` command
5. **Configure database**: Modify `config/database.ts` for your needs
6. **Add validation**: Extend Joi schemas in `middleware/validation.ts`

## Requirements

- **Bun**: Latest version recommended
- **MongoDB**: Local installation or cloud instance
- **Node.js**: 16+ (for development tools)
- **TypeScript**: 5.0+ (included in dependencies)

## Troubleshooting

### Common Issues

1. **MongoDB Connection**: Ensure MongoDB is running and URI is correct
2. **Port Conflicts**: Change PORT in .env if 8000 is occupied
3. **JWT Secret**: Generate a secure JWT secret for production
4. **Dependencies**: Run `bun install` if dependencies are missing

### Debug Mode

Set `NODE_ENV=development` in .env for detailed error messages and stack traces.

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

## Changelog

### Version 1.0.6 (Latest)
- **Major Update**: Complete migration to TypeScript
- **UUID Implementation**: All models now use UUIDs instead of ObjectIds
- **Enhanced Security**: Updated authentication with access/refresh tokens
- **Improved Validation**: Comprehensive Joi validation with detailed error messages
- **Better Documentation**: Complete Swagger/OpenAPI 3.0 documentation
- **Modern Architecture**: Clean separation of concerns and proper error handling
- **Updated Dependencies**: Latest versions of all dependencies

### Version 1.0.5
- Basic TypeScript support
- Initial UUID implementation
- Basic authentication system

### Version 1.0.4
- JavaScript-based templates
- Basic MongoDB integration
- Simple authentication

### Version 1.0.3
- Initial release
- Basic project generation
- Simple boilerplate

---

**Generated with ❤️ by [Koti CLI](https://www.npmjs.com/package/koti) v1.0.6**