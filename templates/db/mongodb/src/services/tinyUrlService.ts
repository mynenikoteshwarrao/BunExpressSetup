import crypto from 'crypto';
import { TinyUrl } from '../models/TinyUrl';
import type { ITinyUrl } from '../models/TinyUrl';

// Function to generate a random 10-digit ID
const generateId = (): string => {
    return crypto.randomBytes(5).toString('hex');
};

// Function to shorten the URL
export const shortenUrl = async (originalUrl: string, baseUrl: string): Promise<string> => {
    try {
        const shortId = generateId(); // Generate a unique shortId
        const shortUrl = `${baseUrl}/tiny?id=${shortId}`; // Construct the full short URL

        const newTinyUrl = new TinyUrl({ originalUrl, shortUrl, shortId });
        await newTinyUrl.save();

        return newTinyUrl.shortUrl;
    } catch (error) {
        console.error('Error shortening URL:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to shorten the URL');
    }
};

// Function to fetch the original URL
export const fetchOriginalUrl = async (shortId: string, shortUrl: string): Promise<ITinyUrl | null> => {
    try {
        const tiny = await TinyUrl.findOne({ shortId, shortUrl });
        return tiny;
    } catch (error) {
        console.error('Error fetching original URL:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to fetch the original URL');
    }
};