"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
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
router.get('/', (req, res) => {
    const response = {
        success: true,
        message: 'Welcome to complete-test-project API',
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
router.get('/status', (req, res) => {
    const response = {
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
exports.default = router;
//# sourceMappingURL=index.js.map