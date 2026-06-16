import { Router } from 'express';
import userController from '../controllers/userController';
import { auth } from '../middleware/auth';
import { checkPermission } from '../middleware/checkPermission';
import { Task } from '../enums/Task';

const router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get paginated list of users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: List of users with pagination
 */
router.get('/', auth, checkPermission(Task.VIEW_USERS), userController.getAll);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id', auth, checkPermission(Task.VIEW_USERS), userController.getById);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               roles: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: User created
 */
router.post('/', auth, checkPermission(Task.CREATE_USER), userController.create);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update an existing user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               email: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/:id', auth, checkPermission(Task.UPDATE_USER), userController.update);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Soft-delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/:id', auth, checkPermission(Task.DELETE_USER), userController.delete);

/**
 * @swagger
 * /api/users/{id}/roles:
 *   put:
 *     summary: Assign roles to a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roles]
 *             properties:
 *               roles:
 *                 type: array
 *                 items: { type: string }
 *                 description: Array of role IDs
 *     responses:
 *       200:
 *         description: Roles assigned
 */
router.put('/:id/roles', auth, checkPermission(Task.MANAGE_USER_ROLES), userController.assignRoles);

export default router;
