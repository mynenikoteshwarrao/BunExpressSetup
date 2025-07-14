import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api';
export declare class UserController {
    /**
     * Get all Users with pagination
     * @route GET /api/user
     */
    getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get single User by ID
     * @route GET /api/user/:id
     */
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Create new User
     * @route POST /api/user
     */
    create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Update User by ID
     * @route PUT /api/user/:id
     */
    update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Delete User by ID
     * @route DELETE /api/user/:id
     */
    delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: UserController;
export default _default;
