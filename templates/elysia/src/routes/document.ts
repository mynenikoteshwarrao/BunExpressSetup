import { Elysia, t } from 'elysia';
import { documentController } from '../controllers/documentController';
import { authPlugin } from '../middleware/auth';

const tag = ['Documents'];
const secured = { security: [{ bearerAuth: [] }] };
const idParam = t.Object({ id: t.String() });

export const documentRoutes = new Elysia({ prefix: '/documents' })
  .use(authPlugin)
  // Profile image upload — field `file`, image-only, 10MB.
  .post('/profile', documentController.uploadProfileImage, {
    auth: true,
    body: t.Object({ file: t.File({ type: 'image', maxSize: '10m' }) }),
    detail: { tags: tag, summary: 'Upload profile image', ...secured }
  })
  // Document upload — field `file`, any type, 50MB.
  .post('/', documentController.uploadDocument, {
    auth: true,
    body: t.Object({
      file: t.File({ maxSize: '50m' }),
      description: t.Optional(t.String()),
      tags: t.Optional(t.String()),
      isPublic: t.Optional(t.String())
    }),
    detail: { tags: tag, summary: 'Upload a document', ...secured }
  })
  .get('/', documentController.getUserDocuments, {
    auth: true,
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String()),
      mimeType: t.Optional(t.String()),
      tags: t.Optional(t.String()),
      sortBy: t.Optional(t.String()),
      sortOrder: t.Optional(t.String())
    }),
    detail: { tags: tag, summary: 'Get user documents with pagination', ...secured }
  })
  .get('/:id', documentController.getDocumentById, {
    auth: true,
    params: idParam,
    detail: { tags: tag, summary: 'Get document by ID', ...secured }
  })
  .get('/:id/download', documentController.downloadDocument, {
    auth: true,
    params: idParam,
    detail: { tags: tag, summary: 'Download document', ...secured }
  })
  .put('/:id', documentController.updateDocument, {
    auth: true,
    params: idParam,
    body: t.Object({
      description: t.Optional(t.String()),
      tags: t.Optional(t.Array(t.String())),
      isPublic: t.Optional(t.Boolean()),
      metadata: t.Optional(t.Record(t.String(), t.Any()))
    }),
    detail: { tags: tag, summary: 'Update document metadata', ...secured }
  })
  .delete('/:id', documentController.deleteDocument, {
    auth: true,
    params: idParam,
    detail: { tags: tag, summary: 'Delete document', ...secured }
  });

export default documentRoutes;
