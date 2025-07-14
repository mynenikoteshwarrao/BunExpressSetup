import { Request, Response, NextFunction } from 'express';
/**
 * Validation middleware
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export declare const validation: (req: Request, res: Response, next: NextFunction) => void;
export default validation;
