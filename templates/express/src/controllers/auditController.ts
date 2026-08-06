import { Request, Response, NextFunction } from 'express';
import { isValidId } from '../config/database';
import { AuditService } from '../services/auditService';
import { ApiResponse } from '../types/api';
import { AuthenticatedRequest } from '../types/express-api';
import { AppError } from '../utils/AppError';

class AuditController {
  /**
   * Get audit history for a specific entity
   * @route GET /api/audit/entity/:entityType/:entityId
   */
  public async getEntityHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityType, entityId } = req.params;
      const { limit = 50, skip = 0 } = req.query;

      if (!isValidId(entityId)) {
        return next(new AppError('Invalid entity ID', 400));
      }

      const history = await AuditService.getEntityHistory(
        entityType,
        entityId,
        parseInt(limit as string),
        parseInt(skip as string)
      );

      const response: ApiResponse = {
        success: true,
        message: 'Entity audit history retrieved successfully',
        data: {
          history,
          pagination: {
            limit: parseInt(limit as string),
            skip: parseInt(skip as string),
            total: history.length
          }
        }
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit history for current user
   * @route GET /api/audit/my-history
   */
  public async getMyHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 50, skip = 0 } = req.query;
      const userId = req.user.id;

      const history = await AuditService.getUserHistory(
        userId,
        parseInt(limit as string),
        parseInt(skip as string)
      );

      const response: ApiResponse = {
        success: true,
        message: 'User audit history retrieved successfully',
        data: {
          history,
          pagination: {
            limit: parseInt(limit as string),
            skip: parseInt(skip as string),
            total: history.length
          }
        }
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit statistics
   * @route GET /api/audit/stats
   */
  public async getAuditStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityType, startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const userId = req.query.userId ? (req.query.userId as string) : undefined;

      const stats = await AuditService.getAuditStats(
        entityType as string,
        userId,
        start,
        end
      );

      const response: ApiResponse = {
        success: true,
        message: 'Audit statistics retrieved successfully',
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuditController();