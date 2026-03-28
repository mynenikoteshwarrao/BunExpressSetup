import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';

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
      const requiredFiles = [
        'templates/src/server.ts',
        'templates/src/config/database.ts',
        'templates/src/config/swagger.ts',
        'templates/src/middleware/auth.ts',
        'templates/src/middleware/errorHandler.ts',
        'templates/src/middleware/validation.ts',
        'templates/src/models/User.ts',
        'templates/src/services/authService.ts',
        'templates/src/types/api.ts',
        'templates/src/utils/AppError.ts',
        'templates/src/routes/auth.ts',
        'templates/src/routes/index.ts',
      ];

      for (const file of requiredFiles) {
        expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
      }
    });

    it('template server.ts should not have hardcoded version', () => {
      const content = fs.readFileSync(
        path.join(ROOT, 'templates', 'src', 'server.ts'),
        'utf-8'
      );
      // Should use getAppVersion(), not a hardcoded string
      expect(content).toContain('getAppVersion()');
      expect(content).not.toContain("version: '1.0.0'");
    });

    it('template server.ts should have graceful shutdown', () => {
      const content = fs.readFileSync(
        path.join(ROOT, 'templates', 'src', 'server.ts'),
        'utf-8'
      );
      expect(content).toContain('gracefulShutdown');
      expect(content).toContain('SIGTERM');
      expect(content).toContain('SIGINT');
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
      const cliContent = fs.readFileSync(path.join(ROOT, 'src', 'cli.ts'), 'utf-8');

      // Find all generateCRUD* function bodies and check they use toCamelCase
      const crudFunctions = [
        'generateCRUDController',
        'generateCRUDService',
        'generateCRUDRoutes',
      ];

      for (const fn of crudFunctions) {
        const fnMatch = cliContent.match(
          new RegExp(`const ${fn}[\\s\\S]*?^};`, 'm')
        );
        if (fnMatch) {
          expect(fnMatch[0]).toContain('toCamelCase(modelName)');
          expect(fnMatch[0]).not.toContain('modelName.toLowerCase()');
        }
      }
    });

    it('should auto-generate JWT secrets (not use placeholder)', () => {
      const cliContent = fs.readFileSync(path.join(ROOT, 'src', 'cli.ts'), 'utf-8');
      expect(cliContent).toContain('generateSecret');
      expect(cliContent).toContain('crypto.randomBytes');
    });

    it('should generate Joi validation for CRUD models', () => {
      const cliContent = fs.readFileSync(path.join(ROOT, 'src', 'cli.ts'), 'utf-8');
      expect(cliContent).toContain('generateJoiValidation');
      expect(cliContent).toContain("import Joi from 'joi'");
    });
  });
});
