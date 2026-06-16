import { Elysia, t } from 'elysia';
import { auditController } from '../controllers/auditController';
import { authPlugin } from '../middleware/auth';

const tag = ['Audit'];
const secured = { security: [{ bearerAuth: [] }] };

export const auditRoutes = new Elysia({ prefix: '/audit' })
  .use(authPlugin)
  .get('/entity/:entityType/:entityId', auditController.getEntityHistory, {
    auth: true,
    params: t.Object({ entityType: t.String(), entityId: t.String() }),
    query: t.Object({ limit: t.Optional(t.String()), skip: t.Optional(t.String()) }),
    detail: { tags: tag, summary: 'Get audit history for a specific entity', ...secured }
  })
  .get('/my-history', auditController.getMyHistory, {
    auth: true,
    query: t.Object({ limit: t.Optional(t.String()), skip: t.Optional(t.String()) }),
    detail: { tags: tag, summary: "Get current user's audit history", ...secured }
  })
  .get('/stats', auditController.getAuditStats, {
    auth: true,
    query: t.Object({
      entityType: t.Optional(t.String()),
      userId: t.Optional(t.String()),
      startDate: t.Optional(t.String()),
      endDate: t.Optional(t.String())
    }),
    detail: { tags: tag, summary: 'Get audit statistics', ...secured }
  });

export default auditRoutes;
