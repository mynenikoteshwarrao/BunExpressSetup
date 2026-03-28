#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const crypto = __importStar(require("crypto"));
// Read version from centralized location with fallback
const getVersion = () => {
    const candidates = [
        path.join(__dirname, '..', 'version.json'),
        path.join(__dirname, '..', 'package.json'),
    ];
    for (const candidate of candidates) {
        try {
            const data = JSON.parse(fs.readFileSync(candidate, 'utf8'));
            if (data.version)
                return data.version;
        }
        catch { }
    }
    console.error(colors.yellow('⚠️  Could not determine CLI version. Using fallback.'));
    return '0.0.0-unknown';
};
// Generate a cryptographically secure random secret
const generateSecret = (bytes = 64) => {
    return crypto.randomBytes(bytes).toString('hex');
};
const program = new commander_1.Command();
// Console colors without chalk
const colors = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`,
    dim: (text) => `\x1b[2m${text}\x1b[0m`
};
// Available Mongoose data types with TypeScript equivalents
const availableDataTypes = [
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
const enumTypes = ['string', 'number'];
// Helper function to create readline interface
const createReadlineInterface = () => {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
};
// Helper function to ask question
const askQuestion = (rl, question) => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
};
// Helper function to capitalize first letter
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
// Helper function to convert to camelCase
const toCamelCase = (str) => {
    return str.charAt(0).toLowerCase() + str.slice(1);
};
// Helper function to convert to kebab-case
const toKebabCase = (str) => {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
};
// Helper function to convert to UPPER_SNAKE_CASE (e.g., UserProfile → USER_PROFILE)
const toUpperSnakeCase = (str) => {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
};
/**
 * Insert a task entry into src/enums/Task.ts (both enum and TaskDescriptions).
 * Returns true if the task was added, false if it already exists or the file is missing.
 */
const addTaskToEnum = async (taskKey, description) => {
    const enumPath = path.join(process.cwd(), 'src', 'enums', 'Task.ts');
    if (!await fs.pathExists(enumPath)) {
        return false;
    }
    let content = await fs.readFile(enumPath, 'utf-8');
    // Skip if task already exists
    if (content.includes(`${taskKey} =`) || content.includes(`${taskKey}=`)) {
        return false;
    }
    // Insert new entry before the closing brace of the Task enum
    const enumClosingMatch = content.match(/([ \t]*\w+\s*=\s*'[^']*',?\s*\n)(}\s*\n)/);
    if (!enumClosingMatch) {
        return false;
    }
    const lastEntry = enumClosingMatch[1];
    const closingBrace = enumClosingMatch[2];
    const lastEntryWithComma = lastEntry.trimEnd().endsWith(',')
        ? lastEntry
        : lastEntry.replace(/(\S)\s*$/, '$1,\n');
    const newEnumEntry = `\n  /** ${description} */\n  ${taskKey} = '${taskKey}',\n`;
    content = content.replace(lastEntry + closingBrace, lastEntryWithComma + newEnumEntry + closingBrace);
    // Insert into TaskDescriptions
    const descClosingMatch = content.match(/([ \t]*\[Task\.\w+\]:\s*'[^']*',?\s*\n)(};\s*\n?)/);
    if (descClosingMatch) {
        const lastDescEntry = descClosingMatch[1];
        const descClosing = descClosingMatch[2];
        const lastDescWithComma = lastDescEntry.trimEnd().endsWith(',')
            ? lastDescEntry
            : lastDescEntry.replace(/(\S)\s*$/, '$1,\n');
        const newDescEntry = `  [Task.${taskKey}]: '${description.replace(/'/g, "\\'")}',\n`;
        content = content.replace(lastDescEntry + descClosing, lastDescWithComma + newDescEntry + descClosing);
    }
    await fs.writeFile(enumPath, content);
    return true;
};
// Helper function to parse existing model schema
const parseExistingModel = async (modelName) => {
    const modelPath = path.join(process.cwd(), 'src', 'models', `${capitalize(modelName)}.ts`);
    if (!await fs.pathExists(modelPath)) {
        return { fields: [], hasSchema: false };
    }
    const content = await fs.readFile(modelPath, 'utf-8');
    const fields = [];
    // Simple regex parsing to extract schema fields
    // Match from `({` to `}, {` (the boundary between schema fields and schema options)
    const schemaMatch = content.match(/const\s+\w+Schema\s*=\s*new\s+Schema<.*?>\(\{([\s\S]*?)\},\s*\{/);
    if (schemaMatch) {
        const schemaContent = schemaMatch[1];
        const fieldMatches = schemaContent.match(/(\w+):\s*\{[^}]+\}/g);
        if (fieldMatches) {
            fieldMatches.forEach(fieldMatch => {
                const nameMatch = fieldMatch.match(/(\w+):/);
                const typeMatch = fieldMatch.match(/type:\s*(\w+)/);
                const requiredMatch = fieldMatch.match(/required:\s*(true|false)/);
                const uniqueMatch = fieldMatch.match(/unique:\s*(true|false)/);
                const defaultMatch = fieldMatch.match(/default:\s*(['"].*?['"]|\d+|true|false)/);
                if (nameMatch && typeMatch) {
                    fields.push({
                        name: nameMatch[1],
                        type: typeMatch[1],
                        required: requiredMatch ? requiredMatch[1] === 'true' : false,
                        unique: uniqueMatch ? uniqueMatch[1] === 'true' : false,
                        default: defaultMatch ? defaultMatch[1].replace(/['"]/g, '') : undefined
                    });
                }
            });
        }
    }
    return { fields, hasSchema: true };
};
// Helper function to check if CRUD operations exist
const checkCRUDExists = async (modelName) => {
    const camelName = toCamelCase(modelName);
    const controllerPath = path.join(process.cwd(), 'src', 'controllers', `${camelName}Controller.ts`);
    const servicePath = path.join(process.cwd(), 'src', 'services', `${camelName}Service.ts`);
    const routePath = path.join(process.cwd(), 'src', 'routes', `${camelName}.ts`);
    const [controller, service, routes] = await Promise.all([
        fs.pathExists(controllerPath),
        fs.pathExists(servicePath),
        fs.pathExists(routePath)
    ]);
    return { controller, service, routes };
};
// Helper function to create commented backup with new code
const createBackupWithNewCode = (existingCode, newCode, fileType) => {
    const timestamp = new Date().toISOString();
    const commentedOldCode = existingCode
        .split('\n')
        .map(line => `// ${line}`)
        .join('\n');
    return `/*
====================================
PREVIOUS ${fileType.toUpperCase()} CODE (BACKUP)
====================================
Updated on: ${timestamp}
Reason: Model schema changed - fields added/removed
Note: You can safely remove this commented section after reviewing
====================================
*/
${commentedOldCode}

/*
====================================
NEW ${fileType.toUpperCase()} CODE (AUTO-GENERATED)
====================================
Generated on: ${timestamp}
Note: This code was auto-generated based on updated model schema
====================================
*/
${newCode}`;
};
// Helper function to read existing schemas
const readExistingSchemas = async (projectPath) => {
    const schemasPath = path.join(projectPath, 'src', 'schemas');
    if (!await fs.pathExists(schemasPath)) {
        return [];
    }
    const files = await fs.readdir(schemasPath);
    return files
        .filter(file => file.endsWith('.ts'))
        .map(file => file.replace('.ts', ''));
};
// Project templates as a constant object
const projectTemplates = {
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
// Generate TypeScript Model
const generateTypeScriptModel = (modelName, fields) => {
    const capitalizedName = capitalize(modelName);
    const fieldsCode = fields.map(field => {
        const options = [];
        if (field.required)
            options.push('required: true');
        if (field.unique)
            options.push('unique: true');
        if (field.default)
            options.push(`default: ${field.type === 'String' ? `'${field.default}'` : field.default}`);
        const optionsString = options.length > 0 ? `,  ${options.join(', ')} ` : '';
        return `  ${field.name}: { type: ${field.type}${optionsString} }`;
    }).join(',\n');
    return `import { Schema, model, Document, Types } from 'mongoose';

export interface I${capitalizedName} extends Document {
${fields.map(field => {
        const tsType = field.type === 'ObjectId' ? 'Types.ObjectId' :
            field.type === 'String' ? 'string' :
                field.type === 'Number' ? 'number' :
                    field.type === 'Boolean' ? 'boolean' :
                        field.type === 'Date' ? 'Date' :
                            field.type === 'Array' ? 'any[]' : 'any';
        return `  ${field.name}: ${tsType};`;
    }).join('\n')}
}

const ${capitalizedName}Schema = new Schema<I${capitalizedName}>({
${fieldsCode}
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export const ${capitalizedName} = model<I${capitalizedName}>('${capitalizedName}', ${capitalizedName}Schema);
export default ${capitalizedName};
`;
};
// Generate TypeScript Enum
const generateTypeScriptEnum = (enumName, enumType, values) => {
    const capitalizedName = capitalize(enumName);
    const enumValues = values.map(({ key, value }) => {
        if (enumType === 'string') {
            return `  ${key} = '${value}'`;
        }
        return `  ${key} = ${value}`;
    }).join(',\n');
    return `export enum ${capitalizedName} {
${enumValues}
}

export default ${capitalizedName};
`;
};
// Generate TypeScript Controller
const generateTypeScriptController = (controllerName) => {
    const capitalizedName = capitalize(controllerName);
    const camelCaseName = toCamelCase(controllerName);
    return `import { Request, Response, NextFunction } from 'express';
import { ApiResponse, PaginatedResponse, AuthenticatedRequest } from '../types/api';
import { AppError } from '../utils/AppError';

export class ${capitalizedName}Controller {
  /**
   * Get all ${controllerName}s with pagination
   * @route GET /api/${toKebabCase(controllerName)}
   */
  public async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // TODO: Implement actual data fetching logic
      const data = []; // Replace with actual data fetching
      const total = 0; // Replace with actual count

      const response: PaginatedResponse = {
        success: true,
        message: '${capitalizedName}s retrieved successfully',
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error fetching ${controllerName}s\`, 500));
    }
  }

  /**
   * Get single ${controllerName} by ID
   * @route GET /api/${toKebabCase(controllerName)}/:id
   */
  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Implement actual data fetching logic
      const data = null; // Replace with actual data fetching

      if (!data) {
        return next(new AppError('${capitalizedName} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} retrieved successfully',
        data
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error fetching ${controllerName}\`, 500));
    }
  }

  /**
   * Create new ${controllerName}
   * @route POST /api/${toKebabCase(controllerName)}
   */
  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { body } = req;

      // TODO: Implement validation and creation logic
      const data = body; // Replace with actual creation logic

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} created successfully',
        data
      };

      res.status(201).json(response);
    } catch (error) {
      next(new AppError(\`Error creating ${controllerName}\`, 400));
    }
  }

  /**
   * Update ${controllerName} by ID
   * @route PUT /api/${toKebabCase(controllerName)}/:id
   */
  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { body } = req;

      // TODO: Implement actual update logic
      const data = body; // Replace with actual update logic

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} updated successfully',
        data
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error updating ${controllerName}\`, 400));
    }
  }

  /**
   * Delete ${controllerName} by ID
   * @route DELETE /api/${toKebabCase(controllerName)}/:id
   */
  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Implement actual deletion logic

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error deleting ${controllerName}\`, 400));
    }
  }
}

export default new ${capitalizedName}Controller();
`;
};
// Generate TypeScript Service
const generateTypeScriptService = (serviceName) => {
    const capitalizedName = capitalize(serviceName);
    return `import { AppError } from '../utils/AppError';

export class ${capitalizedName}Service {
  /**
   * Service method example
   * @param data - Input data
   * @returns Promise<any>
   */
  public async performOperation(data: any): Promise<any> {
    try {
      // TODO: Implement service logic here
      return data;
    } catch (error) {
      throw new AppError(\`${capitalizedName} service error: \${error}\`, 500);
    }
  }

  /**
   * Validation method example
   * @param data - Data to validate
   * @returns boolean
   */
  public validateData(data: any): boolean {
    // TODO: Implement validation logic
    return data !== null && data !== undefined;
  }

  /**
   * Process data method example
   * @param rawData - Raw data to process
   * @returns Processed data
   */
  public processData(rawData: any): any {
    // TODO: Implement data processing logic
    return rawData;
  }
}

export default new ${capitalizedName}Service();
`;
};
// Generate TypeScript Middleware
const generateTypeScriptMiddleware = (middlewareName) => {
    const camelCaseName = toCamelCase(middlewareName);
    return `import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * ${capitalize(middlewareName)} middleware
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const ${camelCaseName} = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // TODO: Implement middleware logic here
    console.log(\`${capitalize(middlewareName)} middleware executed for \${req.method} \${req.path}\`);
    
    // Example: Check some condition
    const isValid = true; // Replace with actual validation logic
    
    if (!isValid) {
      return next(new AppError('${capitalize(middlewareName)} validation failed', 400));
    }
    
    next();
  } catch (error) {
    next(new AppError(\`${capitalize(middlewareName)} middleware error\`, 500));
  }
};

export default ${camelCaseName};
`;
};
// Generate CRUD Controller
const generateCRUDController = (modelName, fields) => {
    const capitalizedName = capitalize(modelName);
    const camelCaseName = toCamelCase(modelName);
    return `import { Request, Response, NextFunction } from 'express';
import { ApiResponse, PaginatedResponse, AuthenticatedRequest } from '../types/api';
import { AppError } from '../utils/AppError';
import ${capitalizedName}Service from '../services/${camelCaseName}Service';

export class ${capitalizedName}Controller {
  /**
   * Get all ${capitalizedName}s with pagination
   * @route GET /api/${camelCaseName}
   */
  public async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || parseInt(process.env.DEFAULT_PAGE_LIMIT || '10');
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

      const result = await ${capitalizedName}Service.getAll({
        page,
        limit,
        search,
        sortBy,
        sortOrder
      });

      const response: PaginatedResponse = {
        success: true,
        message: '${capitalizedName}s retrieved successfully',
        data: result.data,
        pagination: result.pagination
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error fetching ${capitalizedName}s\`, 500));
    }
  }

  /**
   * Get single ${capitalizedName} by ID
   * @route GET /api/${camelCaseName}/:id
   */
  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const ${camelCaseName} = await ${capitalizedName}Service.getById(id);

      if (!${camelCaseName}) {
        return next(new AppError('${capitalizedName} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} retrieved successfully',
        data: ${camelCaseName}
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error fetching ${capitalizedName}\`, 500));
    }
  }

  /**
   * Create new ${capitalizedName}
   * @route POST /api/${camelCaseName}
   */
  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ${camelCaseName} = await ${capitalizedName}Service.create(req.body);

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} created successfully',
        data: ${camelCaseName}
      };

      res.status(201).json(response);
    } catch (error) {
      next(new AppError(\`Error creating ${capitalizedName}\`, 400));
    }
  }

  /**
   * Update ${capitalizedName} by ID
   * @route PUT /api/${camelCaseName}/:id
   */
  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const ${camelCaseName} = await ${capitalizedName}Service.update(id, req.body);

      if (!${camelCaseName}) {
        return next(new AppError('${capitalizedName} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} updated successfully',
        data: ${camelCaseName}
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error updating ${capitalizedName}\`, 400));
    }
  }

  /**
   * Delete ${capitalizedName} by ID
   * @route DELETE /api/${camelCaseName}/:id
   */
  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await ${capitalizedName}Service.delete(id);

      if (!deleted) {
        return next(new AppError('${capitalizedName} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '${capitalizedName} deleted successfully',
        data: null
      };

      res.status(200).json(response);
    } catch (error) {
      next(new AppError(\`Error deleting ${capitalizedName}\`, 500));
    }
  }
}

export default new ${capitalizedName}Controller();`;
};
// Generate CRUD Service
const generateCRUDService = (modelName, fields) => {
    const capitalizedName = capitalize(modelName);
    const camelCaseName = toCamelCase(modelName);
    return `import { AppError } from '../utils/AppError';
import ${capitalizedName} from '../models/${capitalizedName}';
import { PaginationResult, QueryOptions } from '../types/api';

export class ${capitalizedName}Service {
  /**
   * Get all ${capitalizedName}s with pagination and search
   */
  public async getAll(options: QueryOptions): Promise<{ data: any[]; pagination: PaginationResult }> {
    try {
      const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;

      // Build search query
      let query: any = {};
      if (search) {
        const searchFields = [${fields.filter(f => f.type === 'String').map(f => `'${f.name}'`).join(', ')}];
        if (searchFields.length > 0) {
          query.$or = searchFields.map(field => ({
            [field]: { $regex: search, $options: 'i' }
          }));
        }
      }

      // Execute queries
      const [data, total] = await Promise.all([
        ${capitalizedName}.find(query)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ${capitalizedName}.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new AppError(\`Error fetching ${capitalizedName}s: \${error}\`, 500);
    }
  }

  /**
   * Get ${capitalizedName} by ID
   */
  public async getById(id: string): Promise<any> {
    try {
      const ${camelCaseName} = await ${capitalizedName}.findById(id).lean();
      return ${camelCaseName};
    } catch (error) {
      throw new AppError(\`Error fetching ${capitalizedName}: \${error}\`, 500);
    }
  }

  /**
   * Create new ${capitalizedName}
   */
  public async create(data: any): Promise<any> {
    try {
      const ${camelCaseName} = new ${capitalizedName}(data);
      await ${camelCaseName}.save();
      return ${camelCaseName}.toObject();
    } catch (error) {
      throw new AppError(\`Error creating ${capitalizedName}: \${error}\`, 400);
    }
  }

  /**
   * Update ${capitalizedName} by ID
   */
  public async update(id: string, data: any): Promise<any> {
    try {
      const ${camelCaseName} = await ${capitalizedName}.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).lean();
      return ${camelCaseName};
    } catch (error) {
      throw new AppError(\`Error updating ${capitalizedName}: \${error}\`, 400);
    }
  }

  /**
   * Delete ${capitalizedName} by ID
   */
  public async delete(id: string): Promise<boolean> {
    try {
      const result = await ${capitalizedName}.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      throw new AppError(\`Error deleting ${capitalizedName}: \${error}\`, 500);
    }
  }
}

export default new ${capitalizedName}Service();`;
};
// Generate CRUD Routes
const generateCRUDRoutes = (modelName, fields = [], withTasks = false) => {
    const capitalizedName = capitalize(modelName);
    const camelCaseName = toCamelCase(modelName);
    const upperSnakeName = toUpperSnakeCase(modelName);
    const hasValidation = fields.length > 0;
    const validationImport = hasValidation
        ? `\nimport { validate } from '../middleware/validation';\nimport { create${capitalizedName}Schema, update${capitalizedName}Schema } from '../validators/${camelCaseName}';`
        : '';
    const permissionImport = withTasks
        ? `\nimport { checkPermission } from '../middleware/checkPermission';\nimport { Task } from '../enums/Task';`
        : '';
    // Permission middleware snippets for each route
    const viewPerm = withTasks ? `checkPermission(Task.VIEW_${upperSnakeName}), ` : '';
    const createPerm = withTasks ? `checkPermission(Task.CREATE_${upperSnakeName}), ` : '';
    const updatePerm = withTasks ? `checkPermission(Task.UPDATE_${upperSnakeName}), ` : '';
    const deletePerm = withTasks ? `checkPermission(Task.DELETE_${upperSnakeName}), ` : '';
    return `import { Router } from 'express';
import ${camelCaseName}Controller from '../controllers/${camelCaseName}Controller';
import { auth } from '../middleware/auth';${validationImport}${permissionImport}

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ${capitalizedName}:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the ${camelCaseName}
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * /api/${camelCaseName}:
 *   get:
 *     summary: Get all ${camelCaseName}s with pagination
 *     tags: [${capitalizedName}]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of ${camelCaseName}s
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/', auth, ${viewPerm}${camelCaseName}Controller.getAll);

/**
 * @swagger
 * /api/${camelCaseName}/{id}:
 *   get:
 *     summary: Get ${camelCaseName} by ID
 *     tags: [${capitalizedName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ${capitalizedName} ID
 *     responses:
 *       200:
 *         description: ${capitalizedName} details
 *       404:
 *         description: ${capitalizedName} not found
 */
router.get('/:id', auth, ${viewPerm}${camelCaseName}Controller.getById);

/**
 * @swagger
 * /api/${camelCaseName}:
 *   post:
 *     summary: Create new ${camelCaseName}
 *     tags: [${capitalizedName}]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/${capitalizedName}'
 *     responses:
 *       201:
 *         description: ${capitalizedName} created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth, ${createPerm}${hasValidation ? `validate(create${capitalizedName}Schema), ` : ''}${camelCaseName}Controller.create);

/**
 * @swagger
 * /api/${camelCaseName}/{id}:
 *   put:
 *     summary: Update ${camelCaseName} by ID
 *     tags: [${capitalizedName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ${capitalizedName} ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/${capitalizedName}'
 *     responses:
 *       200:
 *         description: ${capitalizedName} updated successfully
 *       404:
 *         description: ${capitalizedName} not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', auth, ${updatePerm}${hasValidation ? `validate(update${capitalizedName}Schema), ` : ''}${camelCaseName}Controller.update);

/**
 * @swagger
 * /api/${camelCaseName}/{id}:
 *   delete:
 *     summary: Delete ${camelCaseName} by ID
 *     tags: [${capitalizedName}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ${capitalizedName} ID
 *     responses:
 *       200:
 *         description: ${capitalizedName} deleted successfully
 *       404:
 *         description: ${capitalizedName} not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', auth, ${deletePerm}${camelCaseName}Controller.delete);

export default router;`;
};
// Generate Joi validation schema for a model
const generateJoiValidation = (modelName, fields) => {
    const capitalizedName = capitalize(modelName);
    const joiFields = fields.map(field => {
        let joiType = 'Joi.string()';
        switch (field.type) {
            case 'String':
                joiType = 'Joi.string()';
                break;
            case 'Number':
                joiType = 'Joi.number()';
                break;
            case 'Boolean':
                joiType = 'Joi.boolean()';
                break;
            case 'Date':
                joiType = 'Joi.date()';
                break;
            case 'Array':
                joiType = 'Joi.array()';
                break;
            case 'ObjectId':
                joiType = 'Joi.string()';
                break;
            default:
                joiType = 'Joi.any()';
                break;
        }
        const chain = [joiType];
        if (field.required)
            chain.push('.required()');
        else
            chain.push('.optional()');
        return `  ${field.name}: ${chain.join('')}`;
    }).join(',\n');
    return `import Joi from 'joi';

export const create${capitalizedName}Schema = Joi.object({
${joiFields}
});

export const update${capitalizedName}Schema = Joi.object({
${fields.map(field => {
        let joiType = 'Joi.string()';
        switch (field.type) {
            case 'String':
                joiType = 'Joi.string()';
                break;
            case 'Number':
                joiType = 'Joi.number()';
                break;
            case 'Boolean':
                joiType = 'Joi.boolean()';
                break;
            case 'Date':
                joiType = 'Joi.date()';
                break;
            case 'Array':
                joiType = 'Joi.array()';
                break;
            case 'ObjectId':
                joiType = 'Joi.string()';
                break;
            default:
                joiType = 'Joi.any()';
                break;
        }
        return `  ${field.name}: ${joiType}.optional()`;
    }).join(',\n')}
}).min(1);
`;
};
// Update main routes to register new route
/**
 * Append an export line to an index.ts barrel file.
 * Creates the index.ts if it doesn't exist yet.
 * Skips silently if the export line is already present.
 *
 * @param dirPath  – absolute path to the directory (e.g. src/models)
 * @param exportLine – the full export statement to add
 */
const updateIndexExport = async (dirPath, exportLine) => {
    const indexPath = path.join(dirPath, 'index.ts');
    try {
        let content = '';
        if (await fs.pathExists(indexPath)) {
            content = await fs.readFile(indexPath, 'utf-8');
        }
        // Already exported
        if (content.includes(exportLine))
            return;
        // Append with a newline
        const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
        await fs.writeFile(indexPath, content + separator + exportLine + '\n');
    }
    catch {
        // Non-fatal – the index file is a convenience, not a requirement
    }
};
const updateMainRoutes = async (modelName) => {
    const camelCaseName = toCamelCase(modelName);
    const routesIndexPath = path.join(process.cwd(), 'src', 'routes', 'index.ts');
    try {
        const currentContent = await fs.readFile(routesIndexPath, 'utf-8');
        // Add import statement
        const importStatement = `import ${camelCaseName}Routes from './${camelCaseName}';`;
        const routeUsage = `router.use('/${camelCaseName}', ${camelCaseName}Routes);`;
        // Check if already exists
        if (currentContent.includes(importStatement)) {
            return;
        }
        // Find the last import statement and add after it
        const lines = currentContent.split('\n');
        let lastImportIndex = -1;
        let routerUseIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import') && lines[i].includes('from')) {
                lastImportIndex = i;
            }
            if (lines[i].includes('router.use') && lines[i].includes('Routes')) {
                routerUseIndex = i;
            }
        }
        // Insert import after last import
        if (lastImportIndex >= 0) {
            lines.splice(lastImportIndex + 1, 0, importStatement);
        }
        // Insert route usage after last router.use
        if (routerUseIndex >= 0) {
            lines.splice(routerUseIndex + 1, 0, routeUsage);
        }
        const updatedContent = lines.join('\n');
        await fs.writeFile(routesIndexPath, updatedContent);
    }
    catch (error) {
        console.log(colors.yellow('⚠️  Could not update routes/index.ts automatically'));
        console.log(colors.dim(`   Please add: router.use('/${camelCaseName}', ${camelCaseName}Routes);`));
    }
};
// Generate essential TypeScript files
const generateEssentialFiles = async (projectPath, projectName) => {
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
    await fs.writeFile(path.join(srcPath, 'routes', 'index.ts'), indexRouteContent);
    await fs.writeFile(path.join(srcPath, 'routes', 'auth.ts'), authRouteContent);
    console.log(colors.green('✅ Created file: src/routes/index.ts'));
    console.log(colors.green('✅ Created file: src/routes/auth.ts'));
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
    }
    else {
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
// Generate TypeScript server template
const generateServerTemplate = (projectName) => {
    return `import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './config/swagger';

// Import routes
import indexRoutes from './routes/index';
import authRoutes from './routes/auth';

dotenv.config();

// Read version from package.json
const getAppVersion = (): string => {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
};

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '8000');

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Setup Swagger documentation
setupSwagger(app);

// Routes
app.use('/api', indexRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: getAppVersion()
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(\`\\n\${signal} received. Shutting down gracefully...\`);
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
  }
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
  console.log(\`📱 Environment: \${process.env.NODE_ENV || 'development'}\`);
  console.log(\`📚 API Documentation: http://localhost:\${PORT}/api-docs\`);
});

export default app;
`;
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
    .action(async (modelName) => {
    try {
        console.log(colors.blue(`🏗️ Creating TypeScript model: ${capitalize(modelName)}`));
        const rl = createReadlineInterface();
        const fields = [];
        console.log(colors.cyan('\n📝 Define your model fields:'));
        console.log(colors.dim('Available data types:'));
        console.log(colors.dim('1. String    2. Number    3. Date      4. Boolean'));
        console.log(colors.dim('5. ObjectId  6. Array     7. Mixed     8. JSON'));
        console.log(colors.dim('Type "done" when finished\n'));
        const dataTypes = ['String', 'Number', 'Date', 'Boolean', 'ObjectId', 'Array', 'Mixed', 'JSON'];
        let fieldName = '';
        while (fieldName !== 'done') {
            fieldName = await askQuestion(rl, colors.yellow('Field name (or "done" to finish): '));
            if (fieldName === 'done')
                break;
            if (!fieldName.trim())
                continue;
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
                type: fieldType,
                required: isRequired,
                unique: isUnique || undefined,
                indexed: isIndexed || undefined,
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
        // Generate TypeScript model file
        const modelContent = generateTypeScriptModel(modelName, fields);
        const modelPath = path.join(process.cwd(), 'src', 'models', `${capitalize(modelName)}.ts`);
        await fs.ensureDir(path.dirname(modelPath));
        await fs.writeFile(modelPath, modelContent);
        console.log(colors.green(`✅ Created TypeScript model: src/models/${capitalize(modelName)}.ts`));
        // Update models/index.ts
        const modelsDir = path.join(process.cwd(), 'src', 'models');
        await updateIndexExport(modelsDir, `export { default as ${capitalize(modelName)}, I${capitalize(modelName)} } from './${capitalize(modelName)}';`);
        console.log(colors.green(`✅ Updated export in src/models/index.ts`));
        if (generateCRUD) {
            const crudCamelName = toCamelCase(modelName);
            const upperSnakeName = toUpperSnakeCase(modelName);
            // Add CRUD tasks to Task enum if requested
            if (withTasks) {
                const taskEntries = [
                    { key: `VIEW_${upperSnakeName}`, desc: `View the list of ${toCamelCase(modelName)}s and ${toCamelCase(modelName)} details` },
                    { key: `CREATE_${upperSnakeName}`, desc: `Create new ${toCamelCase(modelName)} records` },
                    { key: `UPDATE_${upperSnakeName}`, desc: `Update existing ${toCamelCase(modelName)} records` },
                    { key: `DELETE_${upperSnakeName}`, desc: `Delete ${toCamelCase(modelName)} records` },
                ];
                let tasksAdded = 0;
                for (const entry of taskEntries) {
                    const added = await addTaskToEnum(entry.key, entry.desc);
                    if (added)
                        tasksAdded++;
                }
                if (tasksAdded > 0) {
                    console.log(colors.green(`✅ Added ${tasksAdded} CRUD tasks to src/enums/Task.ts`));
                    console.log(colors.dim(`   VIEW_${upperSnakeName}, CREATE_${upperSnakeName}, UPDATE_${upperSnakeName}, DELETE_${upperSnakeName}`));
                }
                else {
                    console.log(colors.yellow(`⚠️  Could not add tasks (Task.ts not found or tasks already exist)`));
                    withTasks = false; // Disable permission middleware in routes since tasks weren't added
                }
            }
            // Generate CRUD Controller
            const controllerContent = generateCRUDController(modelName, fields);
            const controllerPath = path.join(process.cwd(), 'src', 'controllers', `${crudCamelName}Controller.ts`);
            await fs.ensureDir(path.dirname(controllerPath));
            await fs.writeFile(controllerPath, controllerContent);
            console.log(colors.green(`✅ Created TypeScript controller: src/controllers/${crudCamelName}Controller.ts`));
            // Update controllers/index.ts
            const controllersDir = path.join(process.cwd(), 'src', 'controllers');
            await updateIndexExport(controllersDir, `export { default as ${crudCamelName}Controller } from './${crudCamelName}Controller';`);
            // Generate CRUD Service
            const serviceContent = generateCRUDService(modelName, fields);
            const servicePath = path.join(process.cwd(), 'src', 'services', `${crudCamelName}Service.ts`);
            await fs.ensureDir(path.dirname(servicePath));
            await fs.writeFile(servicePath, serviceContent);
            console.log(colors.green(`✅ Created TypeScript service: src/services/${crudCamelName}Service.ts`));
            // Update services/index.ts
            const servicesDir = path.join(process.cwd(), 'src', 'services');
            await updateIndexExport(servicesDir, `export * from './${crudCamelName}Service';`);
            // Generate Joi validation schema
            const validationContent = generateJoiValidation(modelName, fields);
            const validationPath = path.join(process.cwd(), 'src', 'validators', `${crudCamelName}.ts`);
            await fs.ensureDir(path.dirname(validationPath));
            await fs.writeFile(validationPath, validationContent);
            console.log(colors.green(`✅ Created Joi validation: src/validators/${crudCamelName}.ts`));
            // Generate CRUD Routes (with validation and optional permission checks)
            const routeContent = generateCRUDRoutes(modelName, fields, withTasks);
            const routePath = path.join(process.cwd(), 'src', 'routes', `${crudCamelName}.ts`);
            await fs.ensureDir(path.dirname(routePath));
            await fs.writeFile(routePath, routeContent);
            console.log(colors.green(`✅ Created TypeScript routes: src/routes/${crudCamelName}.ts`));
            // Update main routes/index.ts to register the new route
            await updateMainRoutes(modelName);
            console.log(colors.green(`✅ Registered route in src/routes/index.ts`));
            console.log(colors.cyan('\n📚 Generated CRUD system includes:'));
            console.log('   • Model with Mongoose schema and TypeScript types');
            console.log('   • Controller with full CRUD operations (GET, POST, PUT, DELETE)');
            console.log('   • Service layer with business logic and pagination');
            console.log('   • Routes with Swagger documentation');
            console.log('   • Pagination support (configurable in .env - DEFAULT_PAGE_LIMIT)');
            console.log('   • Automatic route registration');
            if (withTasks) {
                console.log('   • CRUD tasks added to Task enum (VIEW, CREATE, UPDATE, DELETE)');
                console.log('   • Routes protected with checkPermission middleware');
            }
            console.log(colors.yellow('\n🔧 Next steps:'));
            console.log('   • Update .env file with DEFAULT_PAGE_LIMIT (default: 10)');
            if (withTasks) {
                console.log('   • Assign the new tasks to roles via your admin panel or seed script');
            }
            console.log('   • Run TypeScript compilation: npm run build');
            console.log('   • Test the CRUD endpoints in your API');
        }
        else {
            console.log(colors.cyan('\n📚 Model created successfully!'));
            console.log(colors.yellow('🔧 Next steps:'));
            console.log('   • Import the model in your controllers');
            console.log('   • Use "koti controller", "koti service" for CRUD operations');
            console.log('   • Run TypeScript compilation: npm run build');
        }
    }
    catch (error) {
        console.error(colors.red('❌ Error creating model:'), error.message);
        process.exit(1);
    }
});
// TypeScript Enum Generation Command
program
    .command('enum')
    .argument('<enum-name>', 'Name of the enum to create')
    .description('Create a new TypeScript enum')
    .action(async (enumName) => {
    try {
        console.log(colors.blue(`📋 Creating TypeScript enum: ${capitalize(enumName)}`));
        const rl = createReadlineInterface();
        const enumType = await askQuestion(rl, colors.yellow('Enum type (string/number): '));
        if (!enumTypes.includes(enumType)) {
            console.log(colors.red('❌ Invalid enum type. Use "string" or "number"'));
            rl.close();
            return;
        }
        const values = [];
        console.log(colors.cyan('\n📝 Define your enum values:'));
        console.log(colors.dim('Type "done" when finished\n'));
        let key = '';
        while (key !== 'done') {
            key = await askQuestion(rl, colors.yellow('Enum key (or "done" to finish): '));
            if (key === 'done')
                break;
            if (!key.trim())
                continue;
            let value;
            if (enumType === 'string') {
                value = await askQuestion(rl, colors.yellow(`String value for ${key}: `));
            }
            else {
                const numValue = await askQuestion(rl, colors.yellow(`Number value for ${key}: `));
                value = parseInt(numValue);
            }
            values.push({ key: key.toUpperCase(), value });
            console.log(colors.green(`✅ Added: ${key.toUpperCase()} = ${value}`));
        }
        rl.close();
        // Generate TypeScript enum file
        const enumContent = generateTypeScriptEnum(enumName, enumType, values);
        const enumPath = path.join(process.cwd(), 'src', 'enums', `${capitalize(enumName)}.ts`);
        await fs.ensureDir(path.dirname(enumPath));
        await fs.writeFile(enumPath, enumContent);
        console.log(colors.green(`✅ Created TypeScript enum: src/enums/${capitalize(enumName)}.ts`));
        // Update enums/index.ts
        const enumsDir = path.join(process.cwd(), 'src', 'enums');
        await updateIndexExport(enumsDir, `export { ${capitalize(enumName)} } from './${capitalize(enumName)}';`);
        console.log(colors.green(`✅ Updated export in src/enums/index.ts`));
    }
    catch (error) {
        console.error(colors.red('❌ Error creating enum:'), error.message);
        process.exit(1);
    }
});
// TypeScript Controller Generation Command
program
    .command('controller')
    .argument('<controller-name>', 'Name of the controller to create')
    .description('Create a new TypeScript controller')
    .action(async (controllerName) => {
    try {
        console.log(colors.blue(`🎮 Creating TypeScript controller: ${capitalize(controllerName)}`));
        const controllerContent = generateTypeScriptController(controllerName);
        const controllerPath = path.join(process.cwd(), 'src', 'controllers', `${toCamelCase(controllerName)}Controller.ts`);
        await fs.ensureDir(path.dirname(controllerPath));
        await fs.writeFile(controllerPath, controllerContent);
        console.log(colors.green(`✅ Created TypeScript controller: src/controllers/${toCamelCase(controllerName)}Controller.ts`));
        // Update controllers/index.ts
        const controllersDir = path.join(process.cwd(), 'src', 'controllers');
        await updateIndexExport(controllersDir, `export { default as ${toCamelCase(controllerName)}Controller } from './${toCamelCase(controllerName)}Controller';`);
        console.log(colors.green(`✅ Updated export in src/controllers/index.ts`));
    }
    catch (error) {
        console.error(colors.red('❌ Error creating controller:'), error.message);
        process.exit(1);
    }
});
// TypeScript Service Generation Command
program
    .command('service')
    .argument('<service-name>', 'Name of the service to create')
    .description('Create a new TypeScript service')
    .action(async (serviceName) => {
    try {
        console.log(colors.blue(`⚙️ Creating TypeScript service: ${capitalize(serviceName)}`));
        const serviceContent = generateTypeScriptService(serviceName);
        const servicePath = path.join(process.cwd(), 'src', 'services', `${toCamelCase(serviceName)}Service.ts`);
        await fs.ensureDir(path.dirname(servicePath));
        await fs.writeFile(servicePath, serviceContent);
        console.log(colors.green(`✅ Created TypeScript service: src/services/${toCamelCase(serviceName)}Service.ts`));
        // Update services/index.ts
        const servicesDir = path.join(process.cwd(), 'src', 'services');
        await updateIndexExport(servicesDir, `export * from './${toCamelCase(serviceName)}Service';`);
        console.log(colors.green(`✅ Updated export in src/services/index.ts`));
    }
    catch (error) {
        console.error(colors.red('❌ Error creating service:'), error.message);
        process.exit(1);
    }
});
// TypeScript Middleware Generation Command
program
    .command('middleware')
    .argument('<middleware-name>', 'Name of the middleware to create')
    .description('Create a new TypeScript middleware')
    .action(async (middlewareName) => {
    try {
        console.log(colors.blue(`🛡️ Creating TypeScript middleware: ${toCamelCase(middlewareName)}`));
        const middlewareContent = generateTypeScriptMiddleware(middlewareName);
        const middlewarePath = path.join(process.cwd(), 'src', 'middleware', `${toCamelCase(middlewareName)}.ts`);
        await fs.ensureDir(path.dirname(middlewarePath));
        await fs.writeFile(middlewarePath, middlewareContent);
        console.log(colors.green(`✅ Created TypeScript middleware: src/middleware/${toCamelCase(middlewareName)}.ts`));
        // Update middleware/index.ts
        const middlewareDir = path.join(process.cwd(), 'src', 'middleware');
        await updateIndexExport(middlewareDir, `export { ${toCamelCase(middlewareName)} } from './${toCamelCase(middlewareName)}';`);
        console.log(colors.green(`✅ Updated export in src/middleware/index.ts`));
    }
    catch (error) {
        console.error(colors.red('❌ Error creating middleware:'), error.message);
        process.exit(1);
    }
});
program
    .command('new')
    .alias('create')
    .argument('<project-name>', 'Name of the project to create')
    .description('Create a new TypeScript Bun API project')
    .action(async (projectName) => {
    try {
        console.log(colors.blue(`🚀 Creating TypeScript Bun API project: ${projectName}`));
        const projectPath = path.join(process.cwd(), projectName);
        console.log(colors.dim(`📁 Project directory: ${projectPath}`));
        // Create project directory
        await fs.ensureDir(projectPath);
        // Get template path
        const templatePath = path.join(__dirname, '..', 'templates');
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
        // Copy the entire src directory structure
        if (await fs.pathExists(templateSrcPath)) {
            await fs.copy(templateSrcPath, projectSrcPath);
            // Replace {{PROJECT_NAME}} in all copied .ts files
            const replaceInDir = async (dirPath) => {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);
                    if (entry.isDirectory()) {
                        await replaceInDir(fullPath);
                    }
                    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.json')) {
                        let content = await fs.readFile(fullPath, 'utf-8');
                        if (content.includes('{{PROJECT_NAME}}')) {
                            content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
                            await fs.writeFile(fullPath, content);
                        }
                    }
                }
            };
            await replaceInDir(projectSrcPath);
            console.log(colors.green('✅ Copied TypeScript source files'));
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
        // Generate additional necessary files
        await generateEssentialFiles(projectPath, projectName);
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
        }
        catch (error) {
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
            }
            catch (npmError) {
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
    }
    catch (error) {
        console.error(colors.red('❌ Error creating project:'), error.message);
        process.exit(1);
    }
});
// Model Edit Command
program
    .command('model:edit')
    .argument('<model-name>', 'Name of the model to edit')
    .description('Edit an existing TypeScript model (add/delete fields)')
    .action(async (modelName) => {
    try {
        console.log(colors.blue(`✏️ Editing TypeScript model: ${capitalize(modelName)}`));
        // Check if model exists
        const { fields: existingFields, hasSchema } = await parseExistingModel(modelName);
        if (!hasSchema) {
            console.log(colors.red(`❌ Model ${capitalize(modelName)} not found!`));
            console.log(colors.yellow('💡 Use "koti model <name>" to create a new model'));
            return;
        }
        // Check if CRUD operations exist
        const crudExists = await checkCRUDExists(modelName);
        const hasCRUD = crudExists.controller || crudExists.service || crudExists.routes;
        console.log(colors.green(`✅ Found model: ${capitalize(modelName)}`));
        console.log(colors.dim(`   Fields: ${existingFields.map(f => f.name).join(', ')}`));
        if (hasCRUD) {
            console.log(colors.cyan('🔧 CRUD operations detected:'));
            if (crudExists.controller)
                console.log(colors.dim('   • Controller'));
            if (crudExists.service)
                console.log(colors.dim('   • Service'));
            if (crudExists.routes)
                console.log(colors.dim('   • Routes'));
        }
        const rl = createReadlineInterface();
        let updatedFields = [...existingFields];
        while (true) {
            console.log(colors.cyan('\n📝 Current fields:'));
            updatedFields.forEach((field, index) => {
                const attrs = [];
                if (field.required)
                    attrs.push('required');
                if (field.unique)
                    attrs.push('unique');
                if (field.default)
                    attrs.push(`default: ${field.default}`);
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
                updatedFields.push({
                    name: fieldName,
                    type: fieldType,
                    required: isRequired,
                    unique: isUnique || undefined,
                    indexed: isIndexed || undefined,
                    default: defaultValue || undefined
                });
                console.log(colors.green(`✅ Added field: ${fieldName} (${fieldType})`));
            }
            else if (action === '2') {
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
                if (!deleteChoice.trim())
                    continue;
                const deleteIndex = parseInt(deleteChoice) - 1;
                if (deleteIndex >= 0 && deleteIndex < updatedFields.length) {
                    const deletedField = updatedFields.splice(deleteIndex, 1)[0];
                    console.log(colors.green(`✅ Deleted field: ${deletedField.name}`));
                }
                else {
                    console.log(colors.red('❌ Invalid field number'));
                }
            }
            else if (action === '3') {
                // Save changes
                const hasChanges = JSON.stringify(existingFields) !== JSON.stringify(updatedFields);
                if (!hasChanges) {
                    console.log(colors.yellow('ℹ️ No changes detected'));
                    break;
                }
                console.log(colors.cyan('\n💾 Saving changes...'));
                // Regenerate model file
                const modelContent = generateTypeScriptModel(modelName, updatedFields);
                const modelPath = path.join(process.cwd(), 'src', 'models', `${capitalize(modelName)}.ts`);
                await fs.writeFile(modelPath, modelContent);
                console.log(colors.green(`✅ Updated model: src/models/${capitalize(modelName)}.ts`));
                // Ask about updating CRUD operations
                let updateCRUD = false;
                if (hasCRUD) {
                    console.log(colors.cyan('\n🔄 CRUD operations detected'));
                    updateCRUD = (await askQuestion(rl, colors.yellow('Update CRUD operations with new schema? (y/n): '))).toLowerCase() === 'y';
                    if (updateCRUD) {
                        console.log(colors.blue('🔄 Updating CRUD operations...'));
                        const editCamelName = toCamelCase(modelName);
                        // Regenerate controller if exists
                        if (crudExists.controller) {
                            const controllerPath = path.join(process.cwd(), 'src', 'controllers', `${editCamelName}Controller.ts`);
                            const existingController = await fs.readFile(controllerPath, 'utf-8');
                            const newControllerContent = generateCRUDController(modelName, updatedFields);
                            // Save backup to .bak file, then do a clean replacement
                            await fs.writeFile(controllerPath + '.bak', existingController);
                            await fs.writeFile(controllerPath, newControllerContent);
                            console.log(colors.green(`✅ Updated controller: src/controllers/${editCamelName}Controller.ts`));
                            console.log(colors.dim(`   Backup saved: src/controllers/${editCamelName}Controller.ts.bak`));
                        }
                        // Regenerate service if exists
                        if (crudExists.service) {
                            const servicePath = path.join(process.cwd(), 'src', 'services', `${editCamelName}Service.ts`);
                            const existingService = await fs.readFile(servicePath, 'utf-8');
                            const newServiceContent = generateCRUDService(modelName, updatedFields);
                            await fs.writeFile(servicePath + '.bak', existingService);
                            await fs.writeFile(servicePath, newServiceContent);
                            console.log(colors.green(`✅ Updated service: src/services/${editCamelName}Service.ts`));
                            console.log(colors.dim(`   Backup saved: src/services/${editCamelName}Service.ts.bak`));
                        }
                        // Regenerate routes if exists
                        if (crudExists.routes) {
                            const routePath = path.join(process.cwd(), 'src', 'routes', `${editCamelName}.ts`);
                            const existingRoutes = await fs.readFile(routePath, 'utf-8');
                            const newRouteContent = generateCRUDRoutes(modelName, updatedFields);
                            await fs.writeFile(routePath + '.bak', existingRoutes);
                            await fs.writeFile(routePath, newRouteContent);
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
                }
                console.log(colors.cyan('\n🎉 Model edit completed successfully!'));
                console.log(colors.yellow('\n🔧 Next steps:'));
                console.log('   • Run TypeScript compilation: npm run build');
                console.log('   • Test your updated model and API endpoints');
                if (hasCRUD && !updateCRUD) {
                    console.log('   • Consider manually updating CRUD operations if needed');
                }
                break;
            }
            else if (action === '4') {
                // Cancel
                console.log(colors.yellow('✖️ Edit cancelled'));
                break;
            }
            else {
                console.log(colors.red('❌ Invalid choice. Please select 1-4.'));
            }
        }
        rl.close();
    }
    catch (error) {
        console.error(colors.red('❌ Error editing model:'), error.message);
        process.exit(1);
    }
});
// Task Creation Command — adds a new task to the Task enum
program
    .command('task')
    .argument('<task-name>', 'Name of the task to create (e.g., MANAGE_USERS)')
    .description('Add a new task to the Task enum for role-based authorization')
    .action(async (taskName) => {
    try {
        const taskKey = taskName.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        const taskValue = taskKey;
        const rl = createReadlineInterface();
        const description = await askQuestion(rl, colors.yellow('Task description: '));
        rl.close();
        if (!description.trim()) {
            console.log(colors.red('❌ Description is required'));
            return;
        }
        const enumPath = path.join(process.cwd(), 'src', 'enums', 'Task.ts');
        if (!await fs.pathExists(enumPath)) {
            console.log(colors.red('❌ Task enum not found at src/enums/Task.ts'));
            console.log(colors.yellow('💡 Create a new project with "koti new" to get the Task enum'));
            return;
        }
        let content = await fs.readFile(enumPath, 'utf-8');
        // Check if task already exists
        if (content.includes(`${taskKey} =`) || content.includes(`${taskKey}=`)) {
            console.log(colors.red(`❌ Task "${taskKey}" already exists in the enum`));
            return;
        }
        // Insert new entry before the closing brace of the Task enum
        // Match the last enum entry line and the closing brace
        const enumClosingMatch = content.match(/([ \t]*\w+\s*=\s*'[^']*',?\s*\n)(}\s*\n)/);
        if (!enumClosingMatch) {
            console.log(colors.red('❌ Could not parse Task enum. Please add the task manually.'));
            return;
        }
        const lastEntry = enumClosingMatch[1];
        const closingBrace = enumClosingMatch[2];
        // Make sure last existing entry has a trailing comma
        const lastEntryWithComma = lastEntry.trimEnd().endsWith(',')
            ? lastEntry
            : lastEntry.replace(/(\S)\s*$/, '$1,\n');
        const newEnumEntry = `  /** ${description} */\n  ${taskKey} = '${taskValue}',\n`;
        content = content.replace(lastEntry + closingBrace, lastEntryWithComma + newEnumEntry + closingBrace);
        // Insert new entry into TaskDescriptions before the closing brace
        const descClosingMatch = content.match(/([ \t]*\[Task\.\w+\]:\s*'[^']*',?\s*\n)(};\s*\n?)/);
        if (descClosingMatch) {
            const lastDescEntry = descClosingMatch[1];
            const descClosing = descClosingMatch[2];
            const lastDescWithComma = lastDescEntry.trimEnd().endsWith(',')
                ? lastDescEntry
                : lastDescEntry.replace(/(\S)\s*$/, '$1,\n');
            const newDescEntry = `  [Task.${taskKey}]: '${description.replace(/'/g, "\\'")}',\n`;
            content = content.replace(lastDescEntry + descClosing, lastDescWithComma + newDescEntry + descClosing);
        }
        await fs.writeFile(enumPath, content);
        console.log(colors.green(`✅ Added task: ${taskKey}`));
        console.log(colors.dim(`   Description: ${description}`));
        console.log(colors.dim(`   File: src/enums/Task.ts`));
        console.log(colors.cyan('\n💡 Usage in routes:'));
        console.log(colors.dim(`   import { checkPermission } from '../middleware/checkPermission';`));
        console.log(colors.dim(`   import { Task } from '../enums/Task';`));
        console.log(colors.dim(`   router.get('/endpoint', auth, checkPermission(Task.${taskKey}), handler);`));
    }
    catch (error) {
        console.error(colors.red('❌ Error adding task:'), error.message);
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=cli.js.map