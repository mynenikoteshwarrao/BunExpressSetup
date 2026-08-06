import { AuditLog, IAuditLog } from '../models/AuditLog';

export interface AuditLogEntry {
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  userId: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

export class AuditService {
  /**
   * Log an audit entry
   */
  static async logAction(entry: AuditLogEntry): Promise<IAuditLog> {
    const auditLog = new AuditLog({
      ...entry,
      timestamp: new Date(),
      createdAt: new Date()
    });

    return await auditLog.save();
  }

  /**
   * Get audit history for a specific entity
   */
  static async getEntityHistory(
    entityType: string,
    entityId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<IAuditLog[]> {
    return await AuditLog.find({
      entityType,
      entityId
    })
    .populate('userId', 'username email firstName lastName')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
  }

  /**
   * Get audit history for a specific user
   */
  static async getUserHistory(
    userId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<IAuditLog[]> {
    return await AuditLog.find({ userId })
    .populate('userId', 'username email firstName lastName')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
  }

  /**
   * Compare objects and extract changes
   */
  static extractChanges(oldDoc: any, newDoc: any, excludeFields: string[] = []): {
    field: string;
    oldValue: any;
    newValue: any;
  }[] {
    const changes: {
      field: string;
      oldValue: any;
      newValue: any;
    }[] = [];

    const defaultExcludeFields = [
      '_id', '__v', 'createdAt', 'updatedAt', 'password', 
      'refreshTokens', 'emailVerificationToken', 'passwordResetToken'
    ];
    
    const fieldsToExclude = [...defaultExcludeFields, ...excludeFields];

    // Convert to plain objects if they are mongoose documents
    const oldObj = oldDoc?.toObject ? oldDoc.toObject() : oldDoc;
    const newObj = newDoc?.toObject ? newDoc.toObject() : newDoc;

    // Compare all fields in the new object
    for (const field in newObj) {
      if (fieldsToExclude.includes(field)) continue;

      const oldValue = oldObj?.[field];
      const newValue = newObj[field];

      // Check if values are different
      if (this.isDifferent(oldValue, newValue)) {
        changes.push({
          field,
          oldValue: this.sanitizeValue(oldValue),
          newValue: this.sanitizeValue(newValue)
        });
      }
    }

    return changes;
  }

  /**
   * Check if two values are different
   */
  private static isDifferent(oldValue: any, newValue: any): boolean {
    // Handle null/undefined cases
    if (oldValue === null || oldValue === undefined) {
      return newValue !== null && newValue !== undefined;
    }
    if (newValue === null || newValue === undefined) {
      return oldValue !== null && oldValue !== undefined;
    }

    // Handle dates
    if (oldValue instanceof Date && newValue instanceof Date) {
      return oldValue.getTime() !== newValue.getTime();
    }

    // Handle arrays
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length !== newValue.length) return true;
      return oldValue.some((item, index) => this.isDifferent(item, newValue[index]));
    }

    // Handle objects
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }

    // Handle primitive values
    return oldValue !== newValue;
  }

  /**
   * Sanitize values for logging (remove sensitive data)
   */
  private static sanitizeValue(value: any): any {
    if (value === null || value === undefined) return value;

    // If it's a password or token field, don't log the actual value
    if (typeof value === 'string' && (
      value.includes('$2') || // bcrypt hash
      value.length > 100 // likely a token
    )) {
      return '[REDACTED]';
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeValue(item));
    }

    // Handle objects
    if (typeof value === 'object' && value.constructor === Object) {
      const sanitized: any = {};
      for (const key in value) {
        sanitized[key] = this.sanitizeValue(value[key]);
      }
      return sanitized;
    }

    return value;
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(
    entityType?: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalActions: number;
    actionBreakdown: { action: string; count: number }[];
    entityBreakdown: { entityType: string; count: number }[];
  }> {
    const matchStage: any = {};

    if (entityType) matchStage.entityType = entityType;
    if (userId) matchStage.userId = userId;
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = startDate;
      if (endDate) matchStage.timestamp.$lte = endDate;
    }

    const [totalActions, actionBreakdown, entityBreakdown] = await Promise.all([
      AuditLog.countDocuments(matchStage),
      AuditLog.aggregate([
        { $match: matchStage },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $project: { action: '$_id', count: 1, _id: 0 } }
      ]),
      AuditLog.aggregate([
        { $match: matchStage },
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
        { $project: { entityType: '$_id', count: 1, _id: 0 } }
      ])
    ]);

    return {
      totalActions,
      actionBreakdown,
      entityBreakdown
    };
  }
}