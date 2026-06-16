import { shortenUrl as shortenUrlSvc, fetchOriginalUrl } from '../services/tinyUrlService';
import { AppError } from '../utils/AppError';
import { success } from '../utils/respond';

/**
 * Base URL for short links. Express used
 * `process.env.TINY_BASE_URL || `${req.protocol}://${req.get('host')}``.
 * Elysia has no req.protocol/req.get — derive the origin from the request URL.
 */
const getBaseUrl = (request: Request): string =>
  process.env.TINY_BASE_URL || new URL(request.url).origin;

export const tinyUrlController = {
  async shortenUrl({ body, request, set }: any) {
    const { originalUrl } = body;
    const baseUrl = getBaseUrl(request);
    const shortUrl = await shortenUrlSvc(originalUrl, baseUrl);
    set.status = 201;
    return success('URL shortened successfully', { shortUrl, originalUrl });
  },

  async redirectUrl({ params, body }: any) {
    const url = await fetchOriginalUrl(params.id, body?.shortUrl || '');
    if (!url) {
      throw new AppError('URL not found', 404);
    }
    return success('URL found successfully', { url: url.originalUrl });
  },

  async getUrl({ params, request }: any) {
    const baseUrl = getBaseUrl(request);
    const shortUrl = `${baseUrl}/tiny?id=${params.id}`;
    const url = await fetchOriginalUrl(params.id, shortUrl);
    if (!url) {
      throw new AppError('URL not found', 404);
    }
    return success('URL retrieved successfully', {
      originalUrl: url.originalUrl,
      shortUrl: url.shortUrl,
      shortId: url.shortId,
      createdAt: url.createdAt
    });
  }
};

export default tinyUrlController;
