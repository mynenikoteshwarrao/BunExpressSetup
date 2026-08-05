import { isValidId } from '../config/database';
import { AuditService } from '../services/auditService';
import { AppError } from '../utils/AppError';
import { success } from '../utils/respond';

export const auditController = {
  async getEntityHistory({ params, query }: any) {
    const { entityType, entityId } = params;
    const limit = query?.limit ?? '50';
    const skip = query?.skip ?? '0';

    if (!isValidId(entityId)) {
      throw new AppError('Invalid entity ID', 400);
    }

    const history = await AuditService.getEntityHistory(
      entityType,
      entityId,
      parseInt(limit as string),
      parseInt(skip as string)
    );

    return success('Entity audit history retrieved successfully', {
      history,
      pagination: {
        limit: parseInt(limit as string),
        skip: parseInt(skip as string),
        total: history.length
      }
    });
  },

  async getMyHistory({ query, user }: any) {
    const limit = query?.limit ?? '50';
    const skip = query?.skip ?? '0';

    const history = await AuditService.getUserHistory(
      user.id,
      parseInt(limit as string),
      parseInt(skip as string)
    );

    return success('User audit history retrieved successfully', {
      history,
      pagination: {
        limit: parseInt(limit as string),
        skip: parseInt(skip as string),
        total: history.length
      }
    });
  },

  async getAuditStats({ query }: any) {
    const { entityType, startDate, endDate, userId } = query || {};
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    const uid = userId ? (userId as string) : undefined;

    const stats = await AuditService.getAuditStats(
      entityType as string,
      uid,
      start,
      end
    );

    return success('Audit statistics retrieved successfully', stats);
  }
};

export default auditController;
