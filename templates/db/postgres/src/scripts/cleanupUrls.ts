/**
 * Reclaims expired short URLs.
 *
 * Usage:
 *   npm run cleanup:urls
 *
 * MongoDB expires these rows with a 7-day TTL index. Postgres has no TTL, so
 * `tinyUrlService.fetchOriginalUrl` already refuses to resolve anything older
 * than 7 days — this script deletes the rows that filter hides. Run it from
 * cron (or any scheduler) as often as your retention policy needs.
 */

import dotenv from 'dotenv';
import { lt, sql } from 'drizzle-orm';
import { db, connectDB, closeDB } from '../config/database';
import { tinyUrls } from '../models/TinyUrl';

dotenv.config();

const cleanupUrls = async (): Promise<void> => {
  try {
    await connectDB();

    const deleted = await db.delete(tinyUrls)
      .where(lt(tinyUrls.createdAt, sql`now() - interval '7 days'`))
      .returning({ id: tinyUrls.id });

    console.log(`🧹 Removed ${deleted.length} expired short URL(s)`);
  } catch (error) {
    console.error('❌ URL cleanup failed:', error);
    process.exit(1);
  } finally {
    await closeDB();
  }
};

cleanupUrls();
