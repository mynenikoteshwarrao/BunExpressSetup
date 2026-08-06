import 'dotenv/config';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { rateLimit } from 'elysia-rate-limit';

import { connectDB, closeDB } from './config/database';
import { errorHandlerPlugin } from './middleware/errorHandler';
import { swaggerPlugin, SWAGGER_PATH } from './config/swagger';
import { apiRoutes } from './routes/index';

const PORT = parseInt(process.env.PORT || '8000');

// Connect to MongoDB before serving traffic.
await connectDB();

const app = new Elysia()
  // Global error handler — must be registered with as:'global' (in the plugin)
  // so it also catches errors thrown by routes mounted from other files.
  .use(errorHandlerPlugin)
  // CORS (security headers like helmet's are a separate concern — see note below).
  .use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5000',
      credentials: true
    })
  )
  // Minimal security headers (helmet has no 1:1 Elysia plugin; reproduce the
  // essentials so behavior is closer to the Express `helmet()` defaults).
  .onAfterHandle(({ set }) => {
    set.headers['x-content-type-options'] = 'nosniff';
    set.headers['x-frame-options'] = 'SAMEORIGIN';
    set.headers['x-dns-prefetch-control'] = 'off';
  })
  // Swagger UI at /docs/api (+ alias/redirect routes below for Express parity).
  .use(swaggerPlugin())
  .get('/api-docs', ({ redirect }) => redirect(SWAGGER_PATH))
  .get('/docs', ({ redirect }) => redirect(SWAGGER_PATH))
  .get('/docs/api.json', ({ redirect }) => redirect(`${SWAGGER_PATH}/json`))
  .get('/api-docs.json', ({ redirect }) => redirect(`${SWAGGER_PATH}/json`))
  // Top-level health check (Express exposes both /health and /api/health).
  .get('/health', () => ({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  }))
  // All API routes under /api, rate-limited (parity: Express scopes the limiter
  // to /api/ only — 100 req / 15 min, keyed by client IP under Bun).
  // Note: the Express server redundantly double-mounts auth at /api/auth; that
  // quirk is intentionally dropped — auth is reachable at /api/auth via the
  // index router, so the public URLs are identical.
  .group('/api', (api) =>
    api
      .use(
        rateLimit({
          duration: 15 * 60 * 1000,
          max: 100,
          errorResponse: 'Too many requests from this IP, please try again later.',
          generator: (request, server) =>
            server?.requestIP(request)?.address ??
            request.headers.get('x-forwarded-for') ??
            'unknown'
        })
      )
      .use(apiRoutes)
  )
  .listen({ port: PORT, hostname: '0.0.0.0' });

console.log(`🚀 Server running on port ${PORT}`);
console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📚 API Documentation: http://localhost:${PORT}${SWAGGER_PATH}`);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try {
    await app.stop();
    await closeDB();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error during shutdown:', err);
  }
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
