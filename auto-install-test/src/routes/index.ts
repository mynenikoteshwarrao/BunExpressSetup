import { Router, Request, Response } from 'express';
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
    message: 'Welcome to auto-install-test API',
    data: {
      version: '1.0.0',
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

export default router;