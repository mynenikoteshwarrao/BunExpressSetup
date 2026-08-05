import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import { globTsFiles } from './helpers/glob';

const ROOT = path.resolve(__dirname, '..');
const CLI_PATH = path.join(ROOT, 'dist', 'cli.js');
const TEST_DIR = path.join(ROOT, '.test-output');

// Helper to run the CLI
const runCLI = (args: string, cwd?: string): string => {
  return execSync(`node ${CLI_PATH} ${args}`, {
    cwd: cwd || TEST_DIR,
    encoding: 'utf-8',
    timeout: 60000,
  });
};

describe('Koti CLI', () => {
  beforeAll(async () => {
    // Build the CLI first
    execSync('npm run build', { cwd: ROOT, encoding: 'utf-8' });
    await fs.ensureDir(TEST_DIR);
  });

  afterAll(async () => {
    try {
      await fs.remove(TEST_DIR);
    } catch {
      // Cleanup failure is non-critical
    }
  });

  describe('Version and Help', () => {
    it('should display version', () => {
      const output = runCLI('--version');
      expect(output.trim()).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should display help', () => {
      const output = runCLI('--help');
      expect(output).toContain('koti');
      expect(output).toContain('model');
      expect(output).toContain('enum');
      expect(output).toContain('controller');
      expect(output).toContain('service');
      expect(output).toContain('middleware');
    });
  });

  describe('Version file', () => {
    it('should have a valid version.json', () => {
      const versionPath = path.join(ROOT, 'version.json');
      expect(fs.existsSync(versionPath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
      expect(data.version).toBeDefined();
      expect(data.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should have matching versions in package.json and version.json', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
      const ver = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf-8'));
      expect(pkg.version).toBe(ver.version);
    });
  });

  describe('package.json validation', () => {
    it('should include dist/ in files array', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
      expect(pkg.files).toContain('dist/');
    });

    it('should include version.json in files array', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
      expect(pkg.files).toContain('version.json');
    });

    it('should include templates/ in files array', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
      expect(pkg.files).toContain('templates/');
    });

    it('should have bin pointing to dist/cli.js', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
      expect(pkg.bin.koti).toBe('./dist/cli.js');
    });
  });

  describe('Template files', () => {
    it('should have all required template source files', () => {
      // Templates are split into per-framework (express/elysia) + shared + db layers.
      const requiredFiles = [
        // Express framework template
        'templates/express/src/server.ts',
        'templates/express/src/config/swagger.ts',
        'templates/express/src/middleware/auth.ts',
        'templates/express/src/middleware/errorHandler.ts',
        'templates/express/src/middleware/validation.ts',
        'templates/express/src/routes/auth.ts',
        'templates/express/src/routes/index.ts',
        // Elysia framework template
        'templates/elysia/src/server.ts',
        'templates/elysia/src/middleware/auth.ts',
        'templates/elysia/src/routes/auth.ts',
        'templates/elysia/src/routes/index.ts',
        // Shared (framework-agnostic) layer
        'templates/shared/src/types/api.ts',
        'templates/shared/src/utils/AppError.ts',
        // MongoDB db layer
        'templates/db/mongodb/src/config/database.ts',
        'templates/db/mongodb/src/models/User.ts',
        'templates/db/mongodb/src/services/authService.ts',
        'templates/db/mongodb/src/seeds/seed.ts',
      ];

      for (const file of requiredFiles) {
        expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
      }
    });

    it('framework layers never import mongoose (single-axis rule)', async () => {
      for (const dir of ['templates/express/src', 'templates/elysia/src', 'templates/shared/src']) {
        const files = await globTsFiles(path.join(ROOT, dir));
        for (const f of files) {
          expect(await fs.readFile(f, 'utf8'), `${f} imports mongoose`).not.toMatch(/from 'mongoose'/);
        }
      }
    });

    it('db config exports the lifecycle contract', async () => {
      const src = await fs.readFile(path.join(ROOT, 'templates/db/mongodb/src/config/database.ts'), 'utf8');
      for (const name of ['connectDB', 'closeDB', 'isValidId']) expect(src).toContain(`export const ${name}`);
    });

    it('template server.ts should not have hardcoded version', () => {
      const content = fs.readFileSync(
        path.join(ROOT, 'templates', 'express', 'src', 'server.ts'),
        'utf-8'
      );
      // Should use getAppVersion(), not a hardcoded string
      expect(content).toContain('getAppVersion()');
      expect(content).not.toContain("version: '1.0.0'");
    });

    it('template server.ts should have graceful shutdown', () => {
      const content = fs.readFileSync(
        path.join(ROOT, 'templates', 'express', 'src', 'server.ts'),
        'utf-8'
      );
      expect(content).toContain('gracefulShutdown');
      expect(content).toContain('SIGTERM');
      expect(content).toContain('SIGINT');
    });
  });

  // Regression guards for the v3.0.1 auth/token security fixes. Behavior is
  // proven at runtime (a tampered/forged token resolves to null and a missing
  // secret throws); these assertions lock the source so the fixes can't silently
  // regress without a Mongo-backed e2e harness.
  describe('Security hardening (v3.0.1)', () => {
    const tokenUtils = () =>
      fs.readFileSync(
        path.join(ROOT, 'templates', 'shared', 'src', 'utils', 'tokenUtils.ts'),
        'utf-8'
      );
    const expressAuth = () =>
      fs.readFileSync(
        path.join(ROOT, 'templates', 'express', 'src', 'middleware', 'auth.ts'),
        'utf-8'
      );

    it('#1 express auth awaits token verification and maps userId -> id', () => {
      const c = expressAuth();
      expect(c).toMatch(/export const auth\s*=\s*async/);
      expect(c).toContain('await verifyAccessToken');
      expect(c).toContain('id: decoded.userId');
    });

    it('#2 tokenUtils reads the canonical JWT_REFRESH_SECRET env name', () => {
      const c = tokenUtils();
      expect(c).toContain('JWT_REFRESH_SECRET');
      expect(c).not.toContain('REFRESH_TOKEN_SECRET');
    });

    it('#3 tokenUtils has no hardcoded secret fallbacks and fails fast', () => {
      const c = tokenUtils();
      expect(c).not.toContain('your-super-secret-jwt-key');
      expect(c).not.toContain('your-refresh-secret');
      expect(c).toContain('Missing required environment variable');
    });

    it('#4 tokenUtils pins the JWT algorithm (HS256) on sign and verify', () => {
      const c = tokenUtils();
      expect(c).toContain("'HS256'");
      expect(c).toContain('algorithm: JWT_ALGORITHM');
      expect(c).toContain('algorithms: [JWT_ALGORITHM]');
    });
  });

  describe('README validation', () => {
    it('should not have duplicated version in install command', () => {
      const content = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8');
      // Should not have double -beta.1-beta.1
      expect(content).not.toContain('beta.1-beta.1');
    });

    it('should not claim UUID support that is not implemented', () => {
      const content = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8');
      expect(content).not.toContain('UUID Primary Keys');
      expect(content).not.toContain('uuid: UUID generation');
    });
  });

  describe('Generated code consistency', () => {
    it('CRUD generators should use toCamelCase not toLowerCase', () => {
      // generateCRUDController/generateCRUDRoutes live in crud/express.ts,
      // generateCRUDService lives in crud/service.ts (moved out of cli.ts in Task 7).
      const crudFunctions = [
        { fn: 'generateCRUDController', file: path.join(ROOT, 'src', 'generators', 'crud', 'express.ts') },
        { fn: 'generateCRUDService', file: path.join(ROOT, 'src', 'generators', 'crud', 'service.ts') },
        { fn: 'generateCRUDRoutes', file: path.join(ROOT, 'src', 'generators', 'crud', 'express.ts') },
      ];

      for (const { fn, file } of crudFunctions) {
        const content = fs.readFileSync(file, 'utf-8');
        const fnMatch = content.match(
          new RegExp(`const ${fn}[\\s\\S]*?^};`, 'm')
        );
        if (fnMatch) {
          expect(fnMatch[0]).toContain('toCamelCase(modelName)');
          expect(fnMatch[0]).not.toContain('modelName.toLowerCase()');
        }
      }
    });

    it('should auto-generate JWT secrets (not use placeholder)', () => {
      // generateSecret lives in generators/context.ts (moved out of cli.ts in Task 9);
      // createProject (generators/project.ts) imports and uses it for JWT_SECRET/JWT_REFRESH_SECRET.
      const contextContent = fs.readFileSync(path.join(ROOT, 'src', 'generators', 'context.ts'), 'utf-8');
      expect(contextContent).toContain('generateSecret');
      expect(contextContent).toContain('crypto.randomBytes');
      const projectContent = fs.readFileSync(path.join(ROOT, 'src', 'generators', 'project.ts'), 'utf-8');
      expect(projectContent).toContain('generateSecret');
    });

    it('should generate Joi validation for CRUD models', () => {
      // generateJoiValidation lives in crud/express.ts (moved out of cli.ts in Task 7).
      const expressContent = fs.readFileSync(path.join(ROOT, 'src', 'generators', 'crud', 'express.ts'), 'utf-8');
      expect(expressContent).toContain('generateJoiValidation');
      expect(expressContent).toContain("import Joi from 'joi'");
    });
  });
});
