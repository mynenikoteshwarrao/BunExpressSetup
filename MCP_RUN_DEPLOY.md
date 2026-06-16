# Koti MCP Server — Run & Deploy Guide

Complete step-by-step instructions to build, run, test, and deploy the Koti MCP server on your local machine.

---

## Prerequisites

Before starting, make sure you have:

- **Node.js** >= 16 (recommended: 18+)
- **npm** >= 8
- **Git** (for version control and GitHub releases)
- **MongoDB** running locally (only needed for `seed_database` tool testing)

---

## Step 1: Build the MCP Server

```bash
# Navigate to the project
cd BunExpressSetup

# Install all dependencies (including MCP SDK and Zod)
npm install

# Compile TypeScript to JavaScript
npm run build
```

After build, verify both files exist:

```bash
ls -la dist/cli.js dist/mcp-server.js
```

You should see both `cli.js` (the traditional CLI) and `mcp-server.js` (the MCP server).

---

## Step 2: Test the MCP Server Locally

### Quick smoke test (verify it starts)

```bash
# Send an MCP initialize request via stdin
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/mcp-server.js
```

You should get back a JSON response containing `serverInfo`, `capabilities`, and the list of tools.

### Test with MCP Inspector (optional but recommended)

The MCP Inspector is a browser-based debugging tool:

```bash
# Install globally
npm install -g @modelcontextprotocol/inspector

# Launch inspector pointing at your server
mcp-inspector node dist/mcp-server.js
```

This opens a web UI where you can browse all 8 tools, 3 resources, and 2 prompts, and invoke them interactively.

---

## Step 3: Connect to Claude Desktop

### 3a. Find your config file

| OS | Path |
|----|------|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

If the file doesn't exist, create it.

### 3b. Add the Koti MCP server

Open the config file and add the `koti` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "koti": {
      "command": "node",
      "args": ["/full/path/to/BunExpressSetup/dist/mcp-server.js"],
      "env": {}
    }
  }
}
```

Replace `/full/path/to/BunExpressSetup` with your actual project path.

### 3c. Restart Claude Desktop

Completely quit and reopen Claude Desktop. The Koti tools should now appear in the tools panel (look for the hammer icon at the bottom of the chat input).

### 3d. Test by chatting with Claude

Try these prompts:

> "Create a new API project called my-shop-api"

> "Add a Product model with name (String, required), price (Number, required), and description (String). Generate CRUD and RBAC tasks."

> "Create an OrderStatus enum with values PENDING, PROCESSING, SHIPPED, DELIVERED"

Claude will use the Koti MCP tools to execute each operation.

---

## Step 4: Connect to Claude Code

```bash
# Add the MCP server to Claude Code
claude mcp add koti -- node /full/path/to/BunExpressSetup/dist/mcp-server.js

# Verify it's registered
claude mcp list

# Start Claude Code and use Koti tools
claude
```

Inside Claude Code, type:

> Create a new e-commerce API with Product, Category, and Order models

---

## Step 5: Connect to Cursor

Create or edit `.cursor/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "koti": {
      "command": "node",
      "args": ["/full/path/to/BunExpressSetup/dist/mcp-server.js"]
    }
  }
}
```

Restart Cursor. The Koti tools appear in Cursor's AI panel.

---

## Step 6: Deploy via npm (Global Install)

Publishing to npm lets anyone install and use the MCP server without cloning your repo.

### 6a. Publish to npm

```bash
# Make sure you're logged in
npm login

# Bump version if needed
npm version patch

# Publish (runs build automatically via prepublishOnly)
npm publish
```

### 6b. Users install globally

```bash
npm install -g koti
```

This installs both binaries:
- `koti` — the traditional interactive CLI
- `koti-mcp` — the MCP server

### 6c. Users configure their AI tool

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "koti": {
      "command": "koti-mcp"
    }
  }
}
```

**Claude Code**:

```bash
claude mcp add koti -- koti-mcp
```

**Without installing globally** (npx auto-download):

```json
{
  "mcpServers": {
    "koti": {
      "command": "npx",
      "args": ["-y", "koti"]
    }
  }
}
```

The `npx -y koti` approach downloads the package on first run and caches it. The `koti-mcp` binary is resolved automatically from `package.json`'s `bin` field.

---

## Step 7: Deploy via MCPB Bundle (One-Click Install)

MCPB bundles let Claude Desktop users install with a single double-click — no terminal or JSON editing needed.

### 7a. Build the bundle

```bash
npm run pack:mcpb
```

This runs `scripts/build-mcpb.js` which:
1. Checks that `manifest.json` version matches `package.json`
2. Verifies `dist/` contains both compiled files
3. Bundles `manifest.json`, `dist/`, `templates/`, `node_modules/` (production only), `icon.png`, and `version.json` into a ZIP
4. Outputs `koti-mcp-2.0.3.mcpb`

### 7b. Test the bundle

1. Open Claude Desktop
2. Go to **Settings** → **Extensions** → **Install from file**
3. Select `koti-mcp-2.0.3.mcpb`
4. Claude Desktop extracts it and registers all 8 tools
5. Test with: "Create a new API project called test-project"

### 7c. Distribute the bundle

Attach the `.mcpb` file to your **GitHub Release**:

```bash
# Create a git tag
git tag v2.0.3
git push origin v2.0.3

# Create a GitHub release and upload the .mcpb
gh release create v2.0.3 \
  --title "Koti v2.0.3 — MCP Server" \
  --notes "Adds MCP server for AI-assisted API scaffolding" \
  koti-mcp-2.0.3.mcpb
```

Users download the `.mcpb` from your releases page and double-click to install.

---

## Step 8: Submit to MCP Registries

Getting listed on registries means AI tools can discover and suggest Koti automatically.

### Official MCP Registry

```bash
# Fork https://github.com/modelcontextprotocol/servers
# Add your server entry and submit a PR
```

### Glama (auto-indexes npm packages with "mcp" keyword)

Your `package.json` already has `"mcp"` in keywords. After publishing to npm, Glama should auto-discover it within a few days at [glama.ai/mcp/servers](https://glama.ai/mcp/servers).

### Smithery

Submit at [smithery.ai](https://smithery.ai/) — provide your npm package name and GitHub URL.

---

## Troubleshooting

### "koti-mcp: command not found"

The global npm bin directory isn't in your PATH.

```bash
# Find where npm installs global binaries
npm config get prefix

# Add to PATH (add to .bashrc / .zshrc)
export PATH="$(npm config get prefix)/bin:$PATH"
```

### Claude Desktop doesn't show Koti tools

1. Check the config file path is correct for your OS
2. Make sure the JSON is valid (no trailing commas)
3. Completely quit and restart Claude Desktop (not just close the window)
4. Check Claude Desktop logs: **Help** → **View Logs** → look for MCP errors

### MCP server crashes on startup

```bash
# Run it directly to see the error
node dist/mcp-server.js 2>&1

# Or check with the initialize message
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/mcp-server.js
```

### "Cannot find module" errors

```bash
# Rebuild from scratch
rm -rf node_modules dist
npm install
npm run build
```

### Tools timeout or fail silently

The `create_project` tool runs `bun install` or `npm install` which can take 30+ seconds. This is normal. If it consistently times out, check that your network is available.

---

## Quick Reference Card

| What | Command |
|------|---------|
| Build | `npm run build` |
| Run locally | `node dist/mcp-server.js` |
| Test with inspector | `mcp-inspector node dist/mcp-server.js` |
| Build .mcpb bundle | `npm run pack:mcpb` |
| Publish to npm | `npm publish` |
| Add to Claude Desktop | Edit `claude_desktop_config.json` |
| Add to Claude Code | `claude mcp add koti -- koti-mcp` |
| Add to Cursor | Edit `.cursor/mcp.json` |
