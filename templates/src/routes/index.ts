import { Router } from 'express';
import authRoutes from './auth';
import tinyUrlRoutes from './tinyUrl';
import documentRoutes from './document';
import auditRoutes from './audit';


const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                     uptime:
 *                       type: number
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '{{PROJECT_NAME}} API is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    }
  });
});

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API information
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to {{PROJECT_NAME}} API',
    data: {
      name: '{{PROJECT_NAME}}',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      documentation: '/docs/api',
      endpoints: {
        auth: '/api/auth',
        tinyUrl: '/api/tiny',
        documents: '/api/documents',
        health: '/api/health'
      }
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/tiny', tinyUrlRoutes);
router.use('/documents', documentRoutes);
router.use('/audit', auditRoutes);

export default router;