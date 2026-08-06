import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { DocumentModel, IDocument } from '../models/Document';
import { s3Config } from '../config/s3';
import { logger } from '../config/logger';
import { AuditService } from './auditService';
import { AppError } from '../utils/AppError';

interface UploadOptions {
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Framework-neutral uploaded-file shape.
 * Express/multer files satisfy this structurally (buffer/originalname/mimetype/size).
 * Elysia controllers build it from a web File via Buffer.from(await file.arrayBuffer()).
 */
export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  mimeType?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class DocumentService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadsDirectory();
  }

  private async ensureUploadsDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      logger.info('Created uploads directory');
    }
  }

  private generateFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${random}${ext}`;
  }

  private generateS3Key(userId: string, fileName: string): string {
    return `documents/${userId}/${fileName}`;
  }

  public async uploadDocument(
    userId: string,
    file: UploadedFile,
    options: UploadOptions = {}
  ): Promise<IDocument> {
    const fileName = this.generateFileName(file.originalname);
    const useS3 = s3Config.isEnabled();
    
    let filePath: string;
    let s3Key: string | undefined;
    let s3Bucket: string | undefined;

    if (useS3) {
      // Upload to S3
      s3Key = this.generateS3Key(userId, fileName);
      s3Bucket = s3Config.getBucket();
      
      try {
        filePath = await s3Config.uploadFile(s3Key, file.buffer, file.mimetype);
        logger.info(`File uploaded to S3: ${s3Key}`);
      } catch (error) {
        logger.error('S3 upload failed, falling back to local storage:', error);
        filePath = await this.saveToLocal(fileName, file.buffer);
      }
    } else {
      // Save to local uploads folder
      filePath = await this.saveToLocal(fileName, file.buffer);
    }

    // Save document metadata to database
    const document = new DocumentModel({
      userId,
      originalName: file.originalname,
      fileName,
      mimeType: file.mimetype,
      size: file.size,
      path: filePath,
      storageType: useS3 && s3Key ? 's3' : 'local',
      s3Key,
      s3Bucket,
      isPublic: options.isPublic || false,
      description: options.description,
      tags: options.tags || [],
      metadata: options.metadata || {}
    });

    return await document.save();
  }

  private async saveToLocal(fileName: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(this.uploadsDir, fileName);
    await fs.writeFile(filePath, buffer);
    logger.info(`File saved locally: ${fileName}`);
    return filePath;
  }

  public async getUserDocuments(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<{
    documents: IDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { userId };

    if (options.search) {
      query.$or = [
        { originalName: { $regex: options.search, $options: 'i' } },
        { description: { $regex: options.search, $options: 'i' } },
        { tags: { $in: [new RegExp(options.search, 'i')] } }
      ];
    }

    if (options.mimeType) {
      query.mimeType = { $regex: options.mimeType, $options: 'i' };
    }

    if (options.tags && options.tags.length > 0) {
      query.tags = { $in: options.tags };
    }

    // Build sort
    const sortField = options.sortBy || 'uploadedAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    // Execute queries
    const [documents, total] = await Promise.all([
      DocumentModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      DocumentModel.countDocuments(query)
    ]);

    return {
      documents: documents as IDocument[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  public async getDocumentById(userId: string, documentId: string, includeDeleted: boolean = false): Promise<IDocument | null> {
    const query: any = { _id: documentId, userId };
    if (!includeDeleted) {
      query.isDeleted = { $ne: true };
    }
    return await DocumentModel.findOne(query).lean();
  }

  public async deleteDocument(userId: string, documentId: string, deletedBy?: string): Promise<void> {
    const document = await DocumentModel.findOne({ _id: documentId, userId, isDeleted: false });
    
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Store original document for audit
    const originalDoc = document.toObject();

    // Soft delete - mark as deleted instead of removing
    await DocumentModel.updateOne(
      { _id: documentId, userId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: deletedBy || userId
        }
      }
    );

    // Log audit trail
    if (deletedBy) {
      await AuditService.logAction({
        entityType: 'Document',
        entityId: String(document._id),
        action: 'DELETE',
        userId: deletedBy,
        changes: [
          { field: 'isDeleted', oldValue: false, newValue: true },
          { field: 'deletedAt', oldValue: null, newValue: new Date() }
        ]
      });
    }

    logger.info(`Document soft deleted: ${document.fileName}`);
  }

  public async getDownloadUrl(userId: string, documentId: string): Promise<string> {
    const document = await DocumentModel.findOne({ _id: documentId, userId });
    
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    if (document.storageType === 's3' && document.s3Key) {
      return await s3Config.getSignedUrl(document.s3Key, 3600); // 1 hour expiry
    } else {
      // For local files, return the file path (will be handled by controller)
      return document.path;
    }
  }

  public async updateDocument(
    userId: string,
    documentId: string,
    updates: Partial<Pick<IDocument, 'description' | 'tags' | 'isPublic' | 'metadata'>>,
    updatedBy?: string
  ): Promise<IDocument | null> {
    // Get original document for audit
    const originalDoc = await DocumentModel.findOne({ _id: documentId, userId, isDeleted: { $ne: true } });
    
    if (!originalDoc) {
      throw new AppError('Document not found', 404);
    }

    const updatedDoc = await DocumentModel.findOneAndUpdate(
      { _id: documentId, userId, isDeleted: { $ne: true } },
      { $set: updates },
      { new: true, lean: true }
    );

    // Log audit trail
    if (updatedDoc && updatedBy) {
      const changes = AuditService.extractChanges(originalDoc, updatedDoc);
      if (changes.length > 0) {
        await AuditService.logAction({
          entityType: 'Document',
          entityId: documentId,
          action: 'UPDATE',
          userId: updatedBy,
          changes
        });
      }
    }

    return updatedDoc;
  }

  public async uploadProfileImage(
    userId: string,
    file: UploadedFile
  ): Promise<{ profileImageUrl: string; document: IDocument }> {
    // Delete existing profile image if exists
    const existingProfile = await DocumentModel.findOne({
      userId,
      'metadata.type': 'profile_image'
    });

    if (existingProfile) {
      await this.deleteDocument(userId, existingProfile._id.toString());
    }

    // Upload new profile image
    const document = await this.uploadDocument(userId, file, {
      description: 'Profile Image',
      tags: ['profile', 'image'],
      isPublic: true,
      metadata: { type: 'profile_image' }
    });

    const profileImageUrl = await this.getDownloadUrl(userId, document._id.toString());

    return { profileImageUrl, document };
  }
}

export const documentService = new DocumentService();
export default documentService;