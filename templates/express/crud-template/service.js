import { Types } from 'mongoose';
import { {{modelName}}, I{{modelName}} } from '../models/{{modelName}}';
import { AppError } from '../utils/AppError';

interface PaginationOptions {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginationResult {
  {{modelNamePlural}}: I{{modelName}}[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class {{modelName}}Service {
  /**
   * Create a new {{modelNameLower}}
   */
  static async create({{modelNameLower}}Data: Partial<I{{modelName}}>): Promise<I{{modelName}}> {
    const {{modelNameLower}} = new {{modelName}}({{modelNameLower}}Data);
    return await {{modelNameLower}}.save();
  }

  /**
   * Get all {{modelNamePlural}} with pagination and search
   */
  static async getAll(options: PaginationOptions): Promise<PaginationResult> {
    const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    // Build query - exclude soft deleted items
    const query: any = { isDeleted: { $ne: true } };
    
    // Add search functionality if search term provided
    if (search) {
      query.$or = [
        // Add searchable fields here based on your model
        // Example: { name: { $regex: search, $options: 'i' } },
        // Example: { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [{{modelNamePlural}}, total] = await Promise.all([
      {{modelName}}.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean(),
      {{modelName}}.countDocuments(query)
    ]);

    const pages = Math.ceil(total / limit);

    return {
      {{modelNamePlural}},
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get {{modelNameLower}} by ID
   */
  static async getById(id: string, includeDeleted: boolean = false): Promise<I{{modelName}} | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid {{modelNameLower}} ID', 400);
    }

    const query: any = { _id: id };
    if (!includeDeleted) {
      query.isDeleted = { $ne: true };
    }

    return await {{modelName}}.findOne(query).lean();
  }

  /**
   * Update {{modelNameLower}}
   */
  static async update(id: string, updates: Partial<I{{modelName}}>): Promise<I{{modelName}} | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid {{modelNameLower}} ID', 400);
    }

    // Exclude audit fields from updates
    const { isDeleted, deletedAt, deletedBy, createdAt, updatedAt, ...allowedUpdates } = updates;

    const updated{{modelName}} = await {{modelName}}.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: allowedUpdates },
      { new: true, lean: true }
    );

    if (!updated{{modelName}}) {
      throw new AppError('{{modelName}} not found', 404);
    }

    return updated{{modelName}};
  }

  /**
   * Soft delete {{modelNameLower}}
   */
  static async softDelete(id: string, deletedBy: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid {{modelNameLower}} ID', 400);
    }

    const result = await {{modelName}}.updateOne(
      { _id: id, isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: new Types.ObjectId(deletedBy)
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new AppError('{{modelName}} not found', 404);
    }
  }

  /**
   * Restore soft deleted {{modelNameLower}}
   */
  static async restore(id: string, restoredBy: string): Promise<I{{modelName}} | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid {{modelNameLower}} ID', 400);
    }

    const restored{{modelName}} = await {{modelName}}.findOneAndUpdate(
      { _id: id, isDeleted: true },
      {
        $unset: {
          isDeleted: 1,
          deletedAt: 1,
          deletedBy: 1
        }
      },
      { new: true, lean: true }
    );

    return restored{{modelName}};
  }

  /**
   * Permanently delete {{modelNameLower}} (use with caution)
   */
  static async hardDelete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid {{modelNameLower}} ID', 400);
    }

    const result = await {{modelName}}.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      throw new AppError('{{modelName}} not found', 404);
    }
  }

  /**
   * Get deleted {{modelNamePlural}}
   */
  static async getDeleted(options: PaginationOptions): Promise<PaginationResult> {
    const { page, limit, sortBy = 'deletedAt', sortOrder = 'desc' } = options;
    
    const query = { isDeleted: true };
    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [{{modelNamePlural}}, total] = await Promise.all([
      {{modelName}}.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .populate('deletedBy', 'username email firstName lastName')
        .lean(),
      {{modelName}}.countDocuments(query)
    ]);

    const pages = Math.ceil(total / limit);

    return {
      {{modelNamePlural}},
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      }
    };
  }
}