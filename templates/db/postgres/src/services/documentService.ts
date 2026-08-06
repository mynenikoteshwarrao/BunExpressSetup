import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { and, asc, count, desc, eq, ilike, ne, or, sql, SQL } from 'drizzle-orm';
import { db } from '../config/database';
import { documents, Document as IDocument } from '../models/Document';
import { s3Config } from '../config/s3';
import { logger } from '../config/logger';
import { AuditService } from './auditService';
import { AppError } from '../utils/AppError';
import { definedOnly } from './normalize';

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

const SORTABLE = {
  uploadedAt: documents.uploadedAt,
  createdAt: documents.createdAt,
  updatedAt: documents.updatedAt,
  originalName: documents.originalName,
  size: documents.size,
  mimeType: documents.mimeType,
} as const;

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
    const [document] = await db.insert(documents).values({
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
    }).returning();

    return document;
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
    const filters: SQL[] = [eq(documents.userId, userId)];

    if (options.search) {
      const like = `%${options.search}%`;
      filters.push(
        or(
          ilike(documents.originalName, like),
          ilike(documents.description, like),
          sql`EXISTS (SELECT 1 FROM unnest(${documents.tags}) AS tag WHERE tag ILIKE ${like})`,
        )!,
      );
    }

    if (options.mimeType) {
      filters.push(ilike(documents.mimeType, `%${options.mimeType}%`));
    }

    if (options.tags && options.tags.length > 0) {
      filters.push(sql`${documents.tags} && ${options.tags}`);
    }

    const where = and(...filters);

    // Build sort
    const sortColumn = SORTABLE[(options.sortBy || 'uploadedAt') as keyof typeof SORTABLE] ?? documents.uploadedAt;
    const orderBy = options.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // Execute queries
    const [rows, totals] = await Promise.all([
      db.select().from(documents).where(where).orderBy(orderBy).limit(limit).offset(skip),
      db.select({ value: count() }).from(documents).where(where),
    ]);

    const total = totals[0]?.value ?? 0;

    return {
      documents: rows,
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
    const filters: SQL[] = [eq(documents.id, documentId), eq(documents.userId, userId)];
    if (!includeDeleted) {
      filters.push(ne(documents.isDeleted, true));
    }
    const [row] = await db.select().from(documents).where(and(...filters)).limit(1);
    return row ?? null;
  }

  public async deleteDocument(userId: string, documentId: string, deletedBy?: string): Promise<void> {
    const [document] = await db.select().from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId), eq(documents.isDeleted, false)))
      .limit(1);

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Soft delete - mark as deleted instead of removing
    await db.update(documents).set({
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: deletedBy || userId
    }).where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

    // Log audit trail
    if (deletedBy) {
      await AuditService.logAction({
        entityType: 'Document',
        entityId: document.id,
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
    const [document] = await db.select().from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .limit(1);

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
    const live = and(eq(documents.id, documentId), eq(documents.userId, userId), ne(documents.isDeleted, true));

    // Get original document for audit
    const [originalDoc] = await db.select().from(documents).where(live).limit(1);

    if (!originalDoc) {
      throw new AppError('Document not found', 404);
    }

    const changes = definedOnly(updates);
    // Mongo treated an empty patch as a no-op; drizzle would throw here.
    if (Object.keys(changes).length === 0) {
      return originalDoc;
    }

    const [updatedDoc] = await db.update(documents).set(changes).where(live).returning();

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

    return updatedDoc ?? null;
  }

  public async uploadProfileImage(
    userId: string,
    file: UploadedFile
  ): Promise<{ profileImageUrl: string; document: IDocument }> {
    // Delete existing profile image if exists — the mongo dot-path query
    // `'metadata.type'` becomes a JSONB text extraction.
    const [existingProfile] = await db.select({ id: documents.id }).from(documents)
      .where(and(eq(documents.userId, userId), sql`${documents.metadata}->>'type' = 'profile_image'`))
      .limit(1);

    if (existingProfile) {
      await this.deleteDocument(userId, existingProfile.id);
    }

    // Upload new profile image
    const document = await this.uploadDocument(userId, file, {
      description: 'Profile Image',
      tags: ['profile', 'image'],
      isPublic: true,
      metadata: { type: 'profile_image' }
    });

    const profileImageUrl = await this.getDownloadUrl(userId, document.id);

    return { profileImageUrl, document };
  }
}

export const documentService = new DocumentService();
export default documentService;
