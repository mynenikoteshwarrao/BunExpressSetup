# Replit.md

## Overview

This repository contains a fully functional TypeScript CLI tool that generates Bun-based API project templates. The CLI creates complete TypeScript project structures with Express.js and MongoDB integration, including authentication, security middleware, and proper project organization. The generated projects are designed to run on Bun runtime for improved performance while maintaining full TypeScript support and Node.js ecosystem compatibility.

**Status**: Published to npm! ✅ Available at `npm install -g koti` (Version 1.0.9 - Latest Release)

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

**Version 1.0.9**: Latest Release - Enhanced Features & Bug Fixes
- **Centralized Version Management**: Single source of truth for version control across all files
- **Enhanced Error Handling**: Improved error messages and debugging capabilities
- **Performance Optimizations**: Better code generation and template processing
- **Security Updates**: Updated dependencies and security improvements
- **Documentation Improvements**: Cleaner, more comprehensive documentation
- **Bug Fixes**: Resolved various CLI and template generation issues

**Version 1.0.6**: Comprehensive Audit System + Soft Delete Functionality
- **Complete Audit System**: Full audit logging for all CRUD operations with user tracking
- **Soft Delete Implementation**: No hard deletes - all records use soft delete with audit trail
- **Enhanced File Upload**: Complete file upload system with S3 integration
- **Advanced Authentication**: Email verification, password reset, refresh token management
- **Google OAuth Integration**: Complete OAuth 2.0 implementation with Passport.js
- **Enhanced Swagger Documentation**: Comprehensive API documentation with interactive UI

## System Architecture

### CLI Tool Architecture
The main CLI tool is a TypeScript-based Node.js command-line application built with Commander.js that scaffolds new API projects. It uses a template-based approach where predefined TypeScript templates are copied and customized based on user input.

### Generated Project Architecture
The generated projects follow a modern TypeScript Express.js API architecture:

- **Runtime**: Bun (JavaScript runtime optimized for speed)
- **Language**: TypeScript with full type safety
- **Web Framework**: Express.js for HTTP server and routing
- **Database**: MongoDB with Mongoose ODM using UUIDs
- **Authentication**: JWT-based stateless authentication with refresh tokens
- **Security**: Multi-layered security with Helmet, CORS, rate limiting, and input validation

## Key Components

### CLI Tool Components
1. **Main CLI Script** (`src/cli.ts`): TypeScript command-line interface using Commander.js
2. **Template System**: TypeScript template files with placeholder substitution
3. **Interactive Generators**: Dynamic code generation with user input
4. **File System Operations**: Enhanced file operations with proper error handling
5. **Output Formatting**: Colored console output for better user experience

### Generated Project Components
1. **Server Entry Point** (`src/server.ts`): TypeScript main application server
2. **Database Configuration** (`src/config/database.ts`): MongoDB connection with UUID support
3. **Authentication System**:
   - User model with TypeScript interfaces and validation
   - Auth service with business logic separation
   - JWT middleware for protected routes with refresh tokens
4. **Middleware Layer**:
   - TypeScript authentication middleware
   - Comprehensive error handling middleware
   - Security middleware (Helmet, CORS, rate limiting)
   - Joi validation middleware
5. **Route Structure**:
   - Centralized route management
   - TypeScript route handlers
   - Auto-generated CRUD endpoints
6. **Service Layer**:
   - Business logic separation with TypeScript interfaces
   - CRUD operations with pagination and search
   - Error handling and logging
7. **Type System**:
   - Complete TypeScript interfaces
   - API response types
   - Custom error classes

## Data Flow

### CLI Tool Data Flow
1. User executes CLI command with project name
2. CLI validates input and creates project directory structure
3. TypeScript template files are processed and customized
4. Dependencies are configured in package.json
5. TypeScript configuration and build system are set up

### Generated API Data Flow
1. HTTP requests hit Express.js server
2. Security middleware processes requests (rate limiting, CORS, Helmet)
3. Authentication middleware validates JWT tokens for protected routes
4. Joi validation middleware validates request data
5. Route handlers delegate to service layer
6. Service layer handles business logic and database operations
7. Responses sent with consistent JSON structure and proper TypeScript types
8. Error handling middleware catches and formats errors appropriately

## External Dependencies

### CLI Tool Dependencies
- **Commander.js**: Command-line interface framework
- **fs-extra**: Enhanced file system operations
- **TypeScript**: Type safety and modern JavaScript features

### Generated Project Dependencies
- **Express.js**: Web application framework
- **Mongoose**: MongoDB object modeling with TypeScript support
- **TypeScript**: Type safety and modern development
- **Joi**: Request validation with schema definitions
- **JWT**: Token generation and verification
- **bcryptjs**: Password hashing and security
- **Helmet**: Security headers middleware
- **CORS**: Cross-origin resource sharing
- **express-rate-limit**: Request rate limiting
- **Swagger**: API documentation generation
- **UUID**: Unique identifier generation

## Deployment Strategy

### Development Environment
- TypeScript compilation with proper source maps
- Bun's built-in watch mode for hot reloading
- Environment-based configuration with comprehensive .env files
- Local MongoDB instance for development

### Production Considerations
- Compiled TypeScript for optimal performance
- Environment variables for sensitive configuration
- Rate limiting and security headers for API protection
- Graceful shutdown handling for database connections
- Health check endpoints for monitoring
- Comprehensive logging and error tracking

### Scalability Features
- Stateless authentication with JWT and refresh tokens
- Database connection pooling through Mongoose
- Modular TypeScript architecture for easy expansion
- Comprehensive error handling and logging
- UUID-based primary keys for better distribution

The architecture prioritizes security, performance, type safety, and maintainability while providing a solid foundation for modern API development with TypeScript and Bun runtime optimization.