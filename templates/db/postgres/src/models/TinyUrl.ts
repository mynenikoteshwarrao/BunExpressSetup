import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * The Mongoose model expires rows with a 7-day TTL index. Postgres has no TTL,
 * so expiry is enforced at query time (`tinyUrlService.fetchOriginalUrl`) and
 * old rows are reclaimed by `npm run cleanup:urls`.
 */
export const tinyUrls = pgTable('tiny_urls', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  originalUrl: text('original_url').notNull(),
  shortUrl: text('short_url').notNull(),
  shortId: text('short_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('tiny_urls_created_at_idx').on(t.createdAt),
]);

export type TinyUrl = typeof tinyUrls.$inferSelect;
export type NewTinyUrl = typeof tinyUrls.$inferInsert;
