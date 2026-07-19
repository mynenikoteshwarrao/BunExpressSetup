import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export async function makeFakeProject(framework: 'express' | 'elysia'): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'koti-test-'));
  await fs.writeJson(path.join(root, 'package.json'), {
    name: 'fake-project',
    version: '1.0.0',
    dependencies: {
      mongoose: '^8.0.0',
      ...(framework === 'express' ? { express: '^4.18.0' } : { elysia: '^1.0.0' }),
    },
    scripts: { seed: 'node -e "console.log(\'seeded\')"', 'seed:roles': 'node -e "console.log(\'roles-seeded\')"' },
  });
  await fs.writeJson(path.join(root, 'koti.config.json'), {
    framework, kotiVersion: '3.1.0', createdAt: '2026-07-19T00:00:00.000Z',
  });
  for (const d of ['models', 'controllers', 'services', 'middleware', 'routes', 'enums', 'validators']) {
    await fs.ensureDir(path.join(root, 'src', d));
  }
  if (framework === 'express') {
    await fs.writeFile(path.join(root, 'src', 'routes', 'index.ts'),
`import { Router } from 'express';
import authRoutes from './auth';

const router = Router();

router.use('/auth', authRoutes);

export default router;
`);
  } else {
    await fs.writeFile(path.join(root, 'src', 'routes', 'index.ts'),
`import { Elysia } from 'elysia';
import { authRoutes } from './auth';

export const apiRoutes = new Elysia()
  .use(authRoutes);

export default apiRoutes;
`);
  }
  await fs.writeFile(path.join(root, 'src', 'enums', 'Task.ts'),
`export enum Task {
  /** View users */
  VIEW_USERS = 'VIEW_USERS',
}

export const TaskDescriptions: Record<Task, string> = {
  [Task.VIEW_USERS]: 'View users',
};
`);
  return root;
}
