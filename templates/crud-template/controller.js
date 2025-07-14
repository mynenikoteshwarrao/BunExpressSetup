import { Request, Response, NextFunction } from 'express';
import { {{modelName}}Service } from '../services/{{modelNameLower}}Service';
import { AuditService } from '../services/auditService';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest, ApiResponse } from '../types/api';
import { Types } from 'mongoose';

class {{modelName}}Controller {
  /**
   * Create new {{modelNameLower}}
   * @route POST /api/{{modelNamePlural}}
   */
  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {{modelNameLower}}Data = req.body;
      const {{modelNameLower}} = await {{modelName}}Service.create({{modelNameLower}}Data);

      // Log audit trail
      await AuditService.logAction({
        entityType: '{{modelName}}',
        entityId: {{modelNameLower}}._id,
        action: 'CREATE',
        userId: new Types.ObjectId(req.user.id),
        changes: Object.keys({{modelNameLower}}Data).map(field => ({
          field,
          oldValue: null,
          newValue: {{modelNameLower}}Data[field]
        })),
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      const response: ApiResponse = {
        success: true,
        message: '{{modelName}} created successfully',
        data: {{modelNameLower}}
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all {{modelNamePlural}}
   * @route GET /api/{{modelNamePlural}}
   */
  public async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      
      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await {{modelName}}Service.getAll(options);

      const response: ApiResponse = {
        success: true,
        message: '{{modelNamePlural}} retrieved successfully',
        data: {
          {{modelNamePlural}}: result.{{modelNamePlural}},
          pagination: result.pagination
        }
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get {{modelNameLower}} by ID
   * @route GET /api/{{modelNamePlural}}/:id
   */
  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const {{modelNameLower}} = await {{modelName}}Service.getById(id);

      if (!{{modelNameLower}}) {
        return next(new AppError('{{modelName}} not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        message: '{{modelName}} retrieved successfully',
        data: {{modelNameLower}}
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update {{modelNameLower}}
   * @route PUT /api/{{modelNamePlural}}/:id
   */
  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Get original document for audit
      const original{{modelName}} = await {{modelName}}Service.getById(id);
      if (!original{{modelName}}) {
        return next(new AppError('{{modelName}} not found', 404));
      }

      const updated{{modelName}} = await {{modelName}}Service.update(id, updates);

      // Log audit trail
      const changes = AuditService.extractChanges(original{{modelName}}, updated{{modelName}});
      if (changes.length > 0) {
        await AuditService.logAction({
          entityType: '{{modelName}}',
          entityId: new Types.ObjectId(id),
          action: 'UPDATE',
          userId: new Types.ObjectId(req.user.id),
          changes,
          metadata: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        });
      }

      const response: ApiResponse = {
        success: true,
        message: '{{modelName}} updated successfully',
        data: updated{{modelName}}
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Soft delete {{modelNameLower}}
   * @route DELETE /api/{{modelNamePlural}}/:id
   */
  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Get original document for audit
      const {{modelNameLower}} = await {{modelName}}Service.getById(id);
      if (!{{modelNameLower}}) {
        return next(new AppError('{{modelName}} not found', 404));
      }

      await {{modelName}}Service.softDelete(id, req.user.id);

      // Log audit trail
      await AuditService.logAction({
        entityType: '{{modelName}}',
        entityId: new Types.ObjectId(id),
        action: 'DELETE',
        userId: new Types.ObjectId(req.user.id),
        changes: [
          { field: 'isDeleted', oldValue: false, newValue: true },
          { field: 'deletedAt', oldValue: null, newValue: new Date() },
          { field: 'deletedBy', oldValue: null, newValue: req.user.id }
        ],
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      const response: ApiResponse = {
        success: true,
        message: '{{modelName}} deleted successfully',
        data: null
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restore soft deleted {{modelNameLower}}
   * @route PATCH /api/{{modelNamePlural}}/:id/restore
   */
  public async restore(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const restored{{modelName}} = await {{modelName}}Service.restore(id, req.user.id);
      
      if (!restored{{modelName}}) {
        return next(new AppError('{{modelName}} not found or already active', 404));
      }

      // Log audit trail
      await AuditService.logAction({
        entityType: '{{modelName}}',
        entityId: new Types.ObjectId(id),
        action: 'RESTORE',
        userId: new Types.ObjectId(req.user.id),
        changes: [
          { field: 'isDeleted', oldValue: true, newValue: false },
          { field: 'deletedAt', oldValue: restored{{modelName}}.deletedAt, newValue: null },
          { field: 'deletedBy', oldValue: restored{{modelName}}.deletedBy, newValue: null }
        ],
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      const response: ApiResponse = {
        success: true,
        message: '{{modelName}} restored successfully',
        data: restored{{modelName}}
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit history for {{modelNameLower}}
   * @route GET /api/{{modelNamePlural}}/:id/audit
   */
  public async getAuditHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 50, skip = 0 } = req.query;

      const history = await AuditService.getEntityHistory(
        '{{modelName}}',
        new Types.ObjectId(id),
        parseInt(limit as string),
        parseInt(skip as string)
      );

      const response: ApiResponse = {
        success: true,
        message: '{{modelName}} audit history retrieved successfully',
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
}

export default new {{modelName}}Controller();