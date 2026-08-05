import { pgTable, uuid, text, boolean, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull(),
  originalName: text('original_name').notNull(),
  fileName: text('file_name').notNull().unique(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  path: text('path').notNull(),
  storageType: text('storage_type').notNull().default('local'),   // 'local' | 's3'
  s3Key: text('s3_key'),
  s3Bucket: text('s3_bucket'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  isPublic: boolean('is_public').notNull().default(false),
  description: text('description'),
  tags: text('tags').array().notNull().default(sql`'{}'`),
  metadata: jsonb('metadata').$type<Record<string, any>>().notNull().default(sql`'{}'::jsonb`),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('documents_user_uploaded_idx').on(t.userId, t.uploadedAt),
  index('documents_mime_type_idx').on(t.mimeType),
  index('documents_tags_idx').on(t.tags),
  index('documents_is_public_idx').on(t.isPublic),
  index('documents_is_deleted_idx').on(t.isDeleted),
]);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
