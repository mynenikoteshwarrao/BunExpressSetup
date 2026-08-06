import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { makeFakeProject } from '../helpers/fakeProject';
import { createController } from '../../src/generators/controller';
import { createService } from '../../src/generators/service';
import { createMiddleware } from '../../src/generators/middleware';

const roots: string[] = [];
afterEach(async () => { while (roots.length) await fs.remove(roots.pop()!); });

describe('createController', () => {
  it('generates an Express class controller in an express project', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    const result = await createController({ projectRoot: root, name: 'Payment' });
    const file = path.join(root, 'src', 'controllers', 'paymentController.ts');
    expect(result.files).toContain(file);
    const content = await fs.readFile(file, 'utf-8');
    expect(content).toContain(`from 'express'`);
    expect(content).toContain('export class PaymentController');
    expect(content).toContain('export default new PaymentController()');
    const barrel = await fs.readFile(path.join(root, 'src', 'controllers', 'index.ts'), 'utf-8');
    expect(barrel).toContain(`export { default as paymentController } from './paymentController';`);
  });
  it('generates an Elysia object-literal controller in an elysia project', async () => {
    const root = await makeFakeProject('elysia'); roots.push(root);
    await createController({ projectRoot: root, name: 'Payment' });
    const content = await fs.readFile(path.join(root, 'src', 'controllers', 'paymentController.ts'), 'utf-8');
    expect(content).not.toContain(`from 'express'`);
    expect(content).toContain('export const paymentController = {');
    expect(content).toContain(`from '../utils/respond'`);
  });
  it('rejects non-PascalCase names', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await expect(createController({ projectRoot: root, name: 'bad name' }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('throws DUPLICATE if the controller exists', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    await createController({ projectRoot: root, name: 'Payment' });
    await expect(createController({ projectRoot: root, name: 'Payment' }))
      .rejects.toMatchObject({ code: 'DUPLICATE' });
  });
});

describe('createService', () => {
  it('generates the framework-neutral service stub for both frameworks', async () => {
    for (const fw of ['express', 'elysia'] as const) {
      const root = await makeFakeProject(fw); roots.push(root);
      const result = await createService({ projectRoot: root, name: 'Billing' });
      const file = path.join(root, 'src', 'services', 'billingService.ts');
      expect(result.files).toContain(file);
      const content = await fs.readFile(file, 'utf-8');
      expect(content).toContain('export class BillingService');
      expect(content).not.toContain(`from 'express'`);
    }
  });
});

describe('createMiddleware', () => {
  it('generates Express middleware in an express project', async () => {
    const root = await makeFakeProject('express'); roots.push(root);
    const result = await createMiddleware({ projectRoot: root, name: 'RateLimiter' });
    const file = path.join(root, 'src', 'middleware', 'rateLimiter.ts');
    expect(result.files).toContain(file);
    const content = await fs.readFile(file, 'utf-8');
    expect(content).toContain('NextFunction');
  });
  it('generates an Elysia plugin in an elysia project', async () => {
    const root = await makeFakeProject('elysia'); roots.push(root);
    await createMiddleware({ projectRoot: root, name: 'RateLimiter' });
    const content = await fs.readFile(path.join(root, 'src', 'middleware', 'rateLimiter.ts'), 'utf-8');
    expect(content).toContain(`new Elysia({ name: 'rateLimiter' })`);
    expect(content).not.toContain('NextFunction');
  });
});
