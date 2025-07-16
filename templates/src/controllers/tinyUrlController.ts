import type { Request, Response, NextFunction } from 'express';
import { fetchOriginalUrl, shortenUrl } from '../services/tinyUrlService';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../types/api';

interface ShortenUrlRequest {
  originalUrl: string;
}

interface FetchUrlRequest {
  id: string;
  shortUrl?: string;
}

class TinyUrlController {
  /**
   * Shorten a URL
   * @route POST /api/tiny/shorten
   */
  public async shortenUrl(req: Request<{}, any, ShortenUrlRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { originalUrl } = req.body;
      
      if (!originalUrl) {
        return next(new AppError('Original URL is required', 400));
      }

      const baseUrl = process.env.TINY_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const shortUrl = await shortenUrl(originalUrl, baseUrl);

      const response: ApiResponse = {
        success: true,
        message: 'URL shortened successfully',
        data: { shortUrl, originalUrl }
      };

      res.status(201).json(response);
    } catch (error: any) {
      next(new AppError(error.message || 'Failed to shorten URL', 500));
    }
  }

  /**
   * Redirect to original URL
   * @route GET /api/tiny/redirect/:id
   */
  public async redirectUrl(req: Request<FetchUrlRequest>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { shortUrl } = req.body;

      const url = await fetchOriginalUrl(id, shortUrl || '');

      if (url) {
        const response: ApiResponse = {
          success: true,
          message: 'URL found successfully',
          data: { url: url.originalUrl }
        };
        res.status(200).json(response);
      } else {
        return next(new AppError('URL not found', 404));
      }
    } catch (error: any) {
      next(new AppError(error.message || 'Failed to redirect URL', 500));
    }
  }

  /**
   * Get URL by short ID (for debugging/stats)
   * @route GET /api/tiny/:id
   */
  public async getUrl(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const baseUrl = process.env.TINY_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const shortUrl = `${baseUrl}/tiny?id=${id}`;

      const url = await fetchOriginalUrl(id, shortUrl);

      if (url) {
        const response: ApiResponse = {
          success: true,
          message: 'URL retrieved successfully',
          data: {
            originalUrl: url.originalUrl,
            shortUrl: url.shortUrl,
            shortId: url.shortId,
            createdAt: url.createdAt
          }
        };
        res.status(200).json(response);
      } else {
        return next(new AppError('URL not found', 404));
      }
    } catch (error: any) {
      next(new AppError(error.message || 'Failed to retrieve URL', 500));
    }
  }
}

export default new TinyUrlController();