import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface AuditMetadata {
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),                 // 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'
  userId: uuid('user_id').notNull(),
  changes: jsonb('changes').$type<AuditChange[]>().notNull().default(sql`'[]'::jsonb`),
  metadata: jsonb('metadata').$type<AuditMetadata>(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('audit_logs_entity_idx').on(t.entityType, t.entityId, t.timestamp),
  index('audit_logs_user_idx').on(t.userId, t.timestamp),
  index('audit_logs_action_idx').on(t.action, t.timestamp),
]);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
