# Koti MCP Server — Distribution & Install Guide

The MCP server ships inside the `koti` npm package as the `koti-mcp` binary.

## 1. npm (recommended)
    npm install -g koti        # installs both `koti` (CLI) and `koti-mcp` (MCP server)

### Claude Code
    claude mcp add koti -- koti-mcp

### Claude Desktop (claude_desktop_config.json)
    {
      "mcpServers": {
        "koti": {
          "command": "koti-mcp",
          "env": { "KOTI_PROJECT_ROOT": "/absolute/path/to/your/project" }
        }
      }
    }

`KOTI_PROJECT_ROOT` (or the `--project-root` server argument) tells the resources
(project-structure, models-list, tasks-list) which project to describe. Tools always
take an explicit absolute `projectPath`/`directory` argument.

## 2. One-click bundle (Claude Desktop)
Download `koti-mcp-<version>.mcpb` from the repo/releases and open it with Claude
Desktop. Rebuild with `npm run pack:mcpb` (requires manifest.json version ==
package.json version).

## 3. From source
    git clone https://github.com/mynenikoteshwarrao/BunExpressSetup && cd BunExpressSetup
    npm install && npm run build
    claude mcp add koti -- node /absolute/path/to/BunExpressSetup/dist/mcp-server.js

## Tools (9)
create_project (framework: express|elysia), create_model, edit_model, create_enum,
create_task, create_controller, create_service, create_middleware, seed_database.
All mutating tools return the exact list of files written; failures return typed
errors ([INVALID_INPUT], [DUPLICATE], [NOT_KOTI_PROJECT], [IO_ERROR], ...).
