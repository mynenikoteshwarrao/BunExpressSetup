import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, LoginRequest, RegisterRequest } from '../types/api';
declare class AuthController {
    /**
     * Register new user
     */
    register(req: Request<{}, any, RegisterRequest>, res: Response, next: NextFunction): Promise<void>;
    /**
     * Login user
     */
    login(req: Request<{}, any, LoginRequest>, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get user profile
     */
    getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: AuthController;
export default _default;
