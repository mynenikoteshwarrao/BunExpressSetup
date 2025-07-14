import { Router } from 'express';
import auditController from '../controllers/auditController';
import { auth } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/audit/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get audit history for a specific entity
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *         description: Type of entity (e.g., User, Document)
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the entity
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Audit history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid entity ID
 */
router.get('/entity/:entityType/:entityId', auth, auditController.getEntityHistory);

/**
 * @swagger
 * /api/audit/my-history:
 *   get:
 *     summary: Get current user's audit history
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: User audit history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my-history', auth, auditController.getMyHistory);

/**
 * @swagger
 * /api/audit/stats:
 *   get:
 *     summary: Get audit statistics
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filter by entity type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Audit statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', auth, auditController.getAuditStats);

export default router;