# Koti MCP Server — Distribution Guide

How to build, test, and distribute the Koti MCP server so that users can add it to Claude Desktop, Claude Code, Cursor, and other MCP-compatible AI tools.

---

## What You've Got

After the MCP implementation, your npm package ships **two binaries**:

| Binary | Purpose |
|--------|---------|
| `koti` | Traditional CLI (interactive terminal usage) |
| `koti-mcp` | MCP server (AI tool integration via stdio) |

Both share the same generation logic. Users install once, get both.

---

## Distribution Channels

There are **5 ways** users can add the Koti MCP server to their AI tools, from simplest to most advanced.

### Channel 1: npm + npx (Easiest for Developers)

Users who already have Node.js can add Koti to Claude Desktop with zero installation.

**User adds to `~/.claude/claude_desktop_config.json`:**

```json
{
  "mcpServers": {
    "koti": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/koti-mcp"],
      "env": {}
    }
  }
}
```

Or if globally installed (`npm i -g koti`):

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

**For Claude Code**, users add it with:

```bash
claude mcp add koti -- koti-mcp
```

**For Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "koti": {
      "command": "npx",
      "args": ["-y", "koti-mcp"]
    }
  }
}
```

### Channel 2: MCPB Bundle (One-Click Install for Claude Desktop)

MCPB (MCP Bundles) are `.mcpb` zip files that Claude Desktop can install with a single click — no JSON editing needed.

**Build the bundle:**

```bash
# Install the MCPB CLI
npm install -g @anthropic-ai/mcpb

# Build the project first
npm run build

# Pack into a .mcpb file (uses your manifest.json)
mcpb pack
```

This produces `koti-mcp-2.0.3.mcpb`.

**Users install by:**
1. Double-clicking the `.mcpb` file, or
2. Dragging it into Claude Desktop, or
3. Going to Settings → Extensions → Install from file

**Distribute the .mcpb file via:**
- GitHub Releases (attach as a release asset)
- Your website / documentation
- Claude Desktop Extensions Directory (see Channel 4)

### Channel 3: Official MCP Registry

Submit your MCP server to the official registry at [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/).

**Steps:**

1. Ensure your npm package is published and up-to-date
2. Create a PR to the registry repository adding your server metadata
3. Include: name, description, npm package name, supported tools list
4. Registry maintainers review and merge

Once listed, AI tools can discover your server from the registry.

### Channel 4: Claude Desktop Extensions Directory

Anthropic maintains an extensions directory for one-click MCPB installs.

**Steps:**

1. Build your `.mcpb` bundle (Channel 2)
2. Submit to the [Claude Desktop Extensions Directory](https://support.claude.com/en/articles/12922929-building-desktop-extensions-with-mcpb)
3. Users can then find and install Koti directly from Claude Desktop's Extensions panel

### Channel 5: Third-Party Registries

Register your MCP server on third-party discovery platforms:

| Registry | URL | How to Submit |
|----------|-----|---------------|
| **Glama** | [glama.ai/mcp/servers](https://glama.ai/mcp/servers) | Auto-indexes from npm + GitHub |
| **Smithery** | [smithery.ai](https://smithery.ai/) | Submit via their portal |
| **MCP Market** | [mcpmarket.com](https://mcpmarket.com/) | Submit via their portal |
| **LobeHub** | [lobehub.com/mcp](https://lobehub.com/mcp) | Submit via GitHub |
| **MCP.so** | [mcp.so](https://mcp.so/) | Community-curated directory |

Most of these auto-discover npm packages with the `mcp` keyword (already added to your `package.json`).

---

## Step-by-Step: Publish & Distribute

### 1. Build & Test Locally

```bash
# Install dependencies
npm install

# Build both CLI and MCP server
npm run build

# Test the MCP server locally
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/mcp-server.js
```

### 2. Test with Claude Desktop

Add to your local config:

```json
// macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
// Windows: %APPDATA%/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "koti-dev": {
      "command": "node",
      "args": ["/absolute/path/to/BunExpressSetup/dist/mcp-server.js"],
      "env": {}
    }
  }
}
```

Restart Claude Desktop. You should see the Koti tools in the tools panel.

**Test by asking Claude:**
> "Create a new API project called test-shop with a Product model that has name (String, required), price (Number, required), and description (String)"

### 3. Test with Claude Code

```bash
claude mcp add koti-dev -- node /absolute/path/to/BunExpressSetup/dist/mcp-server.js
```

Then:
```bash
claude
> Create a new API project called test-shop
```

### 4. Publish to npm

```bash
# Update version if needed
npm version patch

# Publish
npm publish
```

After publishing, users can immediately use `npx -y koti --mcp` to start the MCP server.

### 5. Create MCPB Bundle

```bash
npm install -g @anthropic-ai/mcpb
npm run build
mcpb pack
```

Attach the `.mcpb` to your GitHub Release.

### 6. Submit to Registries

- Official: PR to the MCP registry repo
- Glama: Should auto-index from npm (has `mcp` keyword)
- Smithery: Submit through their portal

---

## Architecture Recap

```
┌──────────────────────────────────────────────────┐
│                   User / AI Tool                  │
│  (Claude Desktop, Claude Code, Cursor, etc.)     │
└──────────────┬───────────────────────────────────┘
               │  stdio (JSON-RPC 2.0)
               │
┌──────────────▼───────────────────────────────────┐
│             koti-mcp (MCP Server)                │
│                                                   │
│  Tools:                                           │
│    create_project  → shells out to `koti new`    │
│    create_model    → pipes field answers to stdin │
│    create_controller/service/middleware/enum/task │
│    seed_database   → runs `npm run seed`         │
│                                                   │
│  Resources:                                       │
│    project-structure, models-list, tasks-list     │
│                                                   │
│  Prompts:                                         │
│    scaffold-api, add-crud-model                  │
└──────────────┬───────────────────────────────────┘
               │  spawns child process
               │
┌──────────────▼───────────────────────────────────┐
│              koti CLI (Commander.js)             │
│                                                   │
│  42 generation functions → TypeScript code        │
│  File I/O → creates project files                │
│  Template system → {{PROJECT_NAME}} replacement  │
└──────────────────────────────────────────────────┘
```

---

## README Badge

Add this to your README.md to signal MCP support:

```markdown
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue?logo=anthropic)](https://modelcontextprotocol.io)
```

---

## Checklist Before Publishing

- [ ] `npm run build` succeeds (both cli.js and mcp-server.js in dist/)
- [ ] MCP server responds to `initialize` JSON-RPC call
- [ ] All 8 tools work when tested with Claude Desktop
- [ ] `manifest.json` version matches `package.json` version
- [ ] `koti-mcp` binary works after `npm i -g koti`
- [ ] README updated with MCP installation instructions
- [ ] `.mcpb` bundle created and tested
- [ ] Published to npm with `mcp` keyword
- [ ] Submitted to at least one registry (official or Glama/Smithery)
