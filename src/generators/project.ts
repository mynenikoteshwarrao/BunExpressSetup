import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import {
  Framework,
  FRAMEWORKS,
  Database,
  GeneratorError,
  GeneratorResult,
  templatesDir,
  generateSecret,
  getVersion,
  assertValidName,
} from './context';

export interface CreateProjectOptions {
  name: string;
  framework?: Framework;
  directory?: string;
  skipInstall?: boolean;
  log?: (msg: string) => void;
}

const noop = (_msg: string): void => {};

// spawn-based install runner: kills on timeout, resolves false on spawn error
// instead of throwing (fixes the crash-the-server vector execSync had).
const runInstall = (cwd: string, cmd: string, timeoutMs: number, log?: (m: string) => void): Promise<boolean> =>
  new Promise((resolve) => {
    log?.(`Running: ${cmd} install`);
    const child = spawn(cmd, ['install'], { cwd, stdio: 'ignore', shell: process.platform === 'win32' });
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(false); }, timeoutMs);
    child.on('error', () => { clearTimeout(timer); resolve(false); });
    child.on('close', (code) => { clearTimeout(timer); resolve(code === 0); });
  });

// Replace {{PROJECT_NAME}} in every copied .ts/.json file — moved verbatim from cli.ts.
const replaceInDir = async (dirPath: string, projectName: string): Promise<void> => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await replaceInDir(fullPath, projectName);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.json')) {
      let content = await fs.readFile(fullPath, 'utf-8');
      if (content.includes('{{PROJECT_NAME}}')) {
        content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
        await fs.writeFile(fullPath, content);
      }
    }
  }
};

/**
 * Insert the db layer's connection line into an env file: replace whatever
 * connection line is already there, else place it under the `# Database`
 * header, else after PORT, else append. Everything else in the file — notably
 * the two REPLACE_WITH_AUTO_GENERATED_SECRET tokens — is left untouched.
 */
const applyEnvFragment = (envContent: string, fragment: string): string => {
  const line = fragment.trim();
  const lines = envContent.split('\n');
  const existing = lines.findIndex(l => /^\s*(MONGODB_URI|DATABASE_URL)\s*=/.test(l));
  if (existing >= 0) {
    lines[existing] = line;
    return lines.join('\n');
  }
  const header = lines.findIndex(l => /^#\s*Database/i.test(l));
  if (header >= 0) {
    lines.splice(header + 1, 0, line);
    return lines.join('\n');
  }
  const port = lines.findIndex(l => /^\s*PORT\s*=/.test(l));
  if (port >= 0) {
    lines.splice(port + 1, 0, '', '# Database', line);
    return lines.join('\n');
  }
  return `${envContent.replace(/\n*$/, '')}\n\n# Database\n${line}\n`;
};

const loadEnvFragment = async (database: Database, projectName: string): Promise<string> => {
  const fragmentPath = path.join(templatesDir(), 'db', database, 'env.fragment');
  if (!(await fs.pathExists(fragmentPath))) return '';
  return (await fs.readFile(fragmentPath, 'utf-8')).replace(/\{\{PROJECT_NAME\}\}/g, projectName);
};

/**
 * Compose the database axis into an already-copied project: merge the db
 * layer's package.deps.json into package.json (script values may be
 * framework-conditional objects), insert its env.fragment into .env and
 * .env.example, and swap the README's <!-- DB_SETUP --> marker for the db's
 * setup prose.
 */
export const applyDbFragments = async (
  projectPath: string, database: Database, framework: Framework, projectName: string
): Promise<void> => {
  const dbDir = path.join(templatesDir(), 'db', database);

  const depsPath = path.join(dbDir, 'package.deps.json');
  if (await fs.pathExists(depsPath)) {
    const fragment = await fs.readJson(depsPath);
    const pkgPath = path.join(projectPath, 'package.json');
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      for (const section of ['dependencies', 'devDependencies'] as const) {
        if (!fragment[section]) continue;
        pkg[section] = { ...(pkg[section] ?? {}), ...fragment[section] };
      }
      if (fragment.scripts) {
        pkg.scripts = pkg.scripts ?? {};
        for (const [name, value] of Object.entries(fragment.scripts as Record<string, unknown>)) {
          // A script value may be framework-conditional: { express: "...", elysia: "..." }
          pkg.scripts[name] = typeof value === 'object' && value !== null
            ? (value as Record<string, string>)[framework]
            : value;
          if (pkg.scripts[name] === undefined) delete pkg.scripts[name];
        }
      }
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    }
  }

  const fragment = await loadEnvFragment(database, projectName);
  if (fragment) {
    for (const fileName of ['.env', '.env.example']) {
      const envPath = path.join(projectPath, fileName);
      if (!(await fs.pathExists(envPath))) continue;
      const content = await fs.readFile(envPath, 'utf-8');
      await fs.writeFile(envPath, applyEnvFragment(content, fragment));
    }
  }

  const readmeFragmentPath = path.join(dbDir, 'readme.fragment.md');
  const readmePath = path.join(projectPath, 'README.md');
  if ((await fs.pathExists(readmeFragmentPath)) && (await fs.pathExists(readmePath))) {
    const prose = (await fs.readFile(readmeFragmentPath, 'utf-8')).replace(/\{\{PROJECT_NAME\}\}/g, projectName);
    const readme = await fs.readFile(readmePath, 'utf-8');
    if (readme.includes('<!-- DB_SETUP -->')) {
      await fs.writeFile(readmePath, readme.replace('<!-- DB_SETUP -->', prose.trimEnd()));
    }
  }
};

// Express-specific inline route templates (import { Router } from 'express').
// For non-Express frameworks the routes ship as static files under templates/<framework>/src,
// so these are only written for Express — deliberately overwriting the copied framework routes.
const indexRouteContent = (projectName: string): string => `import { Router, Request, Response } from 'express';
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
      version: '${getVersion()}',
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

/**
 * Scaffold a new Koti project on disk: directory tree, template copy,
 * {{PROJECT_NAME}} substitution, auto-generated JWT secrets, koti.config.json,
 * and (unless skipInstall) a best-effort dependency install (bun, then npm).
 */
export const createProject = async (
  opts: CreateProjectOptions
): Promise<GeneratorResult & { projectPath: string }> => {
  const log = opts.log ?? noop;
  const files: string[] = [];
  const warnings: string[] = [];

  // --- Validate first (order matters: name -> framework -> directory -> target) ---
  assertValidName(opts.name, /^[a-z0-9-]+$/, 'project name');

  const framework: Framework = opts.framework ?? 'express';
  if (!FRAMEWORKS.includes(framework)) {
    throw new GeneratorError('UNSUPPORTED_FRAMEWORK', `Unsupported framework: "${framework}" (must be one of ${FRAMEWORKS.join(', ')})`);
  }

  const directory = opts.directory ?? process.cwd();
  const dirStat = await fs.stat(directory).catch(() => null);
  if (!dirStat || !dirStat.isDirectory()) {
    throw new GeneratorError('INVALID_INPUT', `Directory does not exist or is not a directory: "${directory}"`);
  }

  const projectPath = path.join(directory, opts.name);
  if (await fs.pathExists(projectPath)) {
    const targetStat = await fs.stat(projectPath);
    const isNonEmptyDir = targetStat.isDirectory() && (await fs.readdir(projectPath)).length > 0;
    if (!targetStat.isDirectory() || isNonEmptyDir) {
      throw new GeneratorError('DUPLICATE', `Target already exists: "${projectPath}"`);
    }
  }

  const database = 'mongodb' as const; // widened to a parameter in the --database task

  log(`🚀 Creating TypeScript Bun API project: ${opts.name}`);
  log(`📁 Project directory: ${projectPath}`);
  await fs.ensureDir(projectPath);
  log(`🧩 Framework: ${framework}`);

  const templatePath = path.join(templatesDir(), framework);
  const sharedTemplatePath = path.join(templatesDir(), 'shared');

  // --- src/ directory scaffold ---
  const srcPath = path.join(projectPath, 'src');
  const directories = [
    'config', 'controllers', 'middleware', 'models',
    'routes', 'types', 'utils', 'services', 'schemas', 'enums', 'validators', 'seeds',
  ];
  for (const dir of directories) {
    await fs.ensureDir(path.join(srcPath, dir));
    log(`✅ Created directory: src/${dir}/`);
  }

  // --- package.json / README.md ---
  const packageJsonPath = path.join(templatePath, 'package.json');
  const readmePath = path.join(templatePath, 'README.md');

  if (await fs.pathExists(packageJsonPath)) {
    let content = await fs.readFile(packageJsonPath, 'utf-8');
    content = content.replace(/\{\{PROJECT_NAME\}\}/g, opts.name);
    const dest = path.join(projectPath, 'package.json');
    await fs.writeFile(dest, content);
    files.push(dest);
    log('✅ Created file: package.json');
  }

  if (await fs.pathExists(readmePath)) {
    let content = await fs.readFile(readmePath, 'utf-8');
    content = content.replace(/\{\{PROJECT_NAME\}\}/g, opts.name);
    const dest = path.join(projectPath, 'README.md');
    await fs.writeFile(dest, content);
    files.push(dest);
    log('✅ Created file: README.md');
  }

  // --- Copy framework-specific and shared source files ---
  const templateSrcPath = path.join(templatePath, 'src');
  const projectSrcPath = srcPath;

  if (await fs.pathExists(templateSrcPath)) {
    await fs.copy(templateSrcPath, projectSrcPath);
    log('✅ Copied framework source files');
  }

  const sharedSrcPath = path.join(sharedTemplatePath, 'src');
  if (await fs.pathExists(sharedSrcPath)) {
    await fs.copy(sharedSrcPath, projectSrcPath);
    log('✅ Copied shared source files');
  }

  const dbTemplateSrc = path.join(templatesDir(), 'db', database, 'src');
  if (await fs.pathExists(dbTemplateSrc)) {
    await fs.copy(dbTemplateSrc, projectSrcPath);
    log(`✅ Copied ${database} source files`);
  }

  if (await fs.pathExists(projectSrcPath)) {
    await replaceInDir(projectSrcPath, opts.name);
  }

  // --- Additional top-level template files ---
  const additionalFiles = ['tsconfig.json', '.env', '.env.example', '.gitignore'];
  for (const fileName of additionalFiles) {
    const templateFilePath = path.join(templatePath, fileName);
    const projectFilePath = path.join(projectPath, fileName);
    if (await fs.pathExists(templateFilePath)) {
      let content = await fs.readFile(templateFilePath, 'utf-8');
      content = content.replace(/\{\{PROJECT_NAME\}\}/g, opts.name);
      await fs.writeFile(projectFilePath, content);
      files.push(projectFilePath);
      log(`✅ Created file: ${fileName}`);
    }
  }

  // --- Compose the database axis (deps, env connection line, README setup prose) ---
  await applyDbFragments(projectPath, database, framework, opts.name);

  // --- Express-only dynamic route files (overwrite the copied static ones) ---
  if (framework === 'express') {
    const indexPath = path.join(srcPath, 'routes', 'index.ts');
    const authPath = path.join(srcPath, 'routes', 'auth.ts');
    await fs.writeFile(indexPath, indexRouteContent(opts.name));
    await fs.writeFile(authPath, authRouteContent);
    files.push(indexPath, authPath);
    log('✅ Created file: src/routes/index.ts');
    log('✅ Created file: src/routes/auth.ts');
  }

  // --- .env: inject auto-generated JWT secrets ---
  const jwtSecret = generateSecret(64);
  const jwtRefreshSecret = generateSecret(64);
  const envFilePath = path.join(projectPath, '.env');
  let envContent: string;

  if (await fs.pathExists(envFilePath)) {
    // .env was already copied from templates above — inject secrets into it
    envContent = await fs.readFile(envFilePath, 'utf-8');
    envContent = envContent.replace(/\{\{PROJECT_NAME\}\}/g, opts.name);
  } else {
    // Fallback if template .env was not copied. The DB connection line comes
    // from the db layer's env.fragment (applied just below), not hardcoded.
    envContent = `# Environment Configuration
NODE_ENV=development
PORT=8000

# Database

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
    const fallbackFragment = await loadEnvFragment(database, opts.name);
    if (fallbackFragment) envContent = applyEnvFragment(envContent, fallbackFragment);
  }

  envContent = envContent.replace(/REPLACE_WITH_AUTO_GENERATED_SECRET/, jwtSecret);
  envContent = envContent.replace(/REPLACE_WITH_AUTO_GENERATED_SECRET/, jwtRefreshSecret);
  await fs.writeFile(envFilePath, envContent);
  if (!files.includes(envFilePath)) files.push(envFilePath);
  log('✅ Created file: .env (with auto-generated JWT secrets)');

  // --- koti.config.json ---
  const kotiConfig = {
    framework,
    kotiVersion: getVersion(),
    createdAt: new Date().toISOString(),
  };
  const configPath = path.join(projectPath, 'koti.config.json');
  await fs.writeFile(configPath, JSON.stringify(kotiConfig, null, 2));
  files.push(configPath);
  log('✅ Created file: koti.config.json');

  log('\n🎉 TypeScript project created successfully!');

  // --- Dependency install (bun, then npm) — never throws ---
  if (!opts.skipInstall) {
    log('\n📦 Installing dependencies...');
    let installed = await runInstall(projectPath, 'bun', 150000, log);
    if (!installed) {
      log('⚠️  Bun install failed or timed out, trying npm install...');
      installed = await runInstall(projectPath, 'npm', 150000, log);
    }
    if (installed) {
      log('✅ Dependencies installed successfully!');
    } else {
      warnings.push('Dependencies not installed — run "bun install" (or npm install) inside the project');
    }
  }

  return { projectPath, files: [projectPath, ...files], warnings };
};
