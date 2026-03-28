#!/usr/bin/env node

/**
 * Koti CLI — MCP Server
 *
 * Exposes Koti CLI scaffolding capabilities as MCP tools so that
 * AI assistants (Claude Desktop, Claude Code, Cursor, etc.) can
 * create and manage Bun + Express + MongoDB TypeScript API projects
 * through natural language.
 *
 * Transport: stdio (spawned as a child process by the AI client)
 * SDK: @modelcontextprotocol/sdk
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------
const getVersion = (): string => {
  const candidates = [
    path.join(__dirname, '..', 'version.json'),
    path.join(__dirname, '..', 'package.json'),
  ];
  for (const c of candidates) {
    try {
      const data = JSON.parse(fs.readFileSync(c, 'utf8'));
      if (data.version) return data.version;
    } catch {}
  }
  return '0.0.0-unknown';
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run a koti CLI command and capture stdout */
const runKotiCommand = (
  args: string[],
  cwd?: string,
  input?: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  return new Promise((resolve) => {
    const kotiPath = path.join(__dirname, '..', 'dist', 'cli.js');
    const child = spawn('node', [kotiPath, ...args], {
      cwd: cwd || process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
};

/** Strip ANSI escape codes */
const stripAnsi = (text: string): string =>
  text.replace(/\x1b\[[0-9;]*m/g, '');

/** Walk a directory tree and return a file list */
const walkDir = async (dir: string, base?: string): Promise<string[]> => {
  const root = base || dir;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    if (entry.isDirectory()) {
      files = files.concat(await walkDir(full, root));
    } else {
      files.push(path.relative(root, full));
    }
  }
  return files.sort();
};

/** Check if a path is a Koti project (has src/models or package.json with mongoose) */
const isKotiProject = async (dir: string): Promise<boolean> => {
  try {
    const pkgPath = path.join(dir, 'package.json');
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJSON(pkgPath);
      return !!(pkg.dependencies?.mongoose || pkg.dependencies?.express);
    }
  } catch {}
  return false;
};

/** Read existing model names from a project */
const getExistingModels = async (projectPath: string): Promise<string[]> => {
  const modelsDir = path.join(projectPath, 'src', 'models');
  if (!(await fs.pathExists(modelsDir))) return [];
  const files = await fs.readdir(modelsDir);
  return files
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => f.replace('.ts', ''));
};

/** Read current Task enum entries */
const getExistingTasks = async (projectPath: string): Promise<string[]> => {
  const taskPath = path.join(projectPath, 'src', 'enums', 'Task.ts');
  if (!(await fs.pathExists(taskPath))) return [];
  const content = await fs.readFile(taskPath, 'utf-8');
  const matches = content.match(/^\s+(\w+)\s*=/gm);
  return (matches || []).map((m) => m.trim().split('=')[0].trim());
};

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: 'koti-mcp',
  version: getVersion(),
});

// ============ TOOLS ============

// Tool 1: create_project
server.registerTool(
  'create_project',
  {
    title: 'Create New API Project',
    description:
      'Scaffolds a complete Bun + Express + MongoDB TypeScript API project with JWT authentication, RBAC (role-based access control), Swagger docs, audit logging, and security middleware. Equivalent to `koti new <name>`.',
    inputSchema: {
      projectName: z
        .string()
        .regex(/^[a-z0-9-]+$/, 'Must be kebab-case (e.g. "my-api")')
        .describe('Project name in kebab-case (used as directory name and DB name)'),
      directory: z
        .string()
        .optional()
        .describe('Parent directory to create the project in. Defaults to current working directory.'),
      skipInstall: z
        .boolean()
        .optional()
        .default(false)
        .describe('Skip running bun/npm install after scaffolding'),
    },
    annotations: {
      title: 'Create Project',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async ({ projectName, directory, skipInstall }) => {
    const cwd = directory || process.cwd();
    const projectPath = path.join(cwd, projectName);

    // Check if directory already exists
    if (await fs.pathExists(projectPath)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: Directory "${projectPath}" already exists. Choose a different project name or remove the existing directory.`,
          },
        ],
        isError: true,
      };
    }

    // Build interactive input for `koti new`
    // The "new" command is non-interactive — just pass the project name
    const result = await runKotiCommand(['new', projectName], cwd);

    const output = stripAnsi(result.stdout + result.stderr);

    if (result.exitCode !== 0) {
      return {
        content: [{ type: 'text' as const, text: `Error creating project:\n${output}` }],
        isError: true,
      };
    }

    // List generated files
    let fileList = '';
    try {
      const files = await walkDir(projectPath);
      fileList = `\n\nGenerated ${files.length} files:\n${files.map((f) => `  ${f}`).join('\n')}`;
    } catch {}

    return {
      content: [
        {
          type: 'text' as const,
          text: `Project "${projectName}" created successfully at ${projectPath}${fileList}\n\nNext steps:\n  cd ${projectName}\n  npm run seed    # Create default roles & users\n  npm run dev     # Start the API server`,
        },
      ],
    };
  }
);

// Tool 2: create_model
server.registerTool(
  'create_model',
  {
    title: 'Create Mongoose Model',
    description:
      'Creates a TypeScript Mongoose model with interface definition, optional CRUD endpoints (controller, service, routes, Joi validation), and optional RBAC task generation. Equivalent to `koti model <name>` with all interactive prompts answered programmatically.',
    inputSchema: {
      modelName: z
        .string()
        .regex(/^[A-Z][a-zA-Z0-9]*$/, 'Must be PascalCase (e.g. "Product", "UserProfile")')
        .describe('Model name in PascalCase'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name (camelCase)'),
            type: z
              .enum([
                'String',
                'Number',
                'Date',
                'Boolean',
                'ObjectId',
                'Array',
                'Mixed',
                'Decimal128',
                'Map',
                'Schema',
              ])
              .describe('Mongoose data type'),
            required: z.boolean().optional().default(false),
            unique: z.boolean().optional().default(false),
            ref: z.string().optional().describe('Referenced model name (for ObjectId fields)'),
          })
        )
        .min(1)
        .describe('Array of field definitions for the schema'),
      generateCrud: z
        .boolean()
        .optional()
        .default(false)
        .describe('Generate CRUD controller, service, routes, and Joi validation'),
      generateTasks: z
        .boolean()
        .optional()
        .default(false)
        .describe('Generate RBAC tasks (VIEW_X, CREATE_X, UPDATE_X, DELETE_X) in the Task enum'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ modelName, fields, generateCrud, generateTasks, projectPath }) => {
    // Validate project
    if (!(await isKotiProject(projectPath))) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: "${projectPath}" does not appear to be a Koti project. Run create_project first.`,
          },
        ],
        isError: true,
      };
    }

    // Build the interactive input string that the readline prompts expect
    // The model command flow:
    //   1. Field name (or 'done')
    //   2. Field type number (1-10)
    //   3. Required? (y/n)
    //   4. Unique? (y/n)
    //   ... repeat until 'done'
    //   5. Generate CRUD? (y/n)
    //   6. Generate tasks? (y/n) — only if CRUD is yes

    const typeMap: Record<string, number> = {
      String: 1,
      Number: 2,
      Date: 3,
      Boolean: 4,
      ObjectId: 5,
      Array: 6,
      Mixed: 7,
      Decimal128: 8,
      Map: 9,
      Schema: 10,
    };

    let input = '';
    for (const field of fields) {
      input += `${field.name}\n`;
      input += `${typeMap[field.type] || 1}\n`;
      input += `${field.required ? 'y' : 'n'}\n`;
      input += `${field.unique ? 'y' : 'n'}\n`;
    }
    input += 'done\n';
    input += generateCrud ? 'y\n' : 'n\n';
    if (generateCrud) {
      input += generateTasks ? 'y\n' : 'n\n';
    }

    const result = await runKotiCommand(['model', modelName], projectPath, input);
    const output = stripAnsi(result.stdout + result.stderr);

    if (result.exitCode !== 0 && !output.includes('successfully')) {
      return {
        content: [{ type: 'text' as const, text: `Error creating model:\n${output}` }],
        isError: true,
      };
    }

    // Collect created files
    const createdFiles: string[] = [];
    const possibleFiles = [
      `src/models/${modelName}.ts`,
      ...(generateCrud
        ? [
            `src/controllers/${modelName.charAt(0).toLowerCase() + modelName.slice(1)}Controller.ts`,
            `src/services/${modelName.charAt(0).toLowerCase() + modelName.slice(1)}Service.ts`,
            `src/routes/${modelName.charAt(0).toLowerCase() + modelName.slice(1)}.ts`,
            `src/validators/${modelName.charAt(0).toLowerCase() + modelName.slice(1)}Validator.ts`,
          ]
        : []),
    ];

    for (const f of possibleFiles) {
      if (await fs.pathExists(path.join(projectPath, f))) {
        createdFiles.push(f);
      }
    }

    const fieldsDesc = fields.map((f) => `  ${f.name}: ${f.type}${f.required ? ' (required)' : ''}${f.unique ? ' (unique)' : ''}`).join('\n');

    return {
      content: [
        {
          type: 'text' as const,
          text: `Model "${modelName}" created successfully!\n\nFields:\n${fieldsDesc}\n\nCRUD: ${generateCrud ? 'Yes' : 'No'}\nRBAC Tasks: ${generateTasks ? 'Yes' : 'No'}\n\nFiles created:\n${createdFiles.map((f) => `  ${f}`).join('\n')}`,
        },
      ],
    };
  }
);

// Tool 3: create_controller
server.registerTool(
  'create_controller',
  {
    title: 'Create Controller',
    description:
      'Creates an empty TypeScript Express controller class. Equivalent to `koti controller <name>`.',
    inputSchema: {
      controllerName: z.string().describe('Controller name in PascalCase (e.g. "Payment")'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ controllerName, projectPath }) => {
    const result = await runKotiCommand(['controller', controllerName], projectPath);
    const output = stripAnsi(result.stdout + result.stderr);

    if (result.exitCode !== 0 && !output.includes('successfully')) {
      return { content: [{ type: 'text' as const, text: `Error:\n${output}` }], isError: true };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Controller "${controllerName}" created at src/controllers/${controllerName.charAt(0).toLowerCase() + controllerName.slice(1)}Controller.ts`,
        },
      ],
    };
  }
);

// Tool 4: create_service
server.registerTool(
  'create_service',
  {
    title: 'Create Service',
    description:
      'Creates an empty TypeScript service class. Equivalent to `koti service <name>`.',
    inputSchema: {
      serviceName: z.string().describe('Service name in PascalCase (e.g. "Payment")'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ serviceName, projectPath }) => {
    const result = await runKotiCommand(['service', serviceName], projectPath);
    const output = stripAnsi(result.stdout + result.stderr);

    if (result.exitCode !== 0 && !output.includes('successfully')) {
      return { content: [{ type: 'text' as const, text: `Error:\n${output}` }], isError: true };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Service "${serviceName}" created at src/services/${serviceName.charAt(0).toLowerCase() + serviceName.slice(1)}Service.ts`,
        },
      ],
    };
  }
);

// Tool 5: create_middleware
server.registerTool(
  'create_middleware',
  {
    title: 'Create Middleware',
    description:
      'Creates an Express middleware function. Equivalent to `koti middleware <name>`.',
    inputSchema: {
      middlewareName: z.string().describe('Middleware name (e.g. "rateLimiter", "cors")'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ middlewareName, projectPath }) => {
    const result = await runKotiCommand(['middleware', middlewareName], projectPath);
    const output = stripAnsi(result.stdout + result.stderr);

    if (result.exitCode !== 0 && !output.includes('successfully')) {
      return { content: [{ type: 'text' as const, text: `Error:\n${output}` }], isError: true };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Middleware "${middlewareName}" created at src/middleware/${middlewareName}.ts`,
        },
      ],
    };
  }
);

// Tool 6: create_enum
server.registerTool(
  'create_enum',
  {
    title: 'Create TypeScript Enum',
    description:
      'Creates a TypeScript enum with string or number values. Equivalent to `koti enum <name>`.',
    inputSchema: {
      enumName: z
        .string()
        .regex(/^[A-Z][a-zA-Z0-9]*$/)
        .describe('Enum name in PascalCase (e.g. "OrderStatus")'),
      enumType: z
        .enum(['string', 'number'])
        .describe('Whether enum values are strings or numbers'),
      values: z
        .array(
          z.object({
            key: z.string().describe('Enum key (UPPER_SNAKE_CASE)'),
            value: z.union([z.string(), z.number()]).describe('Enum value'),
          })
        )
        .min(1)
        .describe('Enum key-value pairs'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ enumName, enumType, values, projectPath }) => {
    // Build readline input: 1=string 2=number, then key,value pairs, then 'done'
    let input = `${enumType === 'string' ? '1' : '2'}\n`;
    for (const v of values) {
      input += `${v.key}\n${v.value}\n`;
    }
    input += 'done\n';

    const result = await runKotiCommand(['enum', enumName], projectPath, input);
    const output = stripAnsi(result.stdout + result.stderr);

    if (result.exitCode !== 0 && !output.includes('successfully')) {
      return { content: [{ type: 'text' as const, text: `Error:\n${output}` }], isError: true };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Enum "${enumName}" created at src/enums/${enumName}.ts with ${values.length} values: ${values.map((v) => v.key).join(', ')}`,
        },
      ],
    };
  }
);

// Tool 7: create_task
server.registerTool(
  'create_task',
  {
    title: 'Add RBAC Task',
    description:
      'Adds a new task to the Task enum for role-based access control. Tasks are permissions that can be assigned to roles. Equivalent to `koti task <name>`.',
    inputSchema: {
      taskName: z
        .string()
        .regex(/^[A-Z_]+$/, 'Must be UPPER_SNAKE_CASE (e.g. "MANAGE_INVENTORY")')
        .describe('Task name in UPPER_SNAKE_CASE'),
      description: z
        .string()
        .optional()
        .default('')
        .describe('Human-readable description of this permission'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ taskName, description, projectPath }) => {
    let input = description ? `${description}\n` : `Allows ${taskName.toLowerCase().replace(/_/g, ' ')}\n`;

    const result = await runKotiCommand(['task', taskName], projectPath, input);
    const output = stripAnsi(result.stdout + result.stderr);

    if (result.exitCode !== 0 && !output.includes('successfully')) {
      return { content: [{ type: 'text' as const, text: `Error:\n${output}` }], isError: true };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `RBAC task "${taskName}" added to src/enums/Task.ts\nDescription: ${description || taskName.toLowerCase().replace(/_/g, ' ')}`,
        },
      ],
    };
  }
);

// Tool 8: seed_database
server.registerTool(
  'seed_database',
  {
    title: 'Seed Database',
    description:
      'Runs the seed script to populate MongoDB with default roles (Super Admin, Admin) and users (superadmin, admin). The database must be running. Equivalent to `npm run seed`.',
    inputSchema: {
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
      seedType: z
        .enum(['all', 'roles'])
        .optional()
        .default('all')
        .describe('"all" seeds roles + users, "roles" seeds only roles'),
    },
  },
  async ({ projectPath, seedType }) => {
    const cmd = seedType === 'roles' ? 'seed:roles' : 'seed';

    try {
      const output = execSync(`npm run ${cmd}`, {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 30000,
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Database seeded successfully!\n\n${stripAnsi(output)}`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error seeding database. Make sure MongoDB is running.\n\n${stripAnsi(err.stderr || err.message)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============ RESOURCES ============

// Resource 1: Project structure
server.registerResource(
  'project-structure',
  'koti://project/structure',
  {
    title: 'Project File Tree',
    description: 'Returns the file and directory tree of the current Koti project',
    mimeType: 'text/plain',
  },
  async (uri) => {
    const projectPath = process.cwd();
    if (!(await isKotiProject(projectPath))) {
      return {
        contents: [
          { uri: uri.href, mimeType: 'text/plain', text: 'Not a Koti project directory.' },
        ],
      };
    }
    const files = await walkDir(projectPath);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text: `Project: ${path.basename(projectPath)}\nFiles: ${files.length}\n\n${files.join('\n')}`,
        },
      ],
    };
  }
);

// Resource 2: Existing models
server.registerResource(
  'models-list',
  'koti://project/models',
  {
    title: 'Project Models',
    description: 'Lists all Mongoose models defined in the project',
    mimeType: 'text/plain',
  },
  async (uri) => {
    const models = await getExistingModels(process.cwd());
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text: models.length
            ? `Models (${models.length}):\n${models.map((m) => `  - ${m}`).join('\n')}`
            : 'No models found.',
        },
      ],
    };
  }
);

// Resource 3: RBAC tasks
server.registerResource(
  'tasks-list',
  'koti://project/tasks',
  {
    title: 'RBAC Tasks',
    description: 'Lists all RBAC tasks defined in the Task enum',
    mimeType: 'text/plain',
  },
  async (uri) => {
    const tasks = await getExistingTasks(process.cwd());
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text: tasks.length
            ? `Tasks (${tasks.length}):\n${tasks.map((t) => `  - ${t}`).join('\n')}`
            : 'No tasks found.',
        },
      ],
    };
  }
);

// ============ PROMPTS ============

server.registerPrompt(
  'scaffold-api',
  {
    title: 'Scaffold Complete API',
    description:
      'Guided workflow: create a new project, define data models, set up RBAC, and seed the database.',
    argsSchema: {
      projectName: z.string().describe('Project name in kebab-case'),
      description: z.string().describe('What this API is for'),
    },
  },
  ({ projectName, description }) => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `I want to create a new Bun + Express + MongoDB API project called "${projectName}".

${description}

Please:
1. Use the create_project tool to scaffold the project
2. Create the data models I described using create_model (with CRUD and RBAC tasks)
3. Add any additional RBAC tasks using create_task
4. Seed the database using seed_database

Use the Koti MCP tools for each step.`,
        },
      },
    ],
  })
);

server.registerPrompt(
  'add-crud-model',
  {
    title: 'Add Model with CRUD',
    description: 'Guided model creation with full CRUD endpoints and RBAC permissions.',
    argsSchema: {
      modelName: z.string().describe('Model name in PascalCase'),
      description: z.string().describe('What this model represents and its key fields'),
      projectPath: z.string().describe('Path to the Koti project'),
    },
  },
  ({ modelName, description, projectPath }) => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Add a new model called "${modelName}" to the Koti project at ${projectPath}.

${description}

Please:
1. Use create_model with appropriate fields, generateCrud=true, and generateTasks=true
2. Verify the files were created
3. Show me the API endpoints that were generated`,
        },
      },
    ],
  })
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Koti MCP server failed to start:', err);
  process.exit(1);
});
