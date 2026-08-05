import crypto from 'crypto';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '../config/database';
import { tinyUrls } from '../models/TinyUrl';
import type { TinyUrl as ITinyUrl } from '../models/TinyUrl';

// Function to generate a random 10-digit ID
const generateId = (): string => {
    return crypto.randomBytes(5).toString('hex');
};

// Function to shorten the URL
export const shortenUrl = async (originalUrl: string, baseUrl: string): Promise<string> => {
    try {
        const shortId = generateId(); // Generate a unique shortId
        const shortUrl = `${baseUrl}/tiny?id=${shortId}`; // Construct the full short URL

        const [created] = await db.insert(tinyUrls).values({ originalUrl, shortUrl, shortId }).returning();

        return created.shortUrl;
    } catch (error) {
        console.error('Error shortening URL:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to shorten the URL');
    }
};

// Function to fetch the original URL
export const fetchOriginalUrl = async (shortId: string, shortUrl: string): Promise<ITinyUrl | null> => {
    try {
        // Mongoose expires these rows with a 7-day TTL index. Postgres has no
        // TTL, so the cutoff is part of the read; `npm run cleanup:urls`
        // reclaims the rows this filter already hides.
        const [tiny] = await db.select().from(tinyUrls)
            .where(and(
                eq(tinyUrls.shortId, shortId),
                eq(tinyUrls.shortUrl, shortUrl),
                gt(tinyUrls.createdAt, sql`now() - interval '7 days'`),
            ))
            .limit(1);
        return tiny ?? null;
    } catch (error) {
        console.error('Error fetching original URL:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to fetch the original URL');
    }
};
