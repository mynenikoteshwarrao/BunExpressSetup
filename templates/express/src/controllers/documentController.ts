import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/documentService';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types/express-api';
import { logger } from '../config/logger';
import fs from 'fs';
import path from 'path';

/**
 * @swagger
 * components:
 *   schemas:
 *     Document:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Document ID
 *         userId:
 *           type: string
 *           description: Owner user ID
 *         originalName:
 *           type: string
 *           description: Original filename
 *         fileName:
 *           type: string
 *           description: Stored filename
 *         mimeType:
 *           type: string
 *           description: File MIME type
 *         size:
 *           type: number
 *           description: File size in bytes
 *         path:
 *           type: string
 *           description: File storage path
 *         storageType:
 *           type: string
 *           enum: [local, s3]
 *           description: Storage location
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *           description: Upload timestamp
 *         isPublic:
 *           type: boolean
 *           description: Public access flag
 *         description:
 *           type: string
 *           description: Document description
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Document tags
 *         metadata:
 *           type: object
 *           description: Additional metadata
 */

export class DocumentController {
  /**
   * @swagger
   * /api/documents:
   *   post:
   *     summary: Upload a document
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: File to upload
   *               description:
   *                 type: string
   *                 description: Document description
   *               tags:
   *                 type: string
   *                 description: Comma-separated tags
   *               isPublic:
   *                 type: boolean
   *                 description: Make document public
   *             required:
   *               - file
   *     responses:
   *       201:
   *         description: Document uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   *       400:
   *         description: No file provided or validation error
   *       401:
   *         description: Unauthorized
   */
  public async uploadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        return next(new AppError('No file provided', 400));
      }

      const userId = req.user.id;
      const { description, tags, isPublic } = req.body;

      const options = {
        description,
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
        isPublic: isPublic === 'true',
        metadata: {}
      };

      const document = await documentService.uploadDocument(userId, req.file, options);

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/documents:
   *   get:
   *     summary: Get user documents with pagination
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Items per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in filename, description, or tags
   *       - in: query
   *         name: mimeType
   *         schema:
   *           type: string
   *         description: Filter by MIME type
   *       - in: query
   *         name: tags
   *         schema:
   *           type: string
   *         description: Filter by tags (comma-separated)
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           default: uploadedAt
   *         description: Field to sort by
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Documents retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedResponse'
   */
  public async getUserDocuments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const {
        page,
        limit,
        search,
        mimeType,
        tags,
        sortBy,
        sortOrder
      } = req.query;

      const options = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        mimeType: mimeType as string,
        tags: tags ? (tags as string).split(',').map(tag => tag.trim()) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await documentService.getUserDocuments(userId, options);

      res.json({
        success: true,
        message: 'Documents retrieved successfully',
        data: result.documents,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/documents/{id}:
   *   get:
   *     summary: Get document by ID
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Document ID
   *     responses:
   *       200:
   *         description: Document details
   *       404:
   *         description: Document not found
   */
  public async getDocumentById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const document = await documentService.getDocumentById(userId, id);

      if (!document) {
        return next(new AppError('Document not found', 404));
      }

      res.json({
        success: true,
        message: 'Document retrieved successfully',
        data: document
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/documents/{id}/download:
   *   get:
   *     summary: Download document
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Document ID
   *     responses:
   *       200:
   *         description: File download or redirect to signed URL
   *       404:
   *         description: Document not found
   */
  public async downloadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const document = await documentService.getDocumentById(userId, id);
      
      if (!document) {
        return next(new AppError('Document not found', 404));
      }

      if (document.storageType === 's3') {
        // For S3, get signed URL and redirect
        const downloadUrl = await documentService.getDownloadUrl(userId, id);
        res.redirect(downloadUrl);
      } else {
        // For local files, stream the file
        const filePath = document.path;
        
        if (!fs.existsSync(filePath)) {
          return next(new AppError('File not found in storage', 404));
        }

        res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
        res.setHeader('Content-Type', document.mimeType);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/documents/{id}:
   *   put:
   *     summary: Update document metadata
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Document ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               description:
   *                 type: string
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *               isPublic:
   *                 type: boolean
   *               metadata:
   *                 type: object
   *     responses:
   *       200:
   *         description: Document updated successfully
   *       404:
   *         description: Document not found
   */
  public async updateDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updates = req.body;

      const document = await documentService.updateDocument(userId, id, updates);

      if (!document) {
        return next(new AppError('Document not found', 404));
      }

      res.json({
        success: true,
        message: 'Document updated successfully',
        data: document
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/documents/{id}:
   *   delete:
   *     summary: Delete document
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Document ID
   *     responses:
   *       200:
   *         description: Document deleted successfully
   *       404:
   *         description: Document not found
   */
  public async deleteDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      await documentService.deleteDocument(userId, id);

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/documents/profile:
   *   post:
   *     summary: Upload profile image
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Profile image file
   *             required:
   *               - file
   *     responses:
   *       201:
   *         description: Profile image uploaded successfully
   *       400:
   *         description: No file provided or invalid file type
   *       401:
   *         description: Unauthorized
   */
  public async uploadProfileImage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        return next(new AppError('No file provided', 400));
      }

      // Validate file type
      if (!req.file.mimetype.startsWith('image/')) {
        return next(new AppError('Only image files are allowed for profile pictures', 400));
      }

      const userId = req.user.id;
      const result = await documentService.uploadProfileImage(userId, req.file);

      res.status(201).json({
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          profileImageUrl: result.profileImageUrl,
          document: result.document
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const documentController = new DocumentController();
export default documentController;