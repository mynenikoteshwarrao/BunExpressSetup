import { and, count, desc, eq, gte, lte, SQL } from 'drizzle-orm';
import { db } from '../config/database';
import { auditLogs, AuditLog } from '../models/AuditLog';
import { users } from '../models/User';

/**
 * The actor mongo attaches with `.populate('userId', 'username email firstName
 * lastName')`. Parity note: mongo's populated subdocument carries `_id` where
 * this carries `id` — the same `_id`-to-`id` rule the rest of the wire contract
 * follows, so clients see a string identifier on both databases either way.
 */
export interface AuditActor {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/** An audit row with its actor joined in, matching mongo's populated shape. */
export type AuditLogWithActor = Omit<AuditLog, 'userId'> & { userId: AuditActor | null };

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

const ACTOR_COLUMNS = {
  id: users.id,
  username: users.username,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
};

/** A left join yields a row of nulls for a deleted actor; mongo yields null. */
const withActor = (row: { log: AuditLog; actor: AuditActor | null }): AuditLogWithActor => ({
  ...row.log,
  userId: row.actor?.id ? row.actor : null,
});

export class AuditService {
  /**
   * Log an audit entry
   */
  static async logAction(entry: AuditLogEntry): Promise<AuditLog> {
    const [row] = await db.insert(auditLogs).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      userId: entry.userId,
      changes: entry.changes ?? [],
      metadata: entry.metadata,
      timestamp: new Date(),
    }).returning();

    return row;
  }

  /**
   * Get audit history for a specific entity
   */
  static async getEntityHistory(
    entityType: string,
    entityId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<AuditLogWithActor[]> {
    const rows = await db.select({ log: auditLogs, actor: ACTOR_COLUMNS }).from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(skip);
    return rows.map(withActor);
  }

  /**
   * Get audit history for a specific user
   */
  static async getUserHistory(
    userId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<AuditLogWithActor[]> {
    const rows = await db.select({ log: auditLogs, actor: ACTOR_COLUMNS }).from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(skip);
    return rows.map(withActor);
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

    // `_id`/`__v` stay in the list so a row that round-tripped through the
    // mongo layer during a db:switch is filtered identically.
    const defaultExcludeFields = [
      '_id', 'id', '__v', 'createdAt', 'updatedAt', 'password',
      'refreshTokens', 'emailVerificationToken', 'passwordResetToken'
    ];

    const fieldsToExclude = [...defaultExcludeFields, ...excludeFields];

    // Drizzle returns plain objects; nothing to unwrap.
    const oldObj = oldDoc;
    const newObj = newDoc;

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
    const filters: SQL[] = [];

    if (entityType) filters.push(eq(auditLogs.entityType, entityType));
    if (userId) filters.push(eq(auditLogs.userId, userId));
    if (startDate) filters.push(gte(auditLogs.timestamp, startDate));
    if (endDate) filters.push(lte(auditLogs.timestamp, endDate));

    const where = filters.length > 0 ? and(...filters) : undefined;

    // The two mongo $group pipelines become two GROUP BY queries.
    const [totals, actionBreakdown, entityBreakdown] = await Promise.all([
      db.select({ value: count() }).from(auditLogs).where(where),
      db.select({ action: auditLogs.action, count: count() })
        .from(auditLogs).where(where).groupBy(auditLogs.action),
      db.select({ entityType: auditLogs.entityType, count: count() })
        .from(auditLogs).where(where).groupBy(auditLogs.entityType),
    ]);

    return {
      totalActions: totals[0]?.value ?? 0,
      actionBreakdown,
      entityBreakdown
    };
  }
}
