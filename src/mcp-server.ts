#!/usr/bin/env node

/**
 * Koti CLI — MCP Server. Exposes Koti scaffolding as MCP tools (stdio transport)
 * so AI assistants can create/edit Bun + MongoDB API projects (Express or Elysia).
 * All tools call the shared generator modules in-process.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';

import { GeneratorError, getVersion, resolveProject, FieldSpec } from './generators/context';
import { createProject } from './generators/project';
import { createModel, editModel } from './generators/model';
import { createEnum } from './generators/enum';
import { createTask } from './generators/task';
import { createController } from './generators/controller';
import { createService } from './generators/service';
import { createMiddleware } from './generators/middleware';

// Project root for RESOURCES (client-spawned stdio servers have a meaningless cwd)
const rootArgIdx = process.argv.indexOf('--project-root');
const PROJECT_ROOT =
  (rootArgIdx >= 0 && process.argv[rootArgIdx + 1]) ||
  process.env.KOTI_PROJECT_ROOT ||
  process.cwd();

// ---- Helpers ----------------------------------------------------------

const ok = (text: string, files: string[] = [], warnings: string[] = []) => ({
  content: [{
    type: 'text' as const,
    text: [text,
      files.length ? `\nFiles created/updated:\n${files.map(f => `  - ${f}`).join('\n')}` : '',
      warnings.length ? `\nWarnings:\n${warnings.map(w => `  ⚠ ${w}`).join('\n')}` : '',
    ].filter(Boolean).join('\n'),
  }],
});

const fail = (error: unknown) => ({
  isError: true,
  content: [{
    type: 'text' as const,
    text: error instanceof GeneratorError
      ? `[${error.code}] ${error.message}`
      : `Unexpected error: ${(error as Error).message}`,
  }],
});

const requireAbsolute = (p: string, what: string): string => {
  if (!path.isAbsolute(p)) {
    throw new GeneratorError('INVALID_INPUT', `${what} must be an absolute path (got "${p}")`);
  }
  return p;
};

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

/** Run `npm run <script>` in cwd, capturing combined output, with a 120s hard timeout. */
const runSeed = (cwd: string, script: string): Promise<{ code: number | null; output: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', script], { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
    let output = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new GeneratorError('IO_ERROR', `Seed timed out after 120s.\nOutput so far:\n${output}`));
    }, 120_000);
    child.stdout!.on('data', (d) => { output += d.toString(); });
    child.stderr!.on('data', (d) => { output += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); reject(new GeneratorError('IO_ERROR', `Failed to spawn npm: ${err.message}`)); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, output }); });
  });

// ---- Shared schema fragments ------------------------------------------

/** Field definition shared by create_model.fields and edit_model.addFields. */
const fieldSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Must be a valid identifier (e.g. "name", "createdBy")').describe('Field name (camelCase)'),
  type: z.enum(['String', 'Number', 'Date', 'Boolean', 'ObjectId', 'Array', 'Mixed', 'JSON']).describe('Mongoose data type'),
  required: z.boolean().optional().default(false),
  unique: z.boolean().optional().default(false),
  index: z.boolean().optional().default(false).describe('Add a schema-level index on this field'),
  default: z.string().optional().describe('Default value rendered verbatim into the schema (single line)'),
});

const server = new McpServer({ name: 'koti-mcp', version: getVersion() });

// ============ TOOLS ============

server.registerTool(
  'create_project',
  {
    title: 'Create Project',
    description: 'Scaffold a complete Bun API project with your choice of Express or Elysia framework and MongoDB or PostgreSQL database (JWT auth, RBAC, audit, documents/S3, tinyURL, Swagger, email).',
    inputSchema: {
      projectName: z.string().regex(/^[a-z0-9-]+$/, 'Must be kebab-case (e.g. "my-api")').describe('Project name in kebab-case (used as directory name and DB name)'),
      framework: z.enum(['express', 'elysia']).optional().default('express').describe('Web framework for the generated project'),
      database: z.enum(['mongodb', 'postgres']).optional().default('mongodb').describe('Database for the generated project: mongodb (Mongoose) or postgres (Drizzle ORM)'),
      directory: z.string().optional().describe('ABSOLUTE parent directory to create the project in. Defaults to the server process cwd.'),
      skipInstall: z.boolean().optional().default(false).describe('Skip running bun/npm install after scaffolding'),
    },
    annotations: { title: 'Create Project', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ projectName, framework, database, directory, skipInstall }) => {
    try {
      if (directory !== undefined) requireAbsolute(directory, 'directory');
      const result = await createProject({ name: projectName, framework, database, directory, skipInstall });
      return ok(`Project "${projectName}" created at ${result.projectPath} (framework: ${framework}, database: ${database}).`, result.files, result.warnings);
    } catch (error) { return fail(error); }
  }
);

server.registerTool(
  'create_model',
  {
    title: 'Create Mongoose Model',
    description: 'Creates a TypeScript Mongoose model with interface definition, optional CRUD endpoints (controller, service, routes, validation), and optional RBAC task generation.',
    inputSchema: {
      modelName: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/, 'Must be PascalCase (e.g. "Product", "UserProfile")').describe('Model name in PascalCase'),
      fields: z.array(fieldSchema).min(1).describe('Array of field definitions for the schema'),
      generateCrud: z.boolean().optional().default(false).describe('Generate CRUD controller, service, routes, and validation'),
      generateTasks: z.boolean().optional().default(false).describe('Generate RBAC tasks (VIEW_X, CREATE_X, UPDATE_X, DELETE_X) in the Task enum'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ modelName, fields, generateCrud, generateTasks, projectPath }) => {
    try {
      requireAbsolute(projectPath, 'projectPath');
      const result = await createModel({
        projectRoot: projectPath,
        name: modelName,
        fields: fields as FieldSpec[],
        crud: generateCrud,
        tasks: generateTasks,
      });
      return ok(`Model "${modelName}" created (CRUD: ${generateCrud ? 'yes' : 'no'}, RBAC tasks: ${generateTasks ? 'yes' : 'no'}).`, result.files, result.warnings);
    } catch (error) { return fail(error); }
  }
);

server.registerTool(
  'edit_model',
  {
    title: 'Edit Mongoose Model',
    description: 'Add or remove fields on an existing model; regenerates CRUD files with .bak backups.',
    inputSchema: {
      modelName: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/, 'Must be PascalCase (e.g. "Product", "UserProfile")').describe('Model name in PascalCase'),
      addFields: z.array(fieldSchema).optional().describe('Fields to add to the model'),
      removeFields: z.array(z.string()).optional().describe('Names of existing fields to remove from the model'),
      updateCrud: z.boolean().optional().default(true).describe('Regenerate CRUD controller/service/routes/validator (with .bak backups) to reflect the field changes'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ modelName, addFields, removeFields, updateCrud, projectPath }) => {
    try {
      requireAbsolute(projectPath, 'projectPath');
      const result = await editModel({
        projectRoot: projectPath,
        name: modelName,
        addFields: addFields as FieldSpec[] | undefined,
        removeFields,
        updateCrud,
      });
      return ok(`Model "${modelName}" updated.`, result.files, result.warnings);
    } catch (error) { return fail(error); }
  }
);

server.registerTool(
  'create_controller',
  {
    title: 'Create Controller',
    description: 'Creates an empty controller (class for Express, handler object for Elysia).',
    inputSchema: {
      controllerName: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/, 'Must be PascalCase (e.g. "Payment")').describe('Controller name in PascalCase'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ controllerName, projectPath }) => {
    try {
      requireAbsolute(projectPath, 'projectPath');
      const result = await createController({ projectRoot: projectPath, name: controllerName });
      return ok(`Controller "${controllerName}" created.`, result.files, result.warnings);
    } catch (error) { return fail(error); }
  }
);

server.registerTool(
  'create_service',
  {
    title: 'Create Service',
    description: 'Creates an empty TypeScript service class.',
    inputSchema: {
      serviceName: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/, 'Must be PascalCase (e.g. "Payment")').describe('Service name in PascalCase'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ serviceName, projectPath }) => {
    try {
      requireAbsolute(projectPath, 'projectPath');
      const result = await createService({ projectRoot: projectPath, name: serviceName });
      return ok(`Service "${serviceName}" created.`, result.files, result.warnings);
    } catch (error) { return fail(error); }
  }
);

server.registerTool(
  'create_middleware',
  {
    title: 'Create Middleware',
    description: 'Creates a middleware function (Express) or plugin (Elysia).',
    inputSchema: {
      middlewareName: z.string().regex(/^[A-Za-z][a-zA-Z0-9]*$/, 'Must start with a letter (e.g. "rateLimiter", "cors")').describe('Middleware name (e.g. "rateLimiter", "cors")'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ middlewareName, projectPath }) => {
    try {
      requireAbsolute(projectPath, 'projectPath');
      const result = await createMiddleware({ projectRoot: projectPath, name: middlewareName });
      return ok(`Middleware "${middlewareName}" created.`, result.files, result.warnings);
    } catch (error) { return fail(error); }
  }
);

server.registerTool(
  'create_enum',
  {
    title: 'Create TypeScript Enum',
    description: 'Creates a TypeScript enum with string or number values.',
    inputSchema: {
      enumName: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/, 'Must be PascalCase (e.g. "OrderStatus")').describe('Enum name in PascalCase (e.g. "OrderStatus")'),
      enumType: z.enum(['string', 'number']).describe('Whether enum values are strings or numbers'),
      values: z.array(
        z.object({
          key: z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Must be UPPER_SNAKE_CASE').describe('Enum key (UPPER_SNAKE_CASE)'),
          value: z.union([z.string(), z.number()]).describe('Enum value'),
        })
      ).min(1).describe('Enum key-value pairs'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ enumName, enumType, values, projectPath }) => {
    try {
      requireAbsolute(projectPath, 'projectPath');
      const result = await createEnum({ projectRoot: projectPath, name: enumName, enumType, values });
      return ok(`Enum "${enumName}" created with ${values.length} values: ${values.map((v) => v.key).join(', ')}.`, result.files, result.warnings);
    } catch (error) { return fail(error); }
  }
);

server.registerTool(
  'create_task',
  {
    title: 'Add RBAC Task',
    description: 'Adds a new task to the Task enum for role-based access control. Tasks are permissions that can be assigned to roles.',
    inputSchema: {
      taskName: z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Must be UPPER_SNAKE_CASE, starting with a letter (e.g. "MANAGE_INVENTORY")').describe('Task name in UPPER_SNAKE_CASE'),
      description: z.string().optional().default('').describe('Human-readable description of this permission (auto-generated from the task name if omitted)'),
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
    },
  },
  async ({ taskName, description, projectPath }) => {
    try {
      requireAbsolute(projectPath, 'projectPath');
      const desc = description.trim() || `Allows ${taskName.toLowerCase().replace(/_/g, ' ')}`;
      const result = await createTask({ projectRoot: projectPath, name: taskName, description: desc });
      return ok(`RBAC task "${taskName}" added to src/enums/Task.ts.\nDescription: ${desc}`, result.files, result.warnings);
    } catch (error) { return fail(error); }
  }
);

server.registerTool(
  'seed_database',
  {
    title: 'Seed Database',
    description: 'Runs the seed script to populate MongoDB with default roles (Super Admin, Admin) and users (superadmin, admin). The database must be running.',
    inputSchema: {
      projectPath: z.string().describe('Absolute path to the Koti project root directory'),
      seedType: z.enum(['all', 'roles']).optional().default('all').describe('"all" seeds roles + users, "roles" seeds only roles'),
    },
  },
  async ({ projectPath, seedType }) => {
    try {
      requireAbsolute(projectPath, 'projectPath');
      await resolveProject(projectPath);
      const { code, output } = await runSeed(projectPath, seedType === 'roles' ? 'seed:roles' : 'seed');
      if (code !== 0) {
        return fail(new GeneratorError('IO_ERROR', `Seeding failed (exit ${code}):\n${output}`));
      }
      return ok(`Database seeded (${seedType}).\n${output}`);
    } catch (error) { return fail(error); }
  }
);

// ============ RESOURCES ============

server.registerResource(
  'project-structure',
  'koti://project/structure',
  {
    title: 'Project File Tree',
    description: 'Returns the file and directory tree of the current Koti project',
    mimeType: 'text/plain',
  },
  async (uri) => {
    try {
      await resolveProject(PROJECT_ROOT);
    } catch {
      return {
        contents: [
          { uri: uri.href, mimeType: 'text/plain', text: 'Not a Koti project directory.' },
        ],
      };
    }
    const files = await walkDir(PROJECT_ROOT);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text: `Project: ${path.basename(PROJECT_ROOT)}\nFiles: ${files.length}\n\n${files.join('\n')}`,
        },
      ],
    };
  }
);

server.registerResource(
  'models-list',
  'koti://project/models',
  {
    title: 'Project Models',
    description: 'Lists all Mongoose models defined in the project',
    mimeType: 'text/plain',
  },
  async (uri) => {
    const models = await getExistingModels(PROJECT_ROOT);
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

server.registerResource(
  'tasks-list',
  'koti://project/tasks',
  {
    title: 'RBAC Tasks',
    description: 'Lists all RBAC tasks defined in the Task enum',
    mimeType: 'text/plain',
  },
  async (uri) => {
    const tasks = await getExistingTasks(PROJECT_ROOT);
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
          text: `I want to create a new Bun + MongoDB API project (Express or Elysia — ask me which, or default to Express) called "${projectName}".

${description}

Please:
1. Use the create_project tool to scaffold the project
1.5. Ask which framework I want (or default to Express) and pass it as the "framework" parameter to create_project
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

// ---- Start --------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Koti MCP server failed to start:', err);
  process.exit(1);
});
