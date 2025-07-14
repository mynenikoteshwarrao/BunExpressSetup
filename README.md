# Koti - Bun API Generator

A CLI tool that generates Bun-based API projects with Express.js and MongoDB setup. This tool creates a complete, production-ready API project structure with authentication, security middleware, and best practices built-in.

## ⚠️ Development Version Disclaimer

**Current Version: 1.0.3 - Initial Development Release**

This is an early development version and may contain errors, bugs, or security vulnerabilities. Please use with caution:

- **Review all generated code** before using in production environments
- **Test thoroughly** in development environments first
- **Update dependencies** to latest secure versions after generation
- **Implement proper security measures** for production deployment
- **Use at your own discretion and risk**

This software is provided "as-is" without warranty of any kind. Always review and validate generated code before production use.

## Features

- **Bun Runtime**: Optimized for speed with modern JavaScript runtime
- **Express.js**: Minimal and flexible web framework
- **MongoDB Integration**: Complete setup with Mongoose ODM
- **JWT Authentication**: Ready-to-use authentication system
- **Security First**: Helmet, CORS, rate limiting, and password hashing
- **Error Handling**: Centralized error handling middleware
- **Environment Config**: Comprehensive environment variable setup
- **Standard Structure**: Well-organized folder structure following best practices

## Installation

### Global Installation (Recommended)

Install globally via npm:

```bash
npm install -g koti@1.0.5
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

3. **Make executable**:
   ```bash
   chmod +x koti
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

**Create TypeScript models with schema registry:**
```bash
koti create:model Product
```

**Create TypeScript enums:**
```bash
koti create:enum Status
```

**Create TypeScript controllers:**
```bash
koti create:controller Product
```

**Create TypeScript services:**
```bash
koti create:service Product
```

**Create TypeScript middleware:**
```bash
koti create:middleware Auth
```

**Legacy model creation (JavaScript):**
```bash
koti model Product
```

### Enhanced Features:

#### 🚀 **TypeScript Architecture**
- **Schema Reference Handling**: Centralized schema definitions with automatic registry updates
- **Complete MVC Generation**: Auto-generates models, services, controllers, and routes
- **Routing Structure**: Maintains single routes/index.ts file with centralized route management
- **Type Safety**: Full TypeScript support with proper interfaces and types
- **Automatic Index Updates**: Updates index.ts files for easy imports
- **Enum Support**: Interactive enum creation with string or number values

#### 📋 **Joi Validation**
- **Request Validation**: Automatic validation for create, update, and query operations
- **Custom Validation Schemas**: Generated validation schemas for each model
- **Error Handling**: Comprehensive validation error messages with field-level details
- **Type-Safe Validation**: Joi schemas that match TypeScript interfaces

#### 📚 **Swagger Documentation**
- **Auto-Generated Docs**: Complete API documentation with OpenAPI 3.0 specification
- **Interactive UI**: Swagger UI available at `/api-docs` endpoint
- **Model Documentation**: Automatic schema documentation for all generated models
- **Endpoint Documentation**: Comprehensive documentation for all CRUD operations
- **Authentication Support**: Built-in authentication documentation

#### 🛡️ **Advanced Error Handling**
- **Custom Error Classes**: AppError class with operational error handling
- **Comprehensive Middleware**: Enhanced error handling with proper logging
- **Rate Limiting**: Built-in rate limiting with customizable options
- **Request Logging**: Structured logging with development and production modes
- **Response Helpers**: Consistent API response formatting

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

# 3. Create models with validation
koti create:model User
# Add fields: username (String, required), email (String, required, unique), role (String)

koti create:model Post
# Add fields: title (String, required), content (String), status (String), author (ObjectId, ref: User)

# 4. Create custom middleware
koti create:middleware Auth
koti create:middleware Logger

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
│   │   └── swagger.ts          # Swagger configuration
│   ├── controllers/
│   │   ├── userController.ts   # User CRUD with validation
│   │   ├── postController.ts   # Post CRUD with validation
│   │   └── index.ts           # Controller exports
│   ├── enums/
│   │   ├── PostStatus.ts       # Post status enum
│   │   └── index.ts           # Enum exports
│   ├── middleware/
│   │   ├── auth.ts            # Custom auth middleware
│   │   ├── logger.ts          # Custom logger middleware
│   │   ├── validation.ts      # Joi validation middleware
│   │   ├── errorHandler.ts    # Enhanced error handling
│   │   └── rateLimit.ts       # Rate limiting
│   ├── models/
│   │   ├── User.ts            # User model with Joi validation
│   │   ├── Post.ts            # Post model with Joi validation
│   │   └── index.ts           # Model exports
│   ├── routes/
│   │   ├── user.ts            # User routes with Swagger docs
│   │   ├── post.ts            # Post routes with Swagger docs
│   │   └── index.ts           # Centralized route management
│   ├── services/
│   │   ├── analyticsService.ts # Analytics service
│   │   ├── emailService.ts     # Email service
│   │   └── index.ts           # Service exports
│   ├── types/
│   │   └── api.ts             # API response types
│   └── utils/
│       ├── AppError.ts        # Custom error class
│       ├── responseHelper.ts  # Response utilities
│       └── logger.ts          # Logging utility
├── package.json               # Enhanced dependencies
└── server.js                  # Main server file
```

### API Features:
- **📚 Swagger Documentation**: Available at `http://localhost:3000/api-docs`
- **✅ Joi Validation**: All endpoints validate requests automatically
- **🛡️ Error Handling**: Comprehensive error responses with proper status codes
- **📊 Rate Limiting**: Built-in protection against abuse
- **🔍 Search & Pagination**: All list endpoints support search and pagination
- **🎯 TypeScript**: Full type safety throughout the application

## Generated Project Structure

```
my-awesome-api/
├── config/
│   └── database.js          # MongoDB connection setup
├── controllers/
│   └── authController.js    # Authentication controllers
├── middleware/
│   ├── auth.js             # JWT authentication middleware
│   └── errorHandler.js     # Error handling middleware
├── models/
│   └── User.js             # User model with Mongoose
├── routes/
│   ├── auth.js             # Authentication routes
│   └── index.js            # General API routes
├── .env                    # Environment variables
├── .gitignore             # Git ignore rules
├── package.json           # Project dependencies
├── README.md              # Project documentation
└── server.js              # Main server file
```

## Quick Start for Generated Project

1. **Navigate to your project**:
   ```bash
   cd my-awesome-api
   ```

2. **Install dependencies**:
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
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/update` - Update user profile (protected)
- `POST /api/auth/logout` - User logout (protected)

## Environment Variables

The generated `.env` file includes:

```env
# Server Configuration
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/your-project-name
DB_NAME=your-project-name

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Security
BCRYPT_ROUNDS=12
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

### Development Dependencies
- **nodemon**: Development server with auto-restart

## Security Features

- **Rate Limiting**: Prevents brute force attacks
- **CORS Configuration**: Secure cross-origin requests
- **Helmet**: Sets various HTTP headers for security
- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Stateless authentication
- **Input Validation**: Mongoose schema validation
- **Error Handling**: Prevents information leakage

## Development Commands

```bash
# Start production server
bun run start

# Start development server with hot reload
bun run dev

# Run tests (when implemented)
bun run test
```

## Customization

The generated project is designed to be a starting point. You can:

1. **Add new routes**: Create new files in the `routes/` directory
2. **Add models**: Create new Mongoose models in `models/`
3. **Add middleware**: Extend functionality with custom middleware
4. **Configure database**: Modify `config/database.js` for your needs
5. **Add services**: Create business logic in a `services/` directory

## Requirements

- **Bun**: Latest version recommended
- **MongoDB**: Local installation or cloud instance
- **Node.js**: 16+ (for development tools)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this tool for personal and commercial projects.

## Support

If you encounter any issues or have questions:

1. Check the generated project's README for specific setup instructions
2. Ensure MongoDB is running and accessible
3. Verify environment variables are properly configured
4. Check that all dependencies are installed

## Changelog

### Version 1.0.0
- Initial release
- Complete Bun API project generation
- Authentication system included
- Security middleware setup
- MongoDB integration
- Comprehensive documentation