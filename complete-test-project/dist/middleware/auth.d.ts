import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api';
export declare const auth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export default auth;
