import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuditService } from '../services/auditService';
import { AuthenticatedRequest } from '../types/api';

export interface AuditableRequest extends AuthenticatedRequest {
  auditLog?: {
    entityType: string;
    entityId?: Types.ObjectId;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
    originalDoc?: any;
  };
}

/**
 * Middleware to capture audit information from request
 */
export const captureAuditInfo = (
  entityType: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'
) => {
  return (req: AuditableRequest, res: Response, next: NextFunction) => {
    req.auditLog = {
      entityType,
      action
    };
    next();
  };
};

/**
 * Middleware to log audit trail after successful operation
 */
export const logAuditTrail = async (
  req: AuditableRequest,
  res: Response,
  next: NextFunction
) => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to capture successful responses
  res.json = function(body: any) {
    // Only log if the operation was successful and we have audit info
    if (
      req.auditLog &&
      req.user &&
      res.statusCode >= 200 &&
      res.statusCode < 300
    ) {
      // Extract entity ID from response or request
      const entityId = req.auditLog.entityId ||
                      body?.data?._id ||
                      body?.data?.id ||
                      req.params?.id;

      if (entityId) {
        const auditEntry = {
          entityType: req.auditLog.entityType,
          entityId: new Types.ObjectId(entityId),
          action: req.auditLog.action,
          userId: new Types.ObjectId(req.user.id),
          changes: req.auditLog.originalDoc && body?.data
            ? AuditService.extractChanges(req.auditLog.originalDoc, body.data)
            : [],
          metadata: {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID
          }
        };

        // Log audit entry asynchronously (don't block response)
        AuditService.logAction(auditEntry).catch(error => {
          console.error('Failed to log audit entry:', error);
        });
      }
    }

    return originalJson(body);
  };

  next();
};

/**
 * Combined middleware for audit logging
 */
export const auditLog = (
  entityType: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'
) => {
  return [
    captureAuditInfo(entityType, action),
    logAuditTrail
  ];
};