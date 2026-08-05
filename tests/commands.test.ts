import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync, spawn } from 'child_process';

const ROOT = path.resolve(__dirname, '..');
const CLI_PATH = path.join(ROOT, 'dist', 'cli.js');
const TEST_DIR = path.join(ROOT, '.test-commands');

/**
 * Helper to run a non-interactive CLI command.
 * Captures both stdout and stderr (readline writes prompts to stderr when stdin is piped).
 */
const runCLI = (args: string, cwd?: string, timeout = 120000): string => {
  try {
    const result = execSync(`node ${CLI_PATH} ${args} 2>&1`, {
      cwd: cwd || TEST_DIR,
      encoding: 'utf-8',
      timeout,
    });
    return result;
  } catch (error: any) {
    // Re-throw but include stdout+stderr in the error
    if (error.stdout || error.stderr) {
      error.output = (error.stdout || '') + (error.stderr || '');
    }
    throw error;
  }
};

/**
 * Helper to run an interactive CLI command using spawn with line-by-line stdin writing.
 * Readline requires stdin to remain open while processing, so we write lines with small delays
 * rather than piping all input at once (which causes readline to close prematurely).
 */
const runInteractiveCLI = (
  args: string,
  inputLines: string[],
  cwd?: string,
  timeout = 30000
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const argParts = args.split(' ');
    const child = spawn('node', [CLI_PATH, ...argParts], {
      cwd: cwd || TEST_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (d: Buffer) => { output += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { output += d.toString(); });

    // Write lines one at a time with delays so readline can process each
    let lineIndex = 0;
    const writeLine = () => {
      if (lineIndex < inputLines.length) {
        child.stdin.write(inputLines[lineIndex] + '\n');
        lineIndex++;
        setTimeout(writeLine, 100);
      } else {
        // All lines written; end stdin after a short delay
        setTimeout(() => child.stdin.end(), 200);
      }
    };
    setTimeout(writeLine, 300);

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Interactive CLI timed out after ${timeout}ms. Output so far:\n${output}`));
    }, timeout);

    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve(output);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
};

describe('Koti CLI Commands Integration', () => {
  beforeAll(async () => {
    // Build the CLI
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

  // ─── koti new ───────────────────────────────────────────────────────
  describe('koti new', () => {
    const projectName = 'test-app';
    const projectDir = path.join(TEST_DIR, projectName);

    afterAll(async () => {
      try { await fs.remove(projectDir); } catch {}
    });

    it('should create a new project directory', () => {
      // This may take a while due to npm install; the command may exit non-zero
      // if bun is not available, so we catch and check output anyway
      let output = '';
      try {
        output = runCLI(`new ${projectName}`, undefined, 180000);
      } catch (error: any) {
        // execSync throws on non-zero exit but the project may still have been created
        output = error.stdout || error.stderr || '';
      }
      expect(fs.existsSync(projectDir)).toBe(true);
    }, 200000);

    it('should create all required src subdirectories', () => {
      const expectedDirs = [
        'config', 'controllers', 'middleware', 'models',
        'routes', 'types', 'utils', 'services', 'schemas', 'enums', 'validators'
      ];
      for (const dir of expectedDirs) {
        expect(fs.existsSync(path.join(projectDir, 'src', dir))).toBe(true);
      }
    });

    it('should create package.json with project name', () => {
      const pkgPath = path.join(projectDir, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(pkg.name).toBe(projectName);
    });

    it('should create .env file with auto-generated JWT secrets', () => {
      const envPath = path.join(projectDir, '.env');
      expect(fs.existsSync(envPath)).toBe(true);
      const envContent = fs.readFileSync(envPath, 'utf-8');
      expect(envContent).toContain('JWT_SECRET');
      expect(envContent).toContain('JWT_REFRESH_SECRET');
      // Should NOT have placeholder text; should have a real hex secret
      expect(envContent).not.toContain('your-super-secret');
    });

    it('should copy template source files', () => {
      const expectedFiles = [
        'src/server.ts',
        'src/config/database.ts',
        'src/config/swagger.ts',
        'src/middleware/auth.ts',
        'src/middleware/errorHandler.ts',
        'src/middleware/validation.ts',
        'src/models/User.ts',
        'src/services/authService.ts',
        'src/types/api.ts',
        'src/utils/AppError.ts',
        'src/routes/auth.ts',
        'src/routes/index.ts',
      ];
      for (const file of expectedFiles) {
        expect(fs.existsSync(path.join(projectDir, file))).toBe(true);
      }
    });

    it('should replace {{PROJECT_NAME}} in template files', () => {
      const serverContent = fs.readFileSync(path.join(projectDir, 'src', 'server.ts'), 'utf-8');
      expect(serverContent).not.toContain('{{PROJECT_NAME}}');
    });

    it('should create tsconfig.json', () => {
      expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(true);
    });

    it('should create .gitignore', () => {
      expect(fs.existsSync(path.join(projectDir, '.gitignore'))).toBe(true);
    });
  });

  // ─── koti controller ───────────────────────────────────────────────
  describe('koti controller', () => {
    const projectDir = path.join(TEST_DIR, 'ctrl-test');

    beforeAll(async () => {
      await fs.ensureDir(path.join(projectDir, 'src', 'controllers'));
      // The controller command now validates it's running inside a Koti project.
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        name: 'ctrl-test', version: '1.0.0',
        dependencies: { express: '^4.18.0', mongoose: '^8.0.0' },
      });
      await fs.writeJson(path.join(projectDir, 'koti.config.json'), { framework: 'express' });
    });

    afterAll(async () => {
      try { await fs.remove(projectDir); } catch {}
    });

    it('should generate a controller file', () => {
      const output = runCLI('controller Product', projectDir);
      expect(output).toContain('Created TypeScript controller');

      const filePath = path.join(projectDir, 'src', 'controllers', 'productController.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('controller file should contain valid TypeScript exports', () => {
      const filePath = path.join(projectDir, 'src', 'controllers', 'productController.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('import');
      expect(content).toContain('Request');
      expect(content).toContain('Response');
      expect(content).toContain('export');
    });

    it('should use camelCase naming (not lowercase)', () => {
      runCLI('controller UserProfile', projectDir);
      const filePath = path.join(projectDir, 'src', 'controllers', 'userProfileController.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  // ─── koti service ──────────────────────────────────────────────────
  describe('koti service', () => {
    const projectDir = path.join(TEST_DIR, 'svc-test');

    beforeAll(async () => {
      await fs.ensureDir(path.join(projectDir, 'src', 'services'));
      // The service command now validates it's running inside a Koti project.
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        name: 'svc-test', version: '1.0.0',
        dependencies: { express: '^4.18.0', mongoose: '^8.0.0' },
      });
      await fs.writeJson(path.join(projectDir, 'koti.config.json'), { framework: 'express' });
    });

    afterAll(async () => {
      try { await fs.remove(projectDir); } catch {}
    });

    it('should generate a service file', () => {
      const output = runCLI('service Order', projectDir);
      expect(output).toContain('Created TypeScript service');

      const filePath = path.join(projectDir, 'src', 'services', 'orderService.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('service file should contain valid TypeScript exports', () => {
      const filePath = path.join(projectDir, 'src', 'services', 'orderService.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('import');
      expect(content).toContain('export');
    });

    it('should use camelCase naming', () => {
      runCLI('service PaymentGateway', projectDir);
      const filePath = path.join(projectDir, 'src', 'services', 'paymentGatewayService.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  // ─── koti middleware ───────────────────────────────────────────────
  describe('koti middleware', () => {
    const projectDir = path.join(TEST_DIR, 'mw-test');

    beforeAll(async () => {
      await fs.ensureDir(path.join(projectDir, 'src', 'middleware'));
      // The middleware command now validates it's running inside a Koti project.
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        name: 'mw-test', version: '1.0.0',
        dependencies: { express: '^4.18.0', mongoose: '^8.0.0' },
      });
      await fs.writeJson(path.join(projectDir, 'koti.config.json'), { framework: 'express' });
    });

    afterAll(async () => {
      try { await fs.remove(projectDir); } catch {}
    });

    it('should generate a middleware file', () => {
      const output = runCLI('middleware RateLimit', projectDir);
      expect(output).toContain('Created TypeScript middleware');

      const filePath = path.join(projectDir, 'src', 'middleware', 'rateLimit.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('middleware file should contain Express middleware signature', () => {
      const filePath = path.join(projectDir, 'src', 'middleware', 'rateLimit.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('Request');
      expect(content).toContain('Response');
      expect(content).toContain('NextFunction');
      expect(content).toContain('export');
    });

    it('should use camelCase naming', () => {
      runCLI('middleware RequestLogger', projectDir);
      const filePath = path.join(projectDir, 'src', 'middleware', 'requestLogger.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  // ─── koti model (interactive, no CRUD) ─────────────────────────────
  describe('koti model (without CRUD)', () => {
    const projectDir = path.join(TEST_DIR, 'model-test');

    beforeAll(async () => {
      await fs.ensureDir(path.join(projectDir, 'src', 'models'));
      // The model command now validates it's running inside a Koti project.
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        name: 'model-test', version: '1.0.0',
        dependencies: { express: '^4.18.0', mongoose: '^8.0.0' },
      });
      await fs.writeJson(path.join(projectDir, 'koti.config.json'), { framework: 'express' });
    });

    afterAll(async () => {
      try { await fs.remove(projectDir); } catch {}
    });

    it('should create a model with interactive prompts', async () => {
      const input = [
        'title',     // field name
        '1',         // type: String
        'y',         // required
        'n',         // unique
        'n',         // indexed
        '',          // default (skip)
        'done',      // finish adding fields
        'n',         // no CRUD
      ];

      const output = await runInteractiveCLI('model Blog', input, projectDir);
      expect(output).toContain('Added field: title');
      expect(output).toContain('Model created successfully');

      const modelPath = path.join(projectDir, 'src', 'models', 'Blog.ts');
      expect(fs.existsSync(modelPath)).toBe(true);
    });

    it('generated model should contain the field and Mongoose schema', () => {
      const content = fs.readFileSync(
        path.join(projectDir, 'src', 'models', 'Blog.ts'),
        'utf-8'
      );
      expect(content).toContain('title');
      expect(content).toContain('String');
      expect(content).toContain('Schema');
      expect(content).toContain('mongoose');
    });

    it('should handle multiple fields', async () => {
      const input = [
        'name',      // field 1
        '1',         // String
        'y',         // required
        'n',         // unique
        'n',         // indexed
        '',          // default
        'age',       // field 2
        '2',         // Number
        'n',         // not required
        'n',         // unique
        'n',         // indexed
        '',          // default
        'isActive',  // field 3
        '4',         // Boolean
        'n',         // not required
        'n',         // unique
        'n',         // indexed
        'true',      // default = true
        'done',      // finish
        'n',         // no CRUD
      ];

      const output = await runInteractiveCLI('model Customer', input, projectDir);
      expect(output).toContain('Added field: name');
      expect(output).toContain('Added field: age');
      expect(output).toContain('Added field: isActive');

      const content = fs.readFileSync(
        path.join(projectDir, 'src', 'models', 'Customer.ts'),
        'utf-8'
      );
      expect(content).toContain('name');
      expect(content).toContain('age');
      expect(content).toContain('isActive');
      expect(content).toContain('Boolean');
    });
  });

  // ─── koti model (with CRUD) ───────────────────────────────────────
  describe('koti model (with CRUD)', () => {
    const projectDir = path.join(TEST_DIR, 'crud-test');

    beforeAll(async () => {
      await fs.ensureDir(path.join(projectDir, 'src', 'models'));
      await fs.ensureDir(path.join(projectDir, 'src', 'controllers'));
      await fs.ensureDir(path.join(projectDir, 'src', 'services'));
      await fs.ensureDir(path.join(projectDir, 'src', 'routes'));
      await fs.ensureDir(path.join(projectDir, 'src', 'validators'));
      // The model command now validates it's running inside a Koti project.
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        name: 'crud-test', version: '1.0.0',
        dependencies: { express: '^4.18.0', mongoose: '^8.0.0' },
      });
      await fs.writeJson(path.join(projectDir, 'koti.config.json'), { framework: 'express' });

      // Create a minimal routes/index.ts with an existing router.use(...Routes) line so
      // registerRouteInIndex (src/generators/model.ts) can locate where to splice the new route.
      await fs.writeFile(
        path.join(projectDir, 'src', 'routes', 'index.ts'),
        `import { Router } from 'express';\nimport authRoutes from './auth';\n\nconst router = Router();\n\nrouter.use('/auth', authRoutes);\n\nexport default router;\n`
      );
    });

    afterAll(async () => {
      try { await fs.remove(projectDir); } catch {}
    });

    it('should generate model + CRUD files when user answers y', async () => {
      const input = [
        'title',     // field name
        '1',         // String
        'y',         // required
        'n',         // unique
        'n',         // indexed
        '',          // default
        'price',     // field 2
        '2',         // Number
        'y',         // required
        'n',         // unique
        'n',         // indexed
        '',          // default
        'done',      // finish fields
        'y',         // YES generate CRUD
        'n',         // NO tasks (no Task.ts in test dir)
      ];

      const output = await runInteractiveCLI('model Product', input, projectDir);
      expect(output).toContain('Created Mongoose model');   // 'Drizzle model' on a postgres project
      expect(output).toContain('Created TypeScript controller');
      expect(output).toContain('Created TypeScript service');
      expect(output).toContain('Created TypeScript routes');
      expect(output).toContain('Created Joi validation');
    });

    it('should create all CRUD files with correct names', () => {
      expect(fs.existsSync(path.join(projectDir, 'src', 'models', 'Product.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'controllers', 'productController.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'services', 'productService.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'routes', 'product.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'validators', 'product.ts'))).toBe(true);
    });

    it('CRUD controller should reference the model name', () => {
      const content = fs.readFileSync(
        path.join(projectDir, 'src', 'controllers', 'productController.ts'),
        'utf-8'
      );
      expect(content).toContain('Product');
      expect(content).toContain('import');
    });

    it('CRUD service should reference the model', () => {
      const content = fs.readFileSync(
        path.join(projectDir, 'src', 'services', 'productService.ts'),
        'utf-8'
      );
      expect(content).toContain('Product');
    });

    it('CRUD routes should contain REST endpoints', () => {
      const content = fs.readFileSync(
        path.join(projectDir, 'src', 'routes', 'product.ts'),
        'utf-8'
      );
      expect(content).toContain('router.get');
      expect(content).toContain('router.post');
      expect(content).toContain('router.put');
      expect(content).toContain('router.delete');
    });

    it('Joi validation file should contain schemas', () => {
      const content = fs.readFileSync(
        path.join(projectDir, 'src', 'validators', 'product.ts'),
        'utf-8'
      );
      expect(content).toContain('Joi');
      expect(content).toContain('title');
      expect(content).toContain('price');
    });

    it('routes/index.ts should be updated with the new route', () => {
      const content = fs.readFileSync(
        path.join(projectDir, 'src', 'routes', 'index.ts'),
        'utf-8'
      );
      expect(content).toContain('product');
    });
  });

  // ─── koti enum (interactive) ──────────────────────────────────────
  describe('koti enum', () => {
    const projectDir = path.join(TEST_DIR, 'enum-test');

    beforeAll(async () => {
      await fs.ensureDir(path.join(projectDir, 'src', 'enums'));
      // The enum command now validates it's running inside a Koti project.
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        name: 'enum-test', version: '1.0.0',
        dependencies: { express: '^4.18.0', mongoose: '^8.0.0' },
      });
      await fs.writeJson(path.join(projectDir, 'koti.config.json'), { framework: 'express' });
    });

    afterAll(async () => {
      try { await fs.remove(projectDir); } catch {}
    });

    it('should create a string enum', async () => {
      const input = [
        'string',       // enum type
        'ACTIVE',       // key 1
        'active',       // value 1
        'INACTIVE',     // key 2
        'inactive',     // value 2
        'done',         // finish
      ];

      const output = await runInteractiveCLI('enum Status', input, projectDir);
      expect(output).toContain('Added: ACTIVE');
      expect(output).toContain('Added: INACTIVE');
      expect(output).toContain('Created TypeScript enum');

      const enumPath = path.join(projectDir, 'src', 'enums', 'Status.ts');
      expect(fs.existsSync(enumPath)).toBe(true);

      const content = fs.readFileSync(enumPath, 'utf-8');
      expect(content).toContain('ACTIVE');
      expect(content).toContain('INACTIVE');
    });

    it('should create a number enum', async () => {
      const input = [
        'number',       // enum type
        'LOW',          // key 1
        '1',            // value 1
        'MEDIUM',       // key 2
        '2',            // value 2
        'HIGH',         // key 3
        '3',            // value 3
        'done',         // finish
      ];

      const output = await runInteractiveCLI('enum Priority', input, projectDir);
      expect(output).toContain('Created TypeScript enum');

      const content = fs.readFileSync(
        path.join(projectDir, 'src', 'enums', 'Priority.ts'),
        'utf-8'
      );
      expect(content).toContain('LOW');
      expect(content).toContain('MEDIUM');
      expect(content).toContain('HIGH');
    });
  });

  // ─── koti model:edit (interactive) ────────────────────────────────
  describe('koti model:edit', () => {
    const projectDir = path.join(TEST_DIR, 'edit-test');

    beforeAll(async () => {
      // Create project structure
      await fs.ensureDir(path.join(projectDir, 'src', 'models'));
      await fs.ensureDir(path.join(projectDir, 'src', 'controllers'));
      await fs.ensureDir(path.join(projectDir, 'src', 'services'));
      await fs.ensureDir(path.join(projectDir, 'src', 'routes'));
      await fs.ensureDir(path.join(projectDir, 'src', 'validators'));
      // The model command (used below to seed the Person model) now validates it's
      // running inside a Koti project.
      await fs.writeJson(path.join(projectDir, 'package.json'), {
        name: 'edit-test', version: '1.0.0',
        dependencies: { express: '^4.18.0', mongoose: '^8.0.0' },
      });
      await fs.writeJson(path.join(projectDir, 'koti.config.json'), { framework: 'express' });

      // Create routes/index.ts
      await fs.writeFile(
        path.join(projectDir, 'src', 'routes', 'index.ts'),
        `import { Router } from 'express';\nconst router = Router();\nexport default router;\n`
      );

      // First, create a model with CRUD using the CLI
      const input = [
        'name',      // field
        '1',         // String
        'y',         // required
        'n',         // unique
        'n',         // indexed
        '',          // default
        'email',     // field 2
        '1',         // String
        'y',         // required
        'y',         // unique
        'n',         // indexed
        '',          // default
        'done',      // finish
        'y',         // generate CRUD
        'n',         // NO tasks
      ];
      await runInteractiveCLI('model Person', input, projectDir);
    }, 30000);

    afterAll(async () => {
      try { await fs.remove(projectDir); } catch {}
    });

    it('should detect existing model and add a field', async () => {
      const input = [
        '1',            // action: add field
        'phone',        // field name
        '1',            // String type
        'n',            // not required
        'n',            // not unique
        'n',            // no index
        '',             // no default
        '3',            // action: save
        'y',            // update CRUD
      ];

      const output = await runInteractiveCLI('model:edit Person', input, projectDir);
      expect(output).toContain('Found model: Person');
      expect(output).toContain('name');
      expect(output).toContain('email');
      expect(output).toContain('Added field: phone');
      expect(output).toContain('Saving changes');
    });

    it('should update the model file with the new field', () => {
      const content = fs.readFileSync(
        path.join(projectDir, 'src', 'models', 'Person.ts'),
        'utf-8'
      );
      expect(content).toContain('phone');
      expect(content).toContain('name');
      expect(content).toContain('email');
    });

    it('should create .bak backup files for CRUD', () => {
      const bakPath = path.join(projectDir, 'src', 'controllers', 'personController.ts.bak');
      expect(fs.existsSync(bakPath)).toBe(true);
    });

    it('model:edit should fail gracefully for non-existent model', async () => {
      const input = ['4']; // Cancel immediately
      const output = await runInteractiveCLI('model:edit NonExistent', input, projectDir);
      expect(output).toContain('not found');
    });

    it('should allow deleting a field', async () => {
      const input = [
        '2',            // action: delete field
        '3',            // delete field #3 (phone)
        '3',            // action: save
        'y',            // update CRUD
      ];

      const output = await runInteractiveCLI('model:edit Person', input, projectDir);
      expect(output).toContain('Deleted field');
      expect(output).toContain('Saving changes');

      const content = fs.readFileSync(
        path.join(projectDir, 'src', 'models', 'Person.ts'),
        'utf-8'
      );
      expect(content).not.toContain('phone');
    });

    it('should detect no changes and report accordingly', async () => {
      const input = [
        '3',            // action: save immediately (no changes)
      ];

      const output = await runInteractiveCLI('model:edit Person', input, projectDir);
      expect(output).toContain('No changes detected');
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────
  describe('Edge cases', () => {
    it('should show error for unknown command', () => {
      try {
        runCLI('unknowncommand');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
      }
    });

    it('controller command should fail without name argument', () => {
      try {
        runCLI('controller');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
      }
    });

    it('service command should fail without name argument', () => {
      try {
        runCLI('service');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
      }
    });

    it('middleware command should fail without name argument', () => {
      try {
        runCLI('middleware');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
      }
    });
  });
});
