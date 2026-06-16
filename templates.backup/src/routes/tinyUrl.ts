import { Router } from 'express';
import tinyUrlController from '../controllers/tinyUrlController';

const router = Router();

/**
 * @swagger
 * /api/tiny/shorten:
 *   post:
 *     summary: Shorten a URL
 *     tags: [TinyURL]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originalUrl
 *             properties:
 *               originalUrl:
 *                 type: string
 *                 format: uri
 *                 description: The original URL to shorten
 *     responses:
 *       201:
 *         description: URL shortened successfully
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
 *                     shortUrl:
 *                       type: string
 *                     originalUrl:
 *                       type: string
 *       400:
 *         description: Validation error
 */
router.post('/shorten', tinyUrlController.shortenUrl);

/**
 * @swagger
 * /api/tiny/redirect/{id}:
 *   post:
 *     summary: Get original URL from shortened ID
 *     tags: [TinyURL]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The short URL ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shortUrl:
 *                 type: string
 *                 description: The complete short URL (optional)
 *     responses:
 *       200:
 *         description: Original URL found
 *       404:
 *         description: URL not found
 */
router.post('/redirect/:id', tinyUrlController.redirectUrl);

/**
 * @swagger
 * /api/tiny/{id}:
 *   get:
 *     summary: Get URL information by short ID
 *     tags: [TinyURL]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The short URL ID
 *     responses:
 *       200:
 *         description: URL information retrieved successfully
 *       404:
 *         description: URL not found
 */
router.get('/:id', tinyUrlController.getUrl);

export default router;