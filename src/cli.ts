#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as readline from 'readline';
import * as crypto from 'crypto';
import { GeneratorError, FieldSpec, resolveProject } from './generators/context';
import { createEnum } from './generators/enum';
import { createTask } from './generators/task';
import { createController } from './generators/controller';
import { createService } from './generators/service';
import { createMiddleware } from './generators/middleware';
import { createModel, editModel, parseExistingModel } from './generators/model';

// Read version from centralized location with fallback
const getVersion = (): string => {
  const candidates = [
    path.join(__dirname, '..', 'version.json'),
    path.join(__dirname, '..', 'package.json'),
  ];
  for (const candidate of candidates) {
    try {
      const data = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (data.version) return data.version;
    } catch {}
  }
  console.error(colors.yellow('⚠️  Could not determine CLI version. Using fallback.'));
  return '0.0.0-unknown';
};

// Generate a cryptographically secure random secret
const generateSecret = (bytes: number = 64): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

interface DataType {
  mongoose: string;
  typescript: string;
}

interface ProjectTemplates {
  [key: string]: string;
}

interface Colors {
  green: (text: string) => string;
  blue: (text: string) => string;
  yellow: (text: string) => string;
  red: (text: string) => string;
  cyan: (text: string) => string;
  bold: (text: string) => string;
  dim: (text: string) => string;
}

const program = new Command();

// Console colors without chalk
const colors: Colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`
};

// Available Mongoose data types with TypeScript equivalents
const availableDataTypes: DataType[] = [
  { mongoose: 'String', typescript: 'string' },
  { mongoose: 'Number', typescript: 'number' },
  { mongoose: 'Date', typescript: 'Date' },
  { mongoose: 'Boolean', typescript: 'boolean' },
  { mongoose: 'ObjectId', typescript: 'Types.ObjectId' },
  { mongoose: 'Array', typescript: 'Array' },
  { mongoose: 'Mixed', typescript: 'any' },
  { mongoose: 'Decimal128', typescript: 'Types.Decimal128' },
  { mongoose: 'Map', typescript: 'Map<string, any>' },
  { mongoose: 'Schema', typescript: 'Schema' }
];

// Available enum types for generation
const enumTypes: string[] = ['string', 'number'];

// Helper function to create readline interface
const createReadlineInterface = (): readline.Interface => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
};

// Helper function to ask question
const askQuestion = (rl: readline.Interface, question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
};

// Helper function to capitalize first letter
const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Helper function to convert to camelCase
const toCamelCase = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1);
};

// Helper function to convert to kebab-case
const toKebabCase = (str: string): string => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
};

// Helper function to convert to UPPER_SNAKE_CASE (e.g., UserProfile → USER_PROFILE)
const toUpperSnakeCase = (str: string): string => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
};

// Project templates as a constant object
const projectTemplates: ProjectTemplates = {
  'package.json': JSON.stringify({
    name: "{{PROJECT_NAME}}",
    version: getVersion(),
    description: "Bun API project with Express and MongoDB",
    main: "dist/server.js",
    scripts: {
      build: "tsc",
      start: "node dist/server.js",
      dev: "bun --watch src/server.ts",
      "dev:ts": "ts-node src/server.ts",
      test: "echo \"Error: no test specified\" && exit 1"
    },
    dependencies: {
      "express": "^4.18.2",
      "mongoose": "^8.0.0",
      "dotenv": "^16.3.1",
      "cors": "^2.8.5",
      "helmet": "^7.1.0",
      "bcryptjs": "^2.4.3",
      "jsonwebtoken": "^9.0.2",
      "express-rate-limit": "^7.1.5",
      "joi": "^17.11.0",
      "swagger-jsdoc": "^6.2.8",
      "swagger-ui-express": "^5.0.0"
    },
    devDependencies: {
      "typescript": "^5.3.2",
      "@types/express": "^4.17.21",
      "@types/node": "^20.10.0",
      "@types/cors": "^2.8.17",
      "@types/bcryptjs": "^2.4.6",
      "@types/jsonwebtoken": "^9.0.5",
      "@types/swagger-jsdoc": "^6.0.4",
      "@types/swagger-ui-express": "^4.1.6",
      "ts-node": "^10.9.1",
      "nodemon": "^3.0.2"
    },
    keywords: ["bun", "express", "mongodb", "api", "typescript"],
    author: "mynenikoteshwarrao",
    license: "MIT",
    disclaimer: `Generated by Koti CLI v${getVersion()} - Development version. Code provided as-is without warranty. Review before production use.`
  }, null, 2),

  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: "ES2020",
      module: "CommonJS",
      lib: ["ES2020"],
      outDir: "./dist",
      rootDir: "./src",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      declaration: true,
      sourceMap: true,
      removeComments: false,
      noImplicitAny: true,
      strictNullChecks: true,
      moduleResolution: "node",
      allowSyntheticDefaultImports: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true
    },
    include: [
      "src/**/*"
    ],
    exclude: [
      "node_modules",
      "dist"
    ]
  }, null, 2),

  'README.md': `# {{PROJECT_NAME}}

A modern TypeScript API built with Bun, Express.js, and MongoDB.

## ⚠️ Development Disclaimer

**This project was generated using Koti CLI v${getVersion()}**

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
   \`\`\`bash
   git clone <repository-url>
   cd {{PROJECT_NAME}}
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   bun install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   
   Edit \`.env\` file with your configuration:
   \`\`\`env
   NODE_ENV=development
   PORT=8000
   MONGODB_URI=mongodb://localhost:27017/{{PROJECT_NAME}}
   # JWT secrets are auto-generated during project creation
   \`\`\`

4. **Start MongoDB**
   \`\`\`bash
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Linux
   sudo systemctl start mongod
   \`\`\`

## 🚀 Usage

### Development

\`\`\`bash
# Development with Bun (recommended)
bun run dev

# Development with TypeScript compilation
npm run dev:ts

# Build TypeScript
npm run build

# Production
npm start
\`\`\`

### API Documentation

- **Swagger UI**: http://localhost:8000/api-docs
- **Health Check**: http://localhost:8000/health
- **API Status**: http://localhost:8000/api/status

### Default Endpoints

- \`GET /health\` - Health check
- \`GET /api/\` - API welcome message
- \`GET /api/status\` - API status information
- \`GET /api-docs\` - Interactive API documentation

### Authentication Endpoints

- \`POST /api/auth/register\` - Register new user
- \`POST /api/auth/login\` - User login
- \`GET /api/auth/me\` - Get current user profile

## 📁 Project Structure

\`\`\`
{{PROJECT_NAME}}/
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
\`\`\`

## 🔧 Development

### Adding New Features

Use the Koti CLI to generate new components:

\`\`\`bash
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
\`\`\`

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

\`\`\`bash
# Run tests (when implemented)
npm test

# Type checking
npx tsc --noEmit

# Linting (when configured)
npm run lint
\`\`\`

## 🚀 Deployment

### Production Build

\`\`\`bash
# Build for production
npm run build

# Start production server
npm start
\`\`\`

### Environment Variables

Set the following environment variables for production:

- \`NODE_ENV=production\`
- \`PORT=8000\`
- \`MONGODB_URI=your-production-mongodb-uri\`
- \`JWT_SECRET=your-secure-jwt-secret\`

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
`
};

/**
 * Append an export line to an index.ts barrel file.
 * Creates the index.ts if it doesn't exist yet.
 * Skips silently if the export line is already present.
 *
 * @param dirPath  – absolute path to the directory (e.g. src/models)
 * @param exportLine – the full export statement to add
 */
const updateIndexExport = async (dirPath: string, exportLine: string): Promise<void> => {
  const indexPath = path.join(dirPath, 'index.ts');

  try {
    let content = '';
    if (await fs.pathExists(indexPath)) {
      content = await fs.readFile(indexPath, 'utf-8');
    }

    // Already exported
    if (content.includes(exportLine)) return;

    // Append with a newline
    const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
    await fs.writeFile(indexPath, content + separator + exportLine + '\n');
  } catch {
    // Non-fatal – the index file is a convenience, not a requirement
  }
};

// Generate essential TypeScript files
const generateEssentialFiles = async (projectPath: string, projectName: string, framework: string = 'express'): Promise<void> => {
  const srcPath = path.join(projectPath, 'src');

  // Generate basic route files
  const indexRouteContent = `import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types/api';

const router = Router();

/**
 * @swagger
 * /api/:
 *   get:
 *     summary: API welcome message
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Welcome message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'Welcome to ${projectName} API',
    data: {
      version: getVersion(),
      description: 'TypeScript API built with Bun, Express, and MongoDB',
      documentation: '/api-docs'
    }
  };
  res.json(response);
});

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: API status information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API status
 */
router.get('/status', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'API is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    }
  };
  res.json(response);
});

export default router;`;

  const authRouteContent = `import { Router } from 'express';
import authController from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset instructions sent
 *       404:
 *         description: User not found
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid token or password
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', auth, authController.getProfile);

export default router;`;

  // These inline route templates are Express-specific (import { Router } from 'express').
  // For non-Express frameworks the routes ship as static files in templates/<framework>/src,
  // so only write them for Express to avoid clobbering the copied framework routes.
  if (framework === 'express') {
    await fs.writeFile(path.join(srcPath, 'routes', 'index.ts'), indexRouteContent);
    await fs.writeFile(path.join(srcPath, 'routes', 'auth.ts'), authRouteContent);

    console.log(colors.green('✅ Created file: src/routes/index.ts'));
    console.log(colors.green('✅ Created file: src/routes/auth.ts'));
  }

  // Generate enhanced auth controller with service layer
  const authControllerContent = `import { Request, Response, NextFunction } from 'express';
import { ApiResponse, AuthenticatedRequest, LoginRequest, RegisterRequest } from '../types/api';
import { AppError } from '../utils/AppError';
import * as authService from '../services/authService';

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

class AuthController {
  /**
   * Register new user
   * @route POST /api/auth/register
   */
  public async register(req: Request<{}, any, RegisterRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData = req.body;
      const result = await authService.signup(userData);
      
      if (result.message) {
        const response: ApiResponse = {
          success: true,
          message: result.message,
          data: null
        };
        return res.status(200).json(response);
      }

      const response: ApiResponse = {
        success: true,
        message: 'User registered successfully',
        data: result.user
      };

      res.status(201).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Registration failed', 400));
    }
  }

  /**
   * Login user
   * @route POST /api/auth/login
   */
  public async login(req: Request<{}, any, LoginRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: result
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Invalid email or password', 401));
    }
  }

  /**
   * Forgot password
   * @route POST /api/auth/forgot-password
   */
  public async forgotPassword(req: Request<{}, any, ForgotPasswordRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const resetToken = await authService.forgotPassword(email);

      const response: ApiResponse = {
        success: true,
        message: 'Password reset instructions sent to your email',
        data: { resetToken: resetToken }
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Failed to process forgot password request', 500));
    }
  }

  /**
   * Reset password
   * @route POST /api/auth/reset-password
   */
  public async resetPassword(req: Request<{}, any, ResetPasswordRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);

      const response: ApiResponse = {
        success: true,
        message: 'Password has been reset successfully',
        data: null
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Password reset failed', 400));
    }
  }

  /**
   * Refresh access token
   * @route POST /api/auth/refresh-token
   */
  public async refreshToken(req: Request<{}, any, RefreshTokenRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const newAccessToken = await authService.refreshAccessToken(refreshToken);

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: { accessToken: newAccessToken }
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Token refresh failed', 401));
    }
  }

  /**
   * Logout user
   * @route POST /api/auth/logout
   */
  public async logout(req: Request<{}, any, RefreshTokenRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully',
        data: null
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Logout failed', 500));
    }
  }

  /**
   * Get user profile
   * @route GET /api/auth/profile
   */
  public async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      
      if (!user) {
        return next(new AppError('User not authenticated', 401));
      }

      const response: ApiResponse = {
        success: true,
        message: 'Profile retrieved successfully',
        data: user
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Failed to get profile', 500));
    }
  }
}

export default new AuthController();`;

  const authMiddlewareContent = `import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/tokenUtils';

export const auth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new AppError('Unauthorized: No token provided', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyAccessToken(token);
    
    if (!decoded) {
      return next(new AppError('Unauthorized: Invalid token', 401));
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    next(new AppError('Unauthorized: Invalid token', 401));
  }
};

export default auth;`;

  const errorHandlerContent = `import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ErrorResponse } from '../types/api';

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }

  const response: ErrorResponse = {
    success: false,
    message,
    error: error.name || 'UnknownError',
    statusCode,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Error Details:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });
  } else {
    // Log only essential info in production
    console.error('Error:', error.message);
  }

  res.status(statusCode).json(response);
};

export const notFound = (req: Request, res: Response): void => {
  const response: ErrorResponse = {
    success: false,
    message: \`Not Found - [\${req.method}] \${req.url}\`,
    error: 'NotFound',
    statusCode: 404
  };

  res.status(404).json(response);
};

export default errorHandler;`;

  const jwtSecret = generateSecret(64);
  const jwtRefreshSecret = generateSecret(64);

  // Read .env from template, replace placeholders and inject auto-generated secrets
  const envFilePath = path.join(projectPath, '.env');
  let envContent = '';

  if (await fs.pathExists(envFilePath)) {
    // .env was already copied from templates by the 'new' command — inject secrets
    envContent = await fs.readFile(envFilePath, 'utf-8');
    envContent = envContent.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
  } else {
    // Fallback if template .env was not copied
    envContent = `# Environment Configuration
NODE_ENV=development
PORT=8000

# Database
MONGODB_URI=mongodb://localhost:27017/${projectName}

# JWT Configuration (auto-generated secure secrets)
JWT_SECRET=REPLACE_WITH_AUTO_GENERATED_SECRET
JWT_REFRESH_SECRET=REPLACE_WITH_AUTO_GENERATED_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5000

# API Configuration
API_URL=http://localhost:8000

# Pagination Configuration
DEFAULT_PAGE_LIMIT=10
MAX_PAGE_LIMIT=100`;
  }

  // Inject auto-generated JWT secrets
  envContent = envContent.replace(/REPLACE_WITH_AUTO_GENERATED_SECRET/, jwtSecret);
  envContent = envContent.replace(/REPLACE_WITH_AUTO_GENERATED_SECRET/, jwtRefreshSecret);

  // Generate auth service layer
  const authServiceContent = `import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Types } from 'mongoose';
import User from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenUtils';
import { AppError } from '../utils/AppError';

export interface IUser {
  _id?: string;
  username: string;
  email: string;
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const login = async (email: string, password: string) => {
  const user = await User.findOne({ email }).lean();
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const userId = (user._id as Types.ObjectId).toString();

  const accessToken = await generateAccessToken({ userId });
  const refreshToken = await generateRefreshToken({ userId });

  // TODO: Store refresh token in database
  // await new RefreshToken({ userId, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }).save();

  const { password: _, ...userWithoutPassword } = user;
  return { accessToken, refreshToken, user: userWithoutPassword };
};

export const signup = async (userData: IUser & { password: string }) => {
  try {
    const existingUser = await User.findOne({ email: userData.email }).lean();
    if (existingUser) {
      return { message: 'User already exists with this email' };
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const newUser = new User({ ...userData, password: hashedPassword });

    await newUser.save();
    const { password: _, ...userWithoutPassword } = newUser.toObject();
    return { user: userWithoutPassword };
  } catch (error: any) {
    throw new AppError('Signup failed: ' + error.message, 400);
  }
};

export const forgotPassword = async (email: string): Promise<string> => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No user found with that email address', 404);
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // TODO: Store reset token in database with expiration
  // await new PasswordReset({ userId: user._id, token: hashedToken, expiresAt: Date.now() + 10 * 60 * 1000 }).save();

  return resetToken;
};

export const resetPassword = async (token: string, newPassword: string) => {
  // Validate password strength
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$/.test(newPassword)) {
    throw new AppError('Password must be at least 8 characters long and contain lowercase, uppercase, number, and special character', 400);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // TODO: Find and validate reset token
  // const resetRecord = await PasswordReset.findOne({ token: hashedToken, expiresAt: { $gt: Date.now() } });
  // if (!resetRecord) throw new AppError('Invalid or expired reset token', 400);

  // TODO: Update user password
  // const user = await User.findById(resetRecord.userId);
  // if (!user) throw new AppError('User not found', 404);
  // user.password = await bcrypt.hash(newPassword, 12);
  // await user.save();
  // await PasswordReset.deleteOne({ _id: resetRecord._id });

  return 'Password has been reset successfully';
};

export const refreshAccessToken = async (refreshToken: string) => {
  try {
    const decoded = await verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AppError('Invalid refresh token', 401);
    }

    // TODO: Validate stored refresh token
    // const storedToken = await RefreshToken.findOne({ token: refreshToken });
    // if (!storedToken) throw new AppError('Invalid refresh token', 401);

    return await generateAccessToken({ userId: decoded.userId });
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
};

export const logout = async (refreshToken: string) => {
  // TODO: Remove refresh token from database
  // await RefreshToken.deleteOne({ token: refreshToken });
  return true;
};`;

  // Generate token utilities
  const tokenUtilsContent = `import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;

export interface TokenPayload {
  userId: string;
  exp?: number;
}

export const generateAccessToken = async (payload: TokenPayload): Promise<string> => {
  const accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
  return jwt.sign(payload, JWT_SECRET, { expiresIn: accessTokenExpiry });
};

export const generateRefreshToken = async (payload: TokenPayload): Promise<string> => {
  const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: refreshTokenExpiry });
};

export const verifyAccessToken = async (token: string): Promise<TokenPayload | null> => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = async (token: string): Promise<TokenPayload | null> => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};`;

  // NOTE: Template files from templates/src/ are already copied by the 'new' command.
  // We only generate files that need dynamic values (secrets, project name).
  // The following files are NOT overwritten — they come from templates/src/ which has
  // more complete implementations (Google auth, email verification, refresh token rotation, etc.):
  //   - controllers/authController.ts
  //   - middleware/auth.ts
  //   - middleware/errorHandler.ts
  //   - services/authService.ts
  //   - utils/tokenUtils.ts
  //   - routes/index.ts
  //   - routes/auth.ts

  // Only write .env with auto-generated secrets
  await fs.writeFile(path.join(projectPath, '.env'), envContent);
  console.log(colors.green('✅ Created file: .env (with auto-generated JWT secrets)'));
};

program
  .name('koti')
  .description('⚠️  DEVELOPMENT VERSION: CLI tool to generate TypeScript Bun API projects with Express and MongoDB\n    This is an initial development release and may contain errors or bugs.\n    Use at your own discretion and always review generated code before production use.')
  .version(getVersion());

// TypeScript Model Generation Command
program
  .command('model')
  .argument('<model-name>', 'Name of the model to create')
  .description('Create a new TypeScript model with schema registry')
  .action(async (modelName: string) => {
    try {
      console.log(colors.blue(`🏗️ Creating TypeScript model: ${capitalize(modelName)}`));

      const rl = createReadlineInterface();
      const fields: FieldSpec[] = [];

      console.log(colors.cyan('\n📝 Define your model fields:'));
      console.log(colors.dim('Available data types:'));
      console.log(colors.dim('1. String    2. Number    3. Date      4. Boolean'));
      console.log(colors.dim('5. ObjectId  6. Array     7. Mixed     8. JSON'));
      console.log(colors.dim('Type "done" when finished\n'));

      const dataTypes = ['String', 'Number', 'Date', 'Boolean', 'ObjectId', 'Array', 'Mixed', 'JSON'];

      let fieldName = '';
      while (fieldName !== 'done') {
        fieldName = await askQuestion(rl, colors.yellow('Field name (or "done" to finish): '));

        if (fieldName === 'done') break;
        if (!fieldName.trim()) continue;

        // Show data type options
        console.log(colors.cyan('\nSelect data type:'));
        dataTypes.forEach((type, index) => {
          console.log(colors.dim(`${index + 1}. ${type}`));
        });

        const typeChoice = await askQuestion(rl, colors.yellow('Enter type number (1-8): '));
        const typeIndex = parseInt(typeChoice) - 1;

        if (typeIndex < 0 || typeIndex >= dataTypes.length) {
          console.log(colors.red('❌ Invalid choice. Please select 1-8.'));
          continue;
        }

        const fieldType = dataTypes[typeIndex];
        const isRequired = (await askQuestion(rl, colors.yellow('Required? (y/n): '))).toLowerCase() === 'y';
        const isUnique = (await askQuestion(rl, colors.yellow('Unique? (y/n): '))).toLowerCase() === 'y';
        const isIndexed = (await askQuestion(rl, colors.yellow('Add index? (y/n): '))).toLowerCase() === 'y';
        const defaultValue = await askQuestion(rl, colors.yellow('Default value (press enter to skip): '));

        fields.push({
          name: fieldName,
          type: fieldType as FieldSpec['type'],
          required: isRequired,
          unique: isUnique || undefined,
          index: isIndexed || undefined,
          default: defaultValue || undefined
        });

        console.log(colors.green(`✅ Added field: ${fieldName} (${fieldType})`));
      }

      // Ask if user wants to generate CRUD operations
      const generateCRUD = (await askQuestion(rl, colors.cyan('\n🔧 Generate CRUD operations (controller, service, routes)? (y/n): '))).toLowerCase() === 'y';

      // Ask if user wants to add CRUD tasks for permission control
      let withTasks = false;
      if (generateCRUD) {
        withTasks = (await askQuestion(rl, colors.cyan('🔐 Add CRUD tasks for permission control? (y/n): '))).toLowerCase() === 'y';
      }

      rl.close();

      const result = await createModel({
        projectRoot: process.cwd(),
        name: modelName,
        fields,
        crud: generateCRUD,
        tasks: withTasks,
      });

      // Determine framework only for display purposes (createModel already resolved it internally).
      const ctx = await resolveProject(process.cwd());
      const isElysia = ctx.framework === 'elysia';
      const crudCamelName = toCamelCase(modelName);

      console.log(colors.green(`✅ Created TypeScript model: src/models/${capitalize(modelName)}.ts`));
      console.log(colors.green(`✅ Updated export in src/models/index.ts`));

      const indexedFieldNames = fields.filter(f => f.index).map(f => f.name);
      if (indexedFieldNames.length > 0) {
        console.log(colors.dim(`   Indexed fields (now applied to the schema): ${indexedFieldNames.join(', ')}`));
      }

      if (generateCRUD) {
        // Did createModel actually add the RBAC tasks, or fall back (Task.ts missing/duplicate)?
        const tasksActuallyAdded = withTasks && result.files.some(f => f.endsWith(path.join('src', 'enums', 'Task.ts')));

        if (withTasks) {
          if (tasksActuallyAdded) {
            const upperSnakeName = toUpperSnakeCase(modelName);
            console.log(colors.green(`✅ Added CRUD tasks to src/enums/Task.ts`));
            console.log(colors.dim(`   VIEW_${upperSnakeName}, CREATE_${upperSnakeName}, UPDATE_${upperSnakeName}, DELETE_${upperSnakeName}`));
          } else {
            console.log(colors.yellow(`⚠️  Could not add tasks (Task.ts not found or tasks already exist)`));
          }
        }

        console.log(colors.green(`✅ Created TypeScript controller: src/controllers/${crudCamelName}Controller.ts`));
        console.log(colors.green(`✅ Created TypeScript service: src/services/${crudCamelName}Service.ts`));
        console.log(colors.green(`✅ Created ${isElysia ? 'TypeBox validator' : 'Joi validation'}: src/validators/${crudCamelName}.ts`));
        console.log(colors.green(`✅ Created TypeScript routes: src/routes/${crudCamelName}.ts`));
        console.log(colors.green(`✅ Registered route in src/routes/index.ts`));

        console.log(colors.cyan('\n📚 Generated CRUD system includes:'));
        console.log('   • Model with Mongoose schema and TypeScript types');
        console.log('   • Controller with full CRUD operations (GET, POST, PUT, DELETE)');
        console.log('   • Service layer with business logic and pagination');
        console.log('   • Routes with Swagger documentation');
        console.log('   • Pagination support (configurable in .env - DEFAULT_PAGE_LIMIT)');
        console.log('   • Automatic route registration');
        if (tasksActuallyAdded) {
          console.log('   • CRUD tasks added to Task enum (VIEW, CREATE, UPDATE, DELETE)');
          console.log('   • Routes protected with checkPermission middleware');
        }

        console.log(colors.yellow('\n🔧 Next steps:'));
        console.log('   • Update .env file with DEFAULT_PAGE_LIMIT (default: 10)');
        if (tasksActuallyAdded) {
          console.log('   • Assign the new tasks to roles via your admin panel or seed script');
        }
        console.log('   • Run TypeScript compilation: npm run build');
        console.log('   • Test the CRUD endpoints in your API');
      } else {
        console.log(colors.cyan('\n📚 Model created successfully!'));
        console.log(colors.yellow('🔧 Next steps:'));
        console.log('   • Import the model in your controllers');
        console.log('   • Use "koti controller", "koti service" for CRUD operations');
        console.log('   • Run TypeScript compilation: npm run build');
      }

      result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// TypeScript Enum Generation Command
program
  .command('enum')
  .argument('<enum-name>', 'Name of the enum to create')
  .description('Create a new TypeScript enum')
  .action(async (enumName: string) => {
    try {
      console.log(colors.blue(`📋 Creating TypeScript enum: ${capitalize(enumName)}`));
      
      const rl = createReadlineInterface();
      const enumType = await askQuestion(rl, colors.yellow('Enum type (string/number): '));
      
      if (!enumTypes.includes(enumType)) {
        console.log(colors.red('❌ Invalid enum type. Use "string" or "number"'));
        rl.close();
        process.exit(1);
      }

      const values: { key: string; value: string | number }[] = [];
      
      console.log(colors.cyan('\n📝 Define your enum values:'));
      console.log(colors.dim('Type "done" when finished\n'));

      let key = '';
      while (key !== 'done') {
        key = await askQuestion(rl, colors.yellow('Enum key (or "done" to finish): '));
        
        if (key === 'done') break;
        if (!key.trim()) continue;

        let value: string | number;
        if (enumType === 'string') {
          value = await askQuestion(rl, colors.yellow(`String value for ${key}: `));
        } else {
          const numValue = await askQuestion(rl, colors.yellow(`Number value for ${key}: `));
          value = parseInt(numValue);
        }

        values.push({ key: key.toUpperCase(), value });
        console.log(colors.green(`✅ Added: ${key.toUpperCase()} = ${value}`));
      }

      rl.close();

      const result = await createEnum({
        projectRoot: process.cwd(),
        name: enumName,
        enumType: enumType as 'string' | 'number',
        values,
      });

      console.log(colors.green(`✅ Created TypeScript enum: src/enums/${capitalize(enumName)}.ts`));
      console.log(colors.green(`✅ Updated export in src/enums/index.ts`));
      result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// TypeScript Controller Generation Command
program
  .command('controller')
  .argument('<controller-name>', 'Name of the controller to create')
  .description('Create a new TypeScript controller')
  .action(async (controllerName: string) => {
    try {
      console.log(colors.blue(`🎮 Creating TypeScript controller: ${capitalize(controllerName)}`));

      const result = await createController({ projectRoot: process.cwd(), name: controllerName });

      console.log(colors.green(`✅ Created TypeScript controller: src/controllers/${toCamelCase(controllerName)}Controller.ts`));
      console.log(colors.green(`✅ Updated export in src/controllers/index.ts`));
      result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// TypeScript Service Generation Command
program
  .command('service')
  .argument('<service-name>', 'Name of the service to create')
  .description('Create a new TypeScript service')
  .action(async (serviceName: string) => {
    try {
      console.log(colors.blue(`⚙️ Creating TypeScript service: ${capitalize(serviceName)}`));

      const result = await createService({ projectRoot: process.cwd(), name: serviceName });

      console.log(colors.green(`✅ Created TypeScript service: src/services/${toCamelCase(serviceName)}Service.ts`));
      console.log(colors.green(`✅ Updated export in src/services/index.ts`));
      result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// TypeScript Middleware Generation Command
program
  .command('middleware')
  .argument('<middleware-name>', 'Name of the middleware to create')
  .description('Create a new TypeScript middleware')
  .action(async (middlewareName: string) => {
    try {
      console.log(colors.blue(`🛡️ Creating TypeScript middleware: ${toCamelCase(middlewareName)}`));

      const result = await createMiddleware({ projectRoot: process.cwd(), name: middlewareName });

      console.log(colors.green(`✅ Created TypeScript middleware: src/middleware/${toCamelCase(middlewareName)}.ts`));
      console.log(colors.green(`✅ Updated export in src/middleware/index.ts`));
      result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });


program
  .command('new')
  .alias('create')
  .argument('<project-name>', 'Name of the project to create')
  .option('--framework <framework>', 'Framework choice: express or elysia (default: express)')
  .description('Create a new TypeScript Bun API project')
  .action(async (projectName: string, options: { framework?: string }) => {
    try {
      console.log(colors.blue(`🚀 Creating TypeScript Bun API project: ${projectName}`));
      
      const projectPath = path.join(process.cwd(), projectName);
      console.log(colors.dim(`📁 Project directory: ${projectPath}`));
      
      // Create project directory
      await fs.ensureDir(projectPath);
      
      // Resolve framework: the --framework flag wins (CI-friendly). Otherwise
      // prompt interactively — but only when attached to a TTY. In non-interactive
      // contexts (CI, pipes, tests) there is no one to answer, so default to express.
      let framework = options?.framework?.toLowerCase();
      if (!framework) {
        if (process.stdin.isTTY) {
          const rl = createReadlineInterface();
          const answer = (await askQuestion(
            rl,
            colors.cyan('\n📦 Choose a framework:\n  1) Express (default)\n  2) Elysia\nEnter choice [1-2 or name]: ')
          )).trim().toLowerCase();
          rl.close();
          framework = (answer === '2' || answer === 'elysia') ? 'elysia' : 'express';
        } else {
          framework = 'express';
        }
      }
      if (!['express', 'elysia'].includes(framework)) {
        console.error(colors.red('Error: Framework must be either express or elysia'));
        process.exit(1);
      }
      console.log(colors.dim(`🧩 Framework: ${framework}`));
      const templatePath = path.join(__dirname, '..', 'templates', framework);
      const sharedTemplatePath = path.join(__dirname, '..', 'templates', 'shared');
      
      // Create src directory structure
      const srcPath = path.join(projectPath, 'src');
      const directories = [
        'config', 'controllers', 'middleware', 'models',
        'routes', 'types', 'utils', 'services', 'schemas', 'enums', 'validators', 'seeds'
      ];
      
      for (const dir of directories) {
        await fs.ensureDir(path.join(srcPath, dir));
        console.log(colors.green(`✅ Created directory: src/${dir}/`));
      }

      // Copy package.json and README from templates
      const packageJsonPath = path.join(templatePath, 'package.json');
      const readmePath = path.join(templatePath, 'README.md');
      
      if (await fs.pathExists(packageJsonPath)) {
        let content = await fs.readFile(packageJsonPath, 'utf-8');
        content = content.replace(/{{PROJECT_NAME}}/g, projectName);
        await fs.writeFile(path.join(projectPath, 'package.json'), content);
        console.log(colors.green('✅ Created file: package.json'));
      }
      
      if (await fs.pathExists(readmePath)) {
        let content = await fs.readFile(readmePath, 'utf-8');
        content = content.replace(/{{PROJECT_NAME}}/g, projectName);
        await fs.writeFile(path.join(projectPath, 'README.md'), content);
        console.log(colors.green('✅ Created file: README.md'));
      }


      // Copy all TypeScript template files and replace placeholders
      const templateSrcPath = path.join(templatePath, 'src');
      const projectSrcPath = path.join(projectPath, 'src');

      // Replace {{PROJECT_NAME}} in all copied .ts/.json files
      const replaceInDir = async (dirPath: string): Promise<void> => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            await replaceInDir(fullPath);
          } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.json')) {
            let content = await fs.readFile(fullPath, 'utf-8');
            if (content.includes('{{PROJECT_NAME}}')) {
              content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
              await fs.writeFile(fullPath, content);
            }
          }
        }
      };

      // Copy framework-specific source files (templates/<framework>/src)
      if (await fs.pathExists(templateSrcPath)) {
        await fs.copy(templateSrcPath, projectSrcPath);
        console.log(colors.green('✅ Copied framework source files'));
      }

      // Copy shared source files (models, services, utils, enums, seeds, types).
      // Runs for BOTH frameworks, independent of whether the framework ships its
      // own src/ — must NOT be nested inside the framework-src check above.
      const sharedSrcPath = path.join(sharedTemplatePath, 'src');
      if (await fs.pathExists(sharedSrcPath)) {
        await fs.copy(sharedSrcPath, projectSrcPath);
        console.log(colors.green('✅ Copied shared source files'));
      }

      // Replace placeholders across everything that was copied (framework + shared)
      if (await fs.pathExists(projectSrcPath)) {
        await replaceInDir(projectSrcPath);
      }
      
      // Copy additional template files
      const additionalFiles = [
        'tsconfig.json',
        '.env',
        '.env.example',
        '.gitignore'
      ];
      
      for (const fileName of additionalFiles) {
        const templateFilePath = path.join(templatePath, fileName);
        const projectFilePath = path.join(projectPath, fileName);
        
        if (await fs.pathExists(templateFilePath)) {
          let content = await fs.readFile(templateFilePath, 'utf-8');
          content = content.replace(/{{PROJECT_NAME}}/g, projectName);
          await fs.writeFile(projectFilePath, content);
          console.log(colors.green(`✅ Created file: ${fileName}`));
        }
      }

      // Generate additional necessary files (framework-aware)
      await generateEssentialFiles(projectPath, projectName, framework);

      // Write koti.config.json so generator commands can detect the framework later
      const kotiConfig = {
        framework,
        kotiVersion: getVersion(),
        createdAt: new Date().toISOString()
      };
      await fs.writeFile(
        path.join(projectPath, 'koti.config.json'),
        JSON.stringify(kotiConfig, null, 2)
      );
      console.log(colors.green('✅ Created file: koti.config.json'));

      console.log(colors.green('\n🎉 TypeScript project created successfully!'));
      
      // Automatically install dependencies
      console.log(colors.blue('\n📦 Installing dependencies...'));
      let installSuccess = false;
      
      // Simple approach to run bun install
      try {
        const { execSync } = require('child_process');
        console.log(colors.dim('Running: bun install'));
        
        const result = execSync('bun install', { 
          cwd: projectPath,
          stdio: 'inherit',
          timeout: 45000 // 45 second timeout
        });
        
        console.log(colors.green('✅ Dependencies installed successfully with bun!'));
        installSuccess = true;
        
      } catch (error) {
        console.log(colors.yellow('⚠️  Bun install failed, trying npm install...'));
        
        // Fallback to npm install
        try {
          const { execSync } = require('child_process');
          console.log(colors.dim('Running: npm install'));
          
          const result = execSync('npm install', { 
            cwd: projectPath,
            stdio: 'inherit',
            timeout: 60000 // 60 second timeout
          });
          
          console.log(colors.green('✅ Dependencies installed successfully with npm!'));
          installSuccess = true;
          
        } catch (npmError) {
          console.log(colors.red('❌ Failed to install dependencies automatically'));
          console.log(colors.yellow('   Please run "bun install" or "npm install" manually in the project directory'));
        }
      }
      
      if (installSuccess) {
        console.log(colors.green('✅ Project is ready to use!'));
      }
      
      console.log(colors.cyan('\n📋 Next steps:'));
      console.log(`   1. cd ${projectName}`);
      console.log('   2. Update .env file with your MongoDB URI and JWT secret');
      console.log('   3. Start MongoDB server');
      console.log('   4. bun run dev');
      
      console.log(colors.blue('\n📚 Useful commands:'));
      console.log('   • npm run build   - Build TypeScript to JavaScript');
      console.log('   • npm start       - Start production server');
      console.log('   • bun run dev     - Start development server with Bun');
      console.log('   • npm run dev:ts  - Start development server with ts-node');

      console.log(colors.cyan('\n🌐 Default endpoints:'));
      console.log('   • http://localhost:8000/health     - Health check');
      console.log('   • http://localhost:8000/api/       - API welcome');
      console.log('   • http://localhost:8000/api-docs   - Swagger documentation');

      console.log(colors.cyan('\n🔐 Authentication endpoints:'));
      console.log('   • POST /api/auth/register - Register user');
      console.log('   • POST /api/auth/login    - Login user');
      console.log('   • GET  /api/auth/me       - Get current user');
      
      console.log(colors.yellow('\n💡 Don\'t forget to:'));
      console.log('   • Set up your MongoDB database');
      console.log('   • Generate a secure JWT secret');
      console.log('   • Configure your environment variables');
      console.log('   • Review the generated TypeScript code');
      
      console.log(colors.red('\n⚠️  IMPORTANT DISCLAIMER:'));
      console.log(`   • This is a development version (v${getVersion()}) and may contain errors`);
      console.log('   • Review all generated code before production use');
      console.log('   • Test thoroughly in development environments');
      console.log('   • Update dependencies to latest secure versions');
      
      console.log(colors.green('\nHappy coding! 🚀'));

    } catch (error) {
      console.error(colors.red('❌ Error creating project:'), (error as Error).message);
      process.exit(1);
    }
  });

// Model Edit Command
program
  .command('model:edit')
  .argument('<model-name>', 'Name of the model to edit')
  .description('Edit an existing TypeScript model (add/delete fields)')
  .action(async (modelName: string) => {
    try {
      console.log(colors.blue(`✏️ Editing TypeScript model: ${capitalize(modelName)}`));

      // Check if model exists
      let existingFields: FieldSpec[];
      try {
        existingFields = await parseExistingModel(process.cwd(), modelName);
      } catch (error) {
        if (error instanceof GeneratorError) {
          console.log(colors.red(`❌ Model ${capitalize(modelName)} not found!`));
          console.log(colors.yellow('💡 Use "koti model <name>" to create a new model'));
          process.exit(1);
        }
        throw error;
      }

      // Check if CRUD operations exist
      const editCamelName = toCamelCase(modelName);
      const controllerPath = path.join(process.cwd(), 'src', 'controllers', `${editCamelName}Controller.ts`);
      const servicePath = path.join(process.cwd(), 'src', 'services', `${editCamelName}Service.ts`);
      const routePath = path.join(process.cwd(), 'src', 'routes', `${editCamelName}.ts`);
      const [hasController, hasService, hasRoutes] = await Promise.all([
        fs.pathExists(controllerPath),
        fs.pathExists(servicePath),
        fs.pathExists(routePath),
      ]);
      const hasCRUD = hasController || hasService || hasRoutes;

      console.log(colors.green(`✅ Found model: ${capitalize(modelName)}`));
      console.log(colors.dim(`   Fields: ${existingFields.map(f => f.name).join(', ')}`));

      if (hasCRUD) {
        console.log(colors.cyan('🔧 CRUD operations detected:'));
        if (hasController) console.log(colors.dim('   • Controller'));
        if (hasService) console.log(colors.dim('   • Service'));
        if (hasRoutes) console.log(colors.dim('   • Routes'));
      }

      const rl = createReadlineInterface();
      let updatedFields: FieldSpec[] = [...existingFields];
      const addFields: FieldSpec[] = [];
      const removeFields: string[] = [];
      let updateCRUD = false;

      while (true) {
        console.log(colors.cyan('\n📝 Current fields:'));
        updatedFields.forEach((field, index) => {
          const attrs = [];
          if (field.required) attrs.push('required');
          if (field.unique) attrs.push('unique');
          if (field.default) attrs.push(`default: ${field.default}`);
          const attrStr = attrs.length > 0 ? ` (${attrs.join(', ')})` : '';
          console.log(colors.dim(`   ${index + 1}. ${field.name}: ${field.type}${attrStr}`));
        });

        console.log(colors.yellow('\n🔧 Available actions:'));
        console.log('   1. Add new field');
        console.log('   2. Delete field');
        console.log('   3. Save changes');
        console.log('   4. Cancel');

        const action = await askQuestion(rl, colors.yellow('Choose action (1-4): '));

        if (action === '1') {
          // Add new field
          console.log(colors.cyan('\n➕ Adding new field:'));
          console.log(colors.dim('Available data types:'));
          console.log(colors.dim('1. String    2. Number    3. Date      4. Boolean'));
          console.log(colors.dim('5. ObjectId  6. Array     7. Mixed     8. JSON'));

          const dataTypes = ['String', 'Number', 'Date', 'Boolean', 'ObjectId', 'Array', 'Mixed', 'JSON'];

          const fieldName = await askQuestion(rl, colors.yellow('Field name: '));
          if (!fieldName.trim()) {
            console.log(colors.red('❌ Field name cannot be empty'));
            continue;
          }

          // Check if field already exists
          if (updatedFields.some(f => f.name === fieldName)) {
            console.log(colors.red(`❌ Field "${fieldName}" already exists`));
            continue;
          }

          console.log(colors.cyan('\nSelect data type:'));
          dataTypes.forEach((type, index) => {
            console.log(colors.dim(`${index + 1}. ${type}`));
          });

          const typeChoice = await askQuestion(rl, colors.yellow('Enter type number (1-8): '));
          const typeIndex = parseInt(typeChoice) - 1;

          if (typeIndex < 0 || typeIndex >= dataTypes.length) {
            console.log(colors.red('❌ Invalid choice. Please select 1-8.'));
            continue;
          }

          const fieldType = dataTypes[typeIndex];
          const isRequired = (await askQuestion(rl, colors.yellow('Required? (y/n): '))).toLowerCase() === 'y';
          const isUnique = (await askQuestion(rl, colors.yellow('Unique? (y/n): '))).toLowerCase() === 'y';
          const isIndexed = (await askQuestion(rl, colors.yellow('Add index? (y/n): '))).toLowerCase() === 'y';
          const defaultValue = await askQuestion(rl, colors.yellow('Default value (press enter to skip): '));

          const newField: FieldSpec = {
            name: fieldName,
            type: fieldType as FieldSpec['type'],
            required: isRequired,
            unique: isUnique || undefined,
            index: isIndexed || undefined,
            default: defaultValue || undefined,
          };

          updatedFields.push(newField);
          addFields.push(newField);

          console.log(colors.green(`✅ Added field: ${fieldName} (${fieldType})`));

        } else if (action === '2') {
          // Delete field
          if (updatedFields.length === 0) {
            console.log(colors.red('❌ No fields to delete'));
            continue;
          }

          console.log(colors.cyan('\n🗑️ Delete field:'));
          updatedFields.forEach((field, index) => {
            console.log(colors.dim(`   ${index + 1}. ${field.name}: ${field.type}`));
          });

          const deleteChoice = await askQuestion(rl, colors.yellow('Enter field number to delete (or enter to cancel): '));
          if (!deleteChoice.trim()) continue;

          const deleteIndex = parseInt(deleteChoice) - 1;
          if (deleteIndex >= 0 && deleteIndex < updatedFields.length) {
            const deletedField = updatedFields.splice(deleteIndex, 1)[0];
            console.log(colors.green(`✅ Deleted field: ${deletedField.name}`));

            // If the field was only added earlier in this session, drop it from addFields
            // instead of recording a remove (it never existed in the persisted model).
            const addedIndex = addFields.findIndex(f => f.name === deletedField.name);
            if (addedIndex >= 0) {
              addFields.splice(addedIndex, 1);
            } else {
              removeFields.push(deletedField.name);
            }
          } else {
            console.log(colors.red('❌ Invalid field number'));
          }

        } else if (action === '3') {
          // Save changes
          const hasChanges = addFields.length > 0 || removeFields.length > 0;

          if (!hasChanges) {
            console.log(colors.yellow('ℹ️ No changes detected'));
            break;
          }

          console.log(colors.cyan('\n💾 Saving changes...'));

          // Ask about updating CRUD operations
          if (hasCRUD) {
            console.log(colors.cyan('\n🔄 CRUD operations detected'));
            updateCRUD = (await askQuestion(rl, colors.yellow('Update CRUD operations with new schema? (y/n): '))).toLowerCase() === 'y';
          }

          const result = await editModel({
            projectRoot: process.cwd(),
            name: modelName,
            addFields,
            removeFields,
            updateCrud: updateCRUD,
          });

          console.log(colors.green(`✅ Updated model: src/models/${capitalize(modelName)}.ts`));

          if (updateCRUD) {
            console.log(colors.blue('🔄 Updating CRUD operations...'));

            if (result.files.includes(controllerPath)) {
              console.log(colors.green(`✅ Updated controller: src/controllers/${editCamelName}Controller.ts`));
              console.log(colors.dim(`   Backup saved: src/controllers/${editCamelName}Controller.ts.bak`));
            }
            if (result.files.includes(servicePath)) {
              console.log(colors.green(`✅ Updated service: src/services/${editCamelName}Service.ts`));
              console.log(colors.dim(`   Backup saved: src/services/${editCamelName}Service.ts.bak`));
            }
            if (result.files.includes(routePath)) {
              console.log(colors.green(`✅ Updated routes: src/routes/${editCamelName}.ts`));
              console.log(colors.dim(`   Backup saved: src/routes/${editCamelName}.ts.bak`));
            }

            console.log(colors.green('\n✅ CRUD operations updated successfully!'));
            console.log(colors.cyan('💡 What happened:'));
            console.log(colors.dim('   • Previous files saved as .bak backups'));
            console.log(colors.dim('   • New code generated based on updated schema'));
            console.log(colors.dim('   • Files are clean and compilable — no commented-out code'));
            console.log(colors.dim('   • Both versions coexist in the same files for easy comparison'));
          }

          result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

          console.log(colors.cyan('\n🎉 Model edit completed successfully!'));
          console.log(colors.yellow('\n🔧 Next steps:'));
          console.log('   • Run TypeScript compilation: npm run build');
          console.log('   • Test your updated model and API endpoints');
          if (hasCRUD && !updateCRUD) {
            console.log('   • Consider manually updating CRUD operations if needed');
          }

          break;

        } else if (action === '4') {
          // Cancel
          console.log(colors.yellow('✖️ Edit cancelled'));
          break;
        } else {
          console.log(colors.red('❌ Invalid choice. Please select 1-4.'));
        }
      }

      rl.close();

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Error editing model:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

// Task Creation Command — adds a new task to the Task enum
program
  .command('task')
  .argument('<task-name>', 'Name of the task to create (e.g., MANAGE_USERS)')
  .description('Add a new task to the Task enum for role-based authorization')
  .action(async (taskName: string) => {
    try {
      const taskKey = taskName.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

      const rl = createReadlineInterface();
      const description = await askQuestion(rl, colors.yellow('Task description: '));
      rl.close();

      if (!description.trim()) {
        console.log(colors.red('❌ Description is required'));
        process.exit(1);
      }

      const result = await createTask({
        projectRoot: process.cwd(),
        name: taskKey,
        description,
      });

      console.log(colors.green(`✅ Added task: ${taskKey}`));
      console.log(colors.dim(`   Description: ${description}`));
      console.log(colors.dim(`   File: src/enums/Task.ts`));
      result.files.forEach((f) => console.log(colors.dim(`   ${f}`)));
      result.warnings.forEach((w) => console.log(colors.yellow(`⚠️  ${w}`)));

      console.log(colors.cyan('\n💡 Usage in routes:'));
      console.log(colors.dim(`   import { checkPermission } from '../middleware/checkPermission';`));
      console.log(colors.dim(`   import { Task } from '../enums/Task';`));
      console.log(colors.dim(`   router.get('/endpoint', auth, checkPermission(Task.${taskKey}), handler);`));

    } catch (error) {
      if (error instanceof GeneratorError) {
        console.error(colors.red(`❌ ${error.message}`));
      } else {
        console.error(colors.red('❌ Unexpected error:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

program.parse();