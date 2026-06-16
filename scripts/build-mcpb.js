#!/usr/bin/env node

/**
 * build-mcpb.js
 *
 * Builds the Koti MCP server into an .mcpb bundle (ZIP archive)
 * that can be one-click installed in Claude Desktop.
 *
 * Usage:
 *   node scripts/build-mcpb.js
 *
 * Output:
 *   koti-mcp-<version>.mcpb  (in project root)
 *
 * The bundle contains:
 *   manifest.json          — MCPB metadata (v0.3)
 *   dist/cli.js            — Compiled Koti CLI (used by MCP tools)
 *   dist/mcp-server.js     — Compiled MCP server entry point
 *   templates/             — Project templates (used by create_project)
 *   version.json           — Version info
 *   node_modules/          — Production dependencies (commander, fs-extra, MCP SDK, zod)
 *   icon.png               — Extension icon (if present)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  console.log(`\x1b[36m[mcpb]\x1b[0m ${msg}`);
}

function error(msg) {
  console.error(`\x1b[31m[mcpb] ERROR:\x1b[0m ${msg}`);
  process.exit(1);
}

function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

// ---------------------------------------------------------------------------
// Pre-flight checks
// ---------------------------------------------------------------------------

log('Running pre-flight checks...');

// 1. manifest.json
const manifestPath = path.join(ROOT, 'manifest.json');
if (!fileExists(manifestPath)) error('manifest.json not found in project root.');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// 2. version consistency
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
if (manifest.version !== packageJson.version) {
  error(`Version mismatch: manifest.json (${manifest.version}) != package.json (${packageJson.version})`);
}

// 3. dist/ must exist
const distCli = path.join(ROOT, 'dist', 'cli.js');
const distMcp = path.join(ROOT, 'dist', 'mcp-server.js');
if (!fileExists(distCli)) {
  log('dist/cli.js not found — building...');
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
}
if (!fileExists(distMcp)) {
  error('dist/mcp-server.js not found after build. Check tsconfig.json includes src/mcp-server.ts.');
}

// 4. node_modules must exist
if (!fileExists(path.join(ROOT, 'node_modules'))) {
  log('node_modules not found — installing...');
  execSync('npm install --ignore-scripts', { cwd: ROOT, stdio: 'inherit' });
}

// ---------------------------------------------------------------------------
// Build the .mcpb archive
// ---------------------------------------------------------------------------

const version = manifest.version;
const outputName = `koti-mcp-${version}.mcpb`;
const outputPath = path.join(ROOT, outputName);

log(`Building ${outputName}...`);

// Remove previous bundle if exists
if (fileExists(outputPath)) {
  fs.unlinkSync(outputPath);
  log(`Removed existing ${outputName}`);
}

// Build the ZIP using system zip command
// Include only what the MCP server needs to run
const includes = [
  'manifest.json',
  'version.json',
  'dist/cli.js',
  'dist/mcp-server.js',
  'templates/',
];

// Add icon if present
if (fileExists(path.join(ROOT, 'icon.png'))) {
  includes.push('icon.png');
}

// Add production node_modules (only the deps the MCP server needs)
const requiredDeps = [
  '@modelcontextprotocol',
  'commander',
  'fs-extra',
  'zod',
  'graceful-fs',
  'jsonfile',
  'universalify',
  'content-type',
  'raw-body',
  'zod-to-json-schema',
  'eventsource',
  'pkce-challenge',
  'cross-spawn',
];

// Build glob patterns for node_modules
const nodeModulesGlobs = requiredDeps
  .map(dep => `node_modules/${dep}/**`)
  .join(' ');

// Create the bundle
try {
  // Method 1: Use the zip command
  const zipCmd = [
    'cd', `"${ROOT}"`, '&&',
    'zip', '-r', '-q', `"${outputPath}"`,
    ...includes,
    ...requiredDeps.map(dep => `node_modules/${dep}/`),
    // Also include transitive deps that MCP SDK needs
    'node_modules/.package-lock.json',
  ].join(' ');

  execSync(zipCmd, { stdio: 'pipe' });

  // Get file size
  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  log('');
  log(`\x1b[32m✅ Bundle created: ${outputName} (${sizeMB} MB)\x1b[0m`);
  log('');
  log('To install in Claude Desktop:');
  log('  1. Open Claude Desktop');
  log('  2. Go to Settings → Extensions → Install from file');
  log(`  3. Select ${outputName}`);
  log('');
  log('Or distribute the .mcpb file via:');
  log('  - GitHub Releases (attach as release asset)');
  log('  - Your website or docs');
  log('  - Claude Desktop Extensions Directory');

} catch (err) {
  // Fallback: try tar if zip not available
  log('zip command not available, trying tar...');
  try {
    const tarIncludes = includes.concat(
      requiredDeps.map(dep => `node_modules/${dep}/`)
    );

    // Create a temporary directory with the right structure
    const tempDir = path.join(ROOT, '.mcpb-tmp');
    if (fileExists(tempDir)) {
      execSync(`rm -rf "${tempDir}"`);
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // Copy files
    for (const item of tarIncludes) {
      const src = path.join(ROOT, item);
      const dest = path.join(tempDir, item);
      if (fileExists(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        execSync(`cp -r "${src}" "${dest}"`);
      }
    }

    // Create ZIP from temp directory
    execSync(
      `cd "${tempDir}" && zip -r -q "${outputPath}" .`,
      { stdio: 'pipe' }
    );

    // Cleanup
    execSync(`rm -rf "${tempDir}"`);

    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    log(`\x1b[32m✅ Bundle created: ${outputName} (${sizeMB} MB)\x1b[0m`);

  } catch (err2) {
    error(`Failed to create archive. Install 'zip' and try again.\n${err2.message}`);
  }
}
