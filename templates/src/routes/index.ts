import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome message
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Welcome message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to {{PROJECT_NAME}} API',
    data: {
      version: '1.0.6',
      timestamp: new Date().toISOString(),
      documentation: '/api-docs'
    }
  });
});

/**
 * @swagger
 * /status:
 *   get:
 *     summary: API status information
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'API is operational',
    data: {
      status: 'operational',
      database: 'connected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

export default router;