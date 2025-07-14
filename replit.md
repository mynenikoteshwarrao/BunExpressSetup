# Replit.md

## Overview

This repository contains a fully functional TypeScript CLI tool that generates Bun-based API project templates. The CLI creates complete TypeScript project structures with Express.js and MongoDB integration, including authentication, security middleware, and proper project organization. The generated projects are designed to run on Bun runtime for improved performance while maintaining full TypeScript support and Node.js ecosystem compatibility.

**Status**: Published to npm! ✅ Available at `npm install -g koti` (Version 1.0.4 - Development Release)

## User Preferences

Preferred communication style: Simple, everyday language.
Author: mynenikoteshwarrao
CLI Command Format: 
- `koti new project-name` (project creation)
- `koti create:model <model-name>` (TypeScript model with schema registry)
- `koti create:enum <enum-name>` (TypeScript enum generation)
- `koti create:controller <controller-name>` (TypeScript controller generation)
- `koti create:service <service-name>` (TypeScript service generation)
- `koti create:middleware <middleware-name>` (TypeScript middleware generation)
- `koti model <model-name>` (legacy JavaScript model creation)

## Recent Changes

**July 14, 2025**: Version 1.0.4 - Comprehensive Audit System + Soft Delete Functionality
- **Complete Google OAuth Integration**: Optional Google authentication with Passport.js strategy
- **Email Service System**: Comprehensive nodemailer integration with welcome, reset, and verification templates
- **TinyURL Implementation**: Complete URL shortening service with crypto-secure IDs and TTL
- **Enhanced Authentication**: Email verification, password reset, refresh token management
- **Production Dependencies**: Added passport, nodemailer, express-session, and OAuth packages
- **Configurable Features**: Google OAuth and email services configurable via environment variables
- **Advanced Security**: Token-based email verification and password reset workflows
- **Service Layer Enhancement**: Improved authentication service with Google account linking
- **Enhanced Swagger Documentation**: Comprehensive API documentation available under `/docs/api`
- **CRUD Documentation**: Complete OpenAPI 3.0 specs auto-generated for all CRUD operations
- **Interactive Documentation**: Swagger UI with authentication testing and API exploration
- **Multiple Documentation Endpoints**: Primary `/docs/api` with legacy `/api-docs` compatibility
- **Comprehensive File Upload System**: Dual storage support (local uploads + optional S3)
- **User Document Management**: Complete CRUD operations for user-specific documents
- **Profile Image Upload**: Dedicated profile image management with automatic user updates
- **S3 Integration**: Configurable AWS S3 support with automatic fallback to local storage
- **Advanced File Management**: Upload, download, view, delete, and metadata management
- **Security Features**: User-specific document isolation and authentication requirements
- **File Type Validation**: Image validation for profile uploads, general file support for documents
- **Comprehensive Audit System**: Complete audit logging for all CRUD operations with user tracking
- **Change Tracking**: Detailed field-level change tracking with before/after values
- **Soft Delete System**: No hard deletes - all records use soft delete with audit trail
- **Audit Queries**: Rich audit API with entity history, user actions, and statistics
- **Automatic Logging**: All CRUD operations automatically log changes with user and metadata
- **Restore Functionality**: Ability to restore soft-deleted records with audit trail
- **Security Audit**: IP address, user agent, and session tracking for all changes

**July 14, 2025**: Version 1.0.3 - Comprehensive File Upload System + User Document Management
- **Complete Google OAuth Integration**: Optional Google authentication with Passport.js strategy
- **Email Service System**: Comprehensive nodemailer integration with welcome, reset, and verification templates
- **TinyURL Implementation**: Complete URL shortening service with crypto-secure IDs and TTL
- **Enhanced Authentication**: Email verification, password reset, refresh token management
- **Production Dependencies**: Added passport, nodemailer, express-session, and OAuth packages
- **Configurable Features**: Google OAuth and email services configurable via environment variables
- **Advanced Security**: Token-based email verification and password reset workflows
- **Service Layer Enhancement**: Improved authentication service with Google account linking
- **Enhanced Swagger Documentation**: Comprehensive API documentation available under `/docs/api`
- **CRUD Documentation**: Complete OpenAPI 3.0 specs auto-generated for all CRUD operations
- **Interactive Documentation**: Swagger UI with authentication testing and API exploration
- **Multiple Documentation Endpoints**: Primary `/docs/api` with legacy `/api-docs` compatibility
- **Comprehensive File Upload System**: Dual storage support (local uploads + optional S3)
- **User Document Management**: Complete CRUD operations for user-specific documents
- **Profile Image Upload**: Dedicated profile image management with automatic user updates
- **S3 Integration**: Configurable AWS S3 support with automatic fallback to local storage
- **Advanced File Management**: Upload, download, view, delete, and metadata management
- **Security Features**: User-specific document isolation and authentication requirements
- **File Type Validation**: Image validation for profile uploads, general file support for documents

**July 14, 2025**: Version 1.0.2 - Enhanced Authentication System + Improved Code Quality
- **Full TypeScript Conversion**: Converted entire CLI project from JavaScript to TypeScript
- **TypeScript CLI Implementation**: Created new src/cli.ts with full type safety and modern TypeScript features
- **Enhanced TypeScript Templates**: Added comprehensive TypeScript template files for generated projects
- **Build System**: Implemented TypeScript compilation with tsconfig.json and build scripts
- **TypeScript Dependencies**: Added @types/node, @types/fs-extra, ts-node, and typescript as dependencies
- **Generated Project Structure**: TypeScript projects now include proper src/ directory structure with types, utils, config
- **Type Definitions**: Created comprehensive API types, interfaces, and TypeScript definitions
- **Development Tools**: Added TypeScript compilation and development scripts
- **Backward Compatibility**: Maintained all existing CLI commands with TypeScript implementation
- **Enhanced Error Handling**: Improved type safety and error handling throughout CLI
- **Automatic Installation**: Added automatic `bun install` execution with npm fallback after project creation
- **Robust Installation**: Comprehensive error handling for dependency installation with clear user feedback
- **Enhanced CRUD Generation**: Complete CRUD system generation with controller, service, and routes
- **Interactive Model Creation**: Numbered datatype selection (1-8) with String, Number, Date, Boolean, ObjectId, Array, Mixed, JSON
- **Advanced Field Options**: Required, unique, indexed, and default value configuration for model fields
- **Automatic Route Registration**: Generated routes are automatically registered in routes/index.ts
- **Pagination Support**: Built-in pagination with configurable DEFAULT_PAGE_LIMIT in .env (default: 10)
- **Search & Filtering**: Automatic search functionality across String fields with sorting options
- **Swagger Documentation**: Complete OpenAPI documentation for generated CRUD endpoints
- **User Choice**: Optional CRUD generation - user can choose to generate only model or full CRUD system
- **Enhanced Authentication System**: Complete authentication with service layer separation
- **Advanced Token Management**: Access/refresh token system with proper JWT utilities
- **Comprehensive Auth Endpoints**: Login, register, forgot password, reset password, refresh token, logout
- **Improved Error Handling**: Enhanced error handling with development/production logging
- **Password Security**: Strong password validation and bcrypt hashing with salt rounds
- **Service Layer Architecture**: Proper separation of concerns with dedicated auth service
- **Token Utilities**: Dedicated JWT token generation and verification utilities
- **Better Middleware**: Async auth middleware with proper Bearer token handling
- **Google OAuth Integration**: Optional Google authentication with .env configuration (ENABLE_GOOGLE_AUTH)
- **Email Service Support**: Comprehensive email configuration with nodemailer integration
- **Email Templates**: Welcome, password reset, and verification email templates
- **TinyURL Functionality**: Complete URL shortening service with model, controller, and routes
- **Enhanced User Model**: Google OAuth fields, email verification, password reset tokens
- **Advanced Authentication**: Email verification, password reset, refresh token management
- **OAuth Passport Integration**: Google OAuth 2.0 strategy with user linking
- **Production Dependencies**: Added passport, nodemailer, express-session packages

**July 13, 2025**: Version 1.0.1 - Development Release with Disclaimers & Enhanced Features
- Added comprehensive TypeScript code generation system
- Implemented centralized schema registry with automatic updates
- Created new commands: create:model, create:enum, create:controller, create:service, create:middleware
- Added proper TypeScript interfaces, types, and API response structures
- Enhanced routing with centralized route management via routes/index.ts
- **Swagger Documentation**: Complete OpenAPI 3.0 documentation with interactive UI at /api-docs
- **Joi Validations**: Automatic request validation with field-level error handling
- **Advanced Error Handling**: Custom AppError class with comprehensive middleware
- **Rate Limiting**: Built-in protection with customizable options
- **Structured Logging**: Development and production logging with colored output
- **Response Helpers**: Consistent API response formatting utilities
- **Enhanced Dependencies**: Added joi, swagger-jsdoc, swagger-ui-express, TypeScript types
- **Development Disclaimers**: Added comprehensive disclaimers and warnings throughout CLI and generated projects
- **Updated Licensing**: Enhanced MIT license with development version warnings
- **Version 1.0.1**: Updated to reflect development status with proper user warnings
- Maintained backward compatibility with legacy JavaScript model command
- Published to npm with enhanced TypeScript features and development disclaimers

## System Architecture

### CLI Tool Architecture
The main CLI tool (`cli.js`) is a Node.js command-line application built with Commander.js that scaffolds new API projects. It uses a template-based approach where predefined file templates are copied and customized based on user input.

### Generated Project Architecture
The generated projects follow a standard Express.js API architecture with the following characteristics:

- **Runtime**: Bun (JavaScript runtime optimized for speed)
- **Web Framework**: Express.js for HTTP server and routing
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based stateless authentication
- **Security**: Multi-layered security with Helmet, CORS, and rate limiting

## Key Components

### CLI Tool Components
1. **Main CLI Script** (`cli.js`): Command-line interface using Commander.js
2. **Template System**: Static template files with placeholder substitution
3. **Interactive Model Creator**: Dynamic model generation with user input
4. **File System Operations**: Uses fs-extra for enhanced file operations
5. **Output Formatting**: Chalk for colored console output
6. **Readline Interface**: Interactive CLI experience for model creation

### Generated Project Components
1. **Server Entry Point** (`server.js`): Main application server with middleware setup
2. **Database Configuration** (`config/database.js`): MongoDB connection with error handling
3. **Authentication System**:
   - User model with validation
   - Auth controller with registration/login
   - JWT middleware for protected routes
4. **Middleware Layer**:
   - Authentication middleware
   - Error handling middleware
   - Security middleware (Helmet, CORS, rate limiting)
5. **Route Structure**:
   - Index routes for basic API endpoints
   - Auth routes for user management
   - Dynamic model routes (generated via `koti model` command)
6. **Service Layer** (auto-generated):
   - Business logic separation
   - CRUD operations with pagination
   - Search functionality
7. **Controller Layer** (auto-generated):
   - REST API endpoints
   - Request validation and error handling
   - Consistent JSON response format

## Data Flow

### CLI Tool Data Flow
1. User executes CLI command with project name
2. CLI validates input and creates project directory
3. Template files are copied and placeholders replaced
4. Project dependencies are defined in package.json
5. Documentation and configuration files are generated

### Generated API Data Flow
1. HTTP requests hit Express.js server
2. Security middleware (rate limiting, CORS, Helmet) processes requests
3. Authentication middleware validates JWT tokens for protected routes
4. Route handlers process business logic
5. Database operations performed through Mongoose ODM
6. Responses sent back with consistent JSON structure
7. Error handling middleware catches and formats errors

## External Dependencies

### CLI Tool Dependencies
- **Commander.js**: Command-line interface framework
- **fs-extra**: Enhanced file system operations
- **Chalk**: Terminal string styling for colored output

### Generated Project Dependencies
- **Express.js**: Web application framework
- **Mongoose**: MongoDB object modeling
- **dotenv**: Environment variable management
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token generation and verification
- **helmet**: Security headers middleware
- **cors**: Cross-origin resource sharing
- **express-rate-limit**: Request rate limiting

## Deployment Strategy

### Development Environment
- Uses Bun's built-in watch mode for hot reloading
- Environment-based configuration with .env files
- Local MongoDB instance for development

### Production Considerations
- Environment variables for sensitive configuration
- Rate limiting for API protection
- Graceful shutdown handling for database connections
- Health check endpoints for monitoring
- Security headers and CORS configuration
- Password hashing with configurable rounds

### Scalability Features
- Stateless authentication with JWT
- Database connection pooling through Mongoose
- Error handling and logging for debugging
- Modular route structure for easy expansion

The architecture prioritizes security, performance, and maintainability while providing a solid foundation for API development with modern JavaScript runtime optimization through Bun.