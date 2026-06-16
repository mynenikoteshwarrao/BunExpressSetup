import { Elysia } from 'elysia';
import { authRoutes } from './auth';
import { userRoutes } from './user';
import { tinyUrlRoutes } from './tinyUrl';
import { documentRoutes } from './document';
import { auditRoutes } from './audit';

/**
 * API index — mounts all resource routers under `/api` and exposes the
 * health + welcome endpoints (parity with the Express routes/index.ts).
 * Additional resource routers (users, tiny, documents, audit) are mounted here
 * as they are added.
 */
export const apiRoutes = new Elysia()
  .get(
    '/health',
    () => ({
      success: true,
      message: '{{PROJECT_NAME}} API is running',
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      }
    }),
    { detail: { tags: ['System'], summary: 'Health check endpoint' } }
  )
  .get(
    '/',
    () => ({
      success: true,
      message: 'Welcome to {{PROJECT_NAME}} API',
      data: {
        name: '{{PROJECT_NAME}}',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        documentation: '/docs/api',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          tinyUrl: '/api/tiny',
          documents: '/api/documents',
          audit: '/api/audit',
          health: '/api/health'
        }
      }
    }),
    { detail: { tags: ['System'], summary: 'API information' } }
  )
  .use(authRoutes)
  .use(userRoutes)
  .use(tinyUrlRoutes)
  .use(documentRoutes)
  .use(auditRoutes);

export default apiRoutes;
