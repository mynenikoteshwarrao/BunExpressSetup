# Replit.md

## Overview

This repository contains a fully functional TypeScript CLI tool that generates Bun-based API project templates. The CLI creates complete TypeScript project structures with Express.js and MongoDB integration, including authentication, security middleware, and proper project organization. The generated projects are designed to run on Bun runtime for improved performance while maintaining full TypeScript support and Node.js ecosystem compatibility.

**Status**: Published to npm! ✅ Available at `npm install -g koti` (Version 1.0.3 - Development Release)

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

**July 14, 2025**: Version 1.0.3 - Complete TypeScript Conversion
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

**July 13, 2025**: Version 1.0.3 - Development Release with Disclaimers & Enhanced Features
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
- **Version 1.0.3**: Updated to reflect development status with proper user warnings
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