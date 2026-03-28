# MCP Integration Analysis — Koti CLI

**Date:** 2026-03-28
**Branch:** `emergent-code`
**Status:** Proposal / Feasibility Analysis

---

## Executive Summary

MCP (Model Context Protocol) is Anthropic's open standard that allows AI assistants like Claude to interact with external tools, data sources, and services through a unified protocol. Integrating MCP into Koti CLI would allow Claude (and other MCP-compatible AI clients) to **directly scaffold, generate, and manage Bun/Express/MongoDB API projects** through natural language — without the user needing to run CLI commands manually.

**Verdict: Highly feasible and high-value.** The Koti CLI's architecture — 42 pure code-generation functions that return strings, deterministic file operations, and a well-defined command surface — maps almost perfectly to MCP's tool-based interaction model.

---

## What Is MCP?

MCP (Model Context Protocol) is a JSON-RPC 2.0–based protocol that defines how AI assistants communicate with external services. It has three core primitives:

- **Tools** — Actions the AI can invoke (like function calls). Each tool has a name, description, input schema, and returns structured results.
- **Resources** — Read-only data the AI can access (like files, database records, or configuration). Addressed by URI.
- **Prompts** — Reusable prompt templates with arguments, providing guided workflows.

MCP servers can run locally via **stdio transport** (spawned as a child process by the AI client) or remotely via **Streamable HTTP transport**. The official TypeScript SDK (`@modelcontextprotocol/sdk`) supports Node.js, Bun, and Deno.

---

## Current Koti CLI Architecture

### Strengths for MCP Integration

1. **Pure generation functions** — All 42 code generators (`generateTypeScriptModel`, `generateCRUDController`, `generateCRUDRoutes`, etc.) accept parameters and return TypeScript code as strings. These can be wrapped as MCP tools with zero refactoring of the generation logic itself.

2. **Deterministic file operations** — Every command follows the same pattern: generate code string → write to disk → update barrel file. This is perfectly predictable and safe for AI invocation.

3. **Well-defined command surface** — 8 commands with clear input/output contracts:
   - `koti new <name>` — scaffold project
   - `koti model <name>` — create model (with optional CRUD, tasks, validation)
   - `koti model:edit <name>` — edit existing model
   - `koti controller|service|middleware <name>` — create component
   - `koti enum <name>` — create enum
   - `koti task <name>` — add RBAC task

4. **Template system** — Simple `{{PROJECT_NAME}}` placeholder substitution, easy to parameterize.

5. **TypeScript throughout** — The MCP SDK is TypeScript-native; Koti is TypeScript. No language bridge needed.

### Challenges

1. **Monolithic CLI** — All logic lives in `src/cli.ts` (3,183 lines). Functions are not exported. The MCP server would need to either:
   - Import refactored modules (requires the Phase 2.1 split planned for v2.1), or
   - Duplicate/extract the generation functions into a shared library.

2. **Interactive prompts** — `koti model` and `koti model:edit` use readline-based interactive prompts for field definition. MCP tools must be non-interactive; all parameters must come in the tool's input schema upfront.

3. **No programmatic API** — `dist/cli.js` exports nothing. The MCP server cannot `require('koti')` and call functions directly today.

---

## Proposed MCP Server Design

### Package Structure

```
koti/
├── src/
│   ├── cli.ts                    # Existing CLI (unchanged initially)
│   ├── mcp/
│   │   ├── server.ts             # MCP server entry point
│   │   ├── tools/
│   │   │   ├── newProject.ts     # koti new → MCP tool
│   │   │   ├── createModel.ts    # koti model → MCP tool
│   │   │   ├── editModel.ts      # koti model:edit → MCP tool
│   │   │   ├── createController.ts
│   │   │   ├── createService.ts
│   │   │   ├── createMiddleware.ts
│   │   │   ├── createEnum.ts
│   │   │   └── createTask.ts
│   │   ├── resources/
│   │   │   ├── projectStructure.ts   # Expose project file tree
│   │   │   ├── modelSchema.ts        # Expose existing model schemas
│   │   │   └── taskEnum.ts           # Expose current RBAC tasks
│   │   └── prompts/
│   │       ├── scaffoldApi.ts        # Guided API scaffolding workflow
│   │       └── addCrudModel.ts       # Guided model + CRUD creation
│   └── generators/               # Extracted from cli.ts (shared)
│       ├── model.ts
│       ├── controller.ts
│       ├── service.ts
│       ├── routes.ts
│       ├── enum.ts
│       ├── middleware.ts
│       ├── validation.ts
│       └── essentialFiles.ts
├── bin/
│   └── koti-mcp.ts               # MCP server binary (stdio transport)
└── package.json                  # Add "koti-mcp" to bin field
```

### MCP Tools (8 Tools)

#### Tool 1: `create_project`

Replaces `koti new <project-name>`.

```typescript
server.registerTool('create_project', {
  title: 'Create New Bun API Project',
  description: 'Scaffolds a complete Bun + Express + MongoDB TypeScript API project with authentication, RBAC, Swagger docs, and security middleware.',
  inputSchema: z.object({
    projectName: z.string().describe('Project name (kebab-case, e.g. "my-awesome-api")'),
    directory: z.string().optional().describe('Parent directory to create project in. Defaults to cwd.'),
    skipInstall: z.boolean().optional().describe('Skip dependency installation'),
    skipGit: z.boolean().optional().describe('Skip git init'),
  }),
  annotations: { title: 'Create Project', readOnlyHint: false, destructiveHint: false }
}, async ({ projectName, directory, skipInstall, skipGit }) => {
  // Call extracted generator functions
  // Return: { content: [{ type: 'text', text: 'Project created at /path/to/project\n\nFiles generated:\n...' }] }
});
```

#### Tool 2: `create_model`

Replaces the interactive `koti model <name>`. All field definitions come as structured input instead of readline prompts.

```typescript
server.registerTool('create_model', {
  title: 'Create Mongoose Model',
  description: 'Creates a TypeScript Mongoose model with interface, optional CRUD (controller, service, routes, Joi validation), and optional RBAC task generation.',
  inputSchema: z.object({
    modelName: z.string().describe('Model name in PascalCase (e.g. "Product", "UserProfile")'),
    fields: z.array(z.object({
      name: z.string().describe('Field name'),
      type: z.enum(['String', 'Number', 'Date', 'Boolean', 'ObjectId', 'Array', 'Mixed', 'JSON']),
      required: z.boolean().optional().default(false),
      unique: z.boolean().optional().default(false),
      indexed: z.boolean().optional().default(false),
      default: z.string().optional().describe('Default value as string'),
      ref: z.string().optional().describe('Referenced model name for ObjectId type'),
    })).describe('Array of field definitions'),
    generateCrud: z.boolean().optional().default(false).describe('Generate controller, service, routes, and validation'),
    generateTasks: z.boolean().optional().default(false).describe('Generate RBAC tasks (VIEW, CREATE, UPDATE, DELETE)'),
    projectPath: z.string().describe('Path to the Koti project root'),
  })
}, async ({ modelName, fields, generateCrud, generateTasks, projectPath }) => {
  // Generate model, optionally CRUD + tasks
  // Return list of created files
});
```

#### Tool 3: `edit_model`

Replaces `koti model:edit <name>`. Adds/removes fields non-interactively.

```typescript
server.registerTool('edit_model', {
  title: 'Edit Existing Model',
  description: 'Add or remove fields on an existing Mongoose model. Optionally updates associated CRUD files.',
  inputSchema: z.object({
    modelName: z.string(),
    projectPath: z.string(),
    addFields: z.array(z.object({ /* same as create_model field schema */ })).optional(),
    removeFields: z.array(z.string()).optional().describe('Field names to remove'),
    updateCrud: z.boolean().optional().default(true),
  })
}, async (args) => { /* ... */ });
```

#### Tools 4–8: `create_controller`, `create_service`, `create_middleware`, `create_enum`, `create_task`

Each wraps the corresponding standalone generator with structured input.

### MCP Resources (3 Resources)

Resources let Claude inspect the current state of a Koti project without generating anything.

#### Resource 1: `project://structure`

```typescript
server.registerResource('project-structure',
  new ResourceTemplate('project://{projectPath}/structure', { list: undefined }),
  { title: 'Project File Tree', description: 'Returns the file/directory tree of a Koti project' },
  async (uri, { projectPath }) => {
    const tree = await generateFileTree(projectPath);
    return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: tree }] };
  }
);
```

#### Resource 2: `model://{name}/schema`

Exposes existing model definitions so Claude can understand the current data model before suggesting changes.

#### Resource 3: `tasks://list`

Exposes the current RBAC Task enum so Claude knows what permissions already exist.

### MCP Prompts (2 Prompts)

Prompts give Claude structured workflows for common multi-step operations.

#### Prompt 1: `scaffold-api`

A guided workflow that walks through creating a new project, defining initial models, setting up RBAC, and running seed data.

```typescript
server.registerPrompt('scaffold-api', {
  title: 'Scaffold Complete API',
  description: 'Guided workflow: create project → define models → set up RBAC → configure environment',
  argsSchema: z.object({
    projectName: z.string(),
    description: z.string().describe('What this API is for'),
  })
}, ({ projectName, description }) => ({
  messages: [{
    role: 'user',
    content: {
      type: 'text',
      text: `I want to create a new Bun API project called "${projectName}". ${description}.

Please use the create_project tool to scaffold it, then help me define the data models,
set up RBAC permissions, and configure the environment. Use the Koti MCP tools for each step.`
    }
  }]
}));
```

#### Prompt 2: `add-crud-model`

Guided model creation with CRUD and permissions.

---

## Integration Approaches

### Approach A: Standalone MCP Server Package (Recommended)

**Ship `koti-mcp` as a separate binary in the same npm package.**

```json
{
  "bin": {
    "koti": "./dist/cli.js",
    "koti-mcp": "./dist/mcp/server.js"
  }
}
```

**User configuration** (Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "koti": {
      "command": "koti-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

**Advantages:**
- Single `npm install -g koti` gives both CLI and MCP server
- Stdio transport — no network, no auth, runs locally
- Claude spawns `koti-mcp` as a child process automatically

**Disadvantages:**
- Requires extracting generators from `cli.ts` into shared modules (the v2.1 refactor)

### Approach B: Wrapper MCP Server (Quick Win)

**Create an MCP server that shells out to `koti` CLI commands.**

Instead of importing generation functions directly, the MCP tools would run `koti model Product` as a child process, piping pre-built answers to the interactive prompts.

```typescript
// Simplified example
server.registerTool('create_model', { /* schema */ }, async (args) => {
  const answers = buildModelAnswers(args.fields);
  const result = await execWithInput('koti', ['model', args.modelName], answers);
  return { content: [{ type: 'text', text: result.stdout }] };
});
```

**Advantages:**
- No refactoring of `cli.ts` needed
- Can ship in v2.0.x timeframe
- Uses existing battle-tested command logic

**Disadvantages:**
- Fragile: depends on exact prompt text and ordering
- Harder to get structured output (parsing CLI stdout)
- Slower (process spawning overhead)

### Approach C: Remote MCP Server (Future)

A hosted MCP server with Streamable HTTP transport could serve teams. Not recommended for v2.x — adds auth complexity, hosting costs, and the tool's value is local project generation.

---

## Implementation Roadmap

### Phase 1 — Foundation (v2.1.0)

**Prerequisite:** Complete the `cli.ts` split (DEVELOPMENT_PLAN item 2.1).

1. Extract all generator functions into `src/generators/` modules with proper exports
2. Keep `cli.ts` as a thin Commander.js wrapper that imports from generators
3. Verify all 55+ existing tests still pass

**Estimated effort:** 2–3 days (already planned for v2.1)

### Phase 2 — MCP Server Core (v2.2.0)

1. Add `@modelcontextprotocol/sdk` as a dependency
2. Create `src/mcp/server.ts` with stdio transport
3. Implement all 8 tools, mapping to extracted generators
4. Add `koti-mcp` binary entry point
5. Write MCP-specific tests using the SDK's test utilities

**Estimated effort:** 3–5 days

### Phase 3 — Resources & Prompts (v2.2.x)

1. Add project structure, model schema, and task enum resources
2. Add guided workflow prompts
3. Add completion support for model names, field types, task names

**Estimated effort:** 2–3 days

### Phase 4 — Quick Win Alternative (v2.0.4)

If the v2.1 refactor is delayed, ship Approach B (wrapper) as `koti-mcp` that shells out to `koti` commands. This can be done with the current codebase.

**Estimated effort:** 1–2 days

---

## User Experience Vision

### Before MCP (Current)

```
User types in terminal:
$ koti new my-ecommerce-api
$ cd my-ecommerce-api
$ koti model Product
  → Field name: name
  → Type: String
  → Required? y
  → Field name: price
  → Type: Number
  → Required? y
  → ... (10+ interactive prompts per model)
$ koti model Category
$ koti model Order
$ koti task MANAGE_INVENTORY
```

### After MCP (With Claude)

```
User says to Claude:
"Create a new e-commerce API called my-ecommerce-api with Product, Category,
and Order models. Products should have name (string, required), price (number,
required), description (string), and a category reference. Set up RBAC with
inventory management tasks."

Claude uses MCP tools:
1. create_project("my-ecommerce-api")
2. create_model("Product", fields=[...], generateCrud=true, generateTasks=true)
3. create_model("Category", fields=[...], generateCrud=true)
4. create_model("Order", fields=[...], generateCrud=true, generateTasks=true)
5. create_task("MANAGE_INVENTORY")

Result: Complete project with 40+ files generated in seconds,
all from a single natural-language request.
```

---

## Competitive Advantage

Few CLI scaffolding tools offer MCP integration today. Adding MCP to Koti would:

1. **Differentiate from competitors** — `create-express-api`, `express-generator`, and similar tools are CLI-only
2. **Tap into the AI-assisted development market** — developers increasingly use Claude, Copilot, and similar tools in their workflow
3. **Reduce onboarding friction** — new users can describe what they want instead of learning CLI syntax
4. **Enable complex multi-model scaffolding** — Claude can orchestrate multiple tool calls that would be tedious to do manually
5. **Position for marketplace** — MCP servers can be listed in tool registries, driving discovery

---

## Technical Considerations

### Zod Schemas

MCP tools use Zod for input validation. Koti's field types map cleanly:

```typescript
const FieldTypeEnum = z.enum([
  'String', 'Number', 'Date', 'Boolean',
  'ObjectId', 'Array', 'Mixed', 'JSON'
]);

const FieldSchema = z.object({
  name: z.string().min(1),
  type: FieldTypeEnum,
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  indexed: z.boolean().default(false),
  default: z.string().optional(),
  ref: z.string().optional(),
});
```

### Error Handling

MCP tools should return structured errors, not `process.exit(1)`:

```typescript
// Instead of:
process.exit(1);

// MCP tools should:
return {
  content: [{ type: 'text', text: `Error: Model "Product" already exists at ${path}` }],
  isError: true
};
```

### File System Safety

MCP tools should validate paths and never write outside the specified project directory. Add path validation:

```typescript
const resolvedPath = path.resolve(projectPath);
if (!resolvedPath.startsWith(allowedBase)) {
  throw new Error('Path traversal detected');
}
```

### Dependencies Added

```json
{
  "@modelcontextprotocol/sdk": "^1.x",
  "zod": "^3.22"
}
```

Both are lightweight. Zod is already a transitive dependency of the MCP SDK.

---

## Conclusion

MCP integration is a natural evolution for Koti CLI. The project's architecture — pure generation functions, deterministic output, well-defined commands — is nearly ideal for MCP tool wrapping. The recommended path is:

1. **Immediate (v2.0.4):** Ship a wrapper MCP server using Approach B for early adopter feedback
2. **Short-term (v2.1):** Complete the cli.ts refactor, then build the proper MCP server with Approach A
3. **Medium-term (v2.2):** Add resources, prompts, and completions for a polished AI-assisted experience

The investment is modest (5–10 days total across phases) and the payoff is significant: Koti becomes one of the first API scaffolding tools that AI assistants can use natively.

---

## References

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Server Documentation](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md)
- [MCP SDK on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Building MCP Servers Tutorial](https://dev.to/shadid12/how-to-build-mcp-servers-with-typescript-sdk-1c28)
- [MCP Server Handbook](https://www.freecodecamp.org/news/how-to-build-a-custom-mcp-server-with-typescript-a-handbook-for-developers/)
