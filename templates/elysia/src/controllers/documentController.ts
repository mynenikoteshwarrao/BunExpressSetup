import { documentService, UploadedFile } from '../services/documentService';
import { AppError } from '../utils/AppError';
import { success } from '../utils/respond';

/** Convert an Elysia/web File into the framework-neutral UploadedFile DTO. */
const toUploadedFile = async (file: File): Promise<UploadedFile> => ({
  buffer: Buffer.from(await file.arrayBuffer()),
  originalname: file.name,
  mimetype: file.type,
  size: file.size
});

export const documentController = {
  async uploadDocument({ user, body, set }: any) {
    const file = body?.file as File | undefined;
    if (!file) {
      throw new AppError('No file provided', 400);
    }
    const { description, tags, isPublic } = body;
    const options = {
      description,
      tags: tags ? String(tags).split(',').map((t: string) => t.trim()) : [],
      isPublic: isPublic === 'true' || isPublic === true,
      metadata: {}
    };
    const document = await documentService.uploadDocument(user.id, await toUploadedFile(file), options);
    set.status = 201;
    return success('Document uploaded successfully', document);
  },

  async getUserDocuments({ user, query }: any) {
    const { page, limit, search, mimeType, tags, sortBy, sortOrder } = query || {};
    const options = {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      mimeType: mimeType as string,
      tags: tags ? String(tags).split(',').map((t: string) => t.trim()) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    };
    const result = await documentService.getUserDocuments(user.id, options);
    return {
      success: true,
      message: 'Documents retrieved successfully',
      data: result.documents,
      pagination: result.pagination
    };
  },

  async getDocumentById({ user, params }: any) {
    const document = await documentService.getDocumentById(user.id, params.id);
    if (!document) {
      throw new AppError('Document not found', 404);
    }
    return success('Document retrieved successfully', document);
  },

  async downloadDocument({ user, params, set, redirect }: any) {
    const document = await documentService.getDocumentById(user.id, params.id);
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // S3 → redirect to a signed URL; local → stream the file via Bun.file.
    if (document.storageType === 's3') {
      const downloadUrl = await documentService.getDownloadUrl(user.id, params.id);
      return redirect(downloadUrl);
    }

    const file = Bun.file(document.path);
    if (!(await file.exists())) {
      throw new AppError('File not found in storage', 404);
    }
    set.headers['content-disposition'] = `attachment; filename="${document.originalName}"`;
    set.headers['content-type'] = document.mimeType;
    return file;
  },

  async updateDocument({ user, params, body }: any) {
    const document = await documentService.updateDocument(user.id, params.id, body);
    if (!document) {
      throw new AppError('Document not found', 404);
    }
    return success('Document updated successfully', document);
  },

  async deleteDocument({ user, params }: any) {
    await documentService.deleteDocument(user.id, params.id);
    return success('Document deleted successfully');
  },

  async uploadProfileImage({ user, body, set }: any) {
    const file = body?.file as File | undefined;
    if (!file) {
      throw new AppError('No file provided', 400);
    }
    if (!file.type.startsWith('image/')) {
      throw new AppError('Only image files are allowed', 400);
    }
    const result = await documentService.uploadProfileImage(user.id, await toUploadedFile(file));
    set.status = 201;
    return success('Profile image uploaded successfully', {
      profileImageUrl: result.profileImageUrl,
      document: result.document
    });
  }
};

export default documentController;
