# typescript-test-project

A modern TypeScript API built with Bun, Express.js, and MongoDB.

## ⚠️ Development Disclaimer

**This project was generated using Koti CLI (Development Version 1.0.3)**

This is an initial development release and may contain errors, bugs, or security vulnerabilities. Please:
- Review all generated code before using in production
- Test thoroughly in development environments
- Update dependencies to latest versions
- Implement proper security measures for production use
- Use at your own discretion and risk

Generated code is provided "as-is" without warranty of any kind.

## 🚀 Features

- **TypeScript**: Full type safety and modern JavaScript features
- **Bun Runtime**: Lightning-fast JavaScript runtime
- **Express.js**: Minimal and flexible web framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **Authentication**: JWT-based authentication system
- **Security**: Helmet, CORS, rate limiting
- **Error Handling**: Centralized error handling
- **Validation**: Joi request validation and sanitization
- **API Documentation**: Swagger/OpenAPI 3.0 documentation
- **Environment Config**: Environment-based configuration

## 📋 Prerequisites

- [Bun](https://bun.sh/) installed
- [MongoDB](https://www.mongodb.com/) installed and running
- Node.js 16+ (for development tools)
- TypeScript knowledge recommended

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd typescript-test-project
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
   MONGODB_URI=mongodb://localhost:27017/typescript-test-project
   JWT_SECRET=your-super-secret-jwt-key
   ```

4. **Start MongoDB**
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Linux
   sudo systemctl start mongod
   ```

## 🚀 Usage

### Development

```bash
# Development with Bun (recommended)
bun run dev

# Development with TypeScript compilation
npm run dev:ts

# Build TypeScript
npm run build

# Production
npm start
```

### API Documentation

- **Swagger UI**: http://localhost:8000/api-docs
- **Health Check**: http://localhost:8000/health
- **API Status**: http://localhost:8000/api/status

### Default Endpoints

- `GET /health` - Health check
- `GET /api/` - API welcome message
- `GET /api/status` - API status information
- `GET /api-docs` - Interactive API documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

## 📁 Project Structure

```
typescript-test-project/
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB connection
│   │   └── swagger.ts          # Swagger configuration
│   ├── controllers/
│   │   ├── authController.ts   # Authentication logic
│   │   └── index.ts           # Controller exports
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication
│   │   ├── errorHandler.ts    # Error handling
│   │   ├── rateLimit.ts       # Rate limiting
│   │   └── validation.ts      # Joi validation
│   ├── models/
│   │   ├── User.ts            # User model
│   │   └── index.ts           # Model exports
│   ├── routes/
│   │   ├── auth.ts            # Auth routes
│   │   ├── index.ts           # Main routes
│   │   └── api.ts             # API routes
│   ├── types/
│   │   └── api.ts             # TypeScript definitions
│   ├── utils/
│   │   ├── AppError.ts        # Custom error class
│   │   ├── logger.ts          # Logging utility
│   │   └── responseHelper.ts  # Response helpers
│   └── server.ts              # Main server file
├── dist/                      # Compiled JavaScript
├── .env                       # Environment variables
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── README.md                  # This file
```

## 🔧 Development

### Adding New Features

Use the Koti CLI to generate new components:

```bash
# Create new model
koti create:model Product

# Create new controller
koti create:controller Product

# Create new service
koti create:service Email

# Create new middleware
koti create:middleware Logger

# Create new enum
koti create:enum Status
```

### TypeScript Features

- **Full Type Safety**: All code is written in TypeScript
- **Interface Definitions**: Clear contracts for all data structures
- **Enum Support**: Type-safe enumerations
- **Generic Types**: Reusable type definitions
- **Decorators**: Support for experimental decorators

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers middleware
- **Input Validation**: Joi validation for all inputs

## 📊 Monitoring & Logging

- **Health Checks**: Built-in health check endpoints
- **Request Logging**: Detailed request/response logging
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: Request timing and metrics

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Type checking
npx tsc --noEmit

# Linting (when configured)
npm run lint
```

## 🚀 Deployment

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

Set the following environment variables for production:

- `NODE_ENV=production`
- `PORT=8000`
- `MONGODB_URI=your-production-mongodb-uri`
- `JWT_SECRET=your-secure-jwt-secret`

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
