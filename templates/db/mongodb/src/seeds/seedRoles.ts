/**
 * Seed script — creates the default system roles.
 *
 * Usage:
 *   npx ts-node src/seeds/seedRoles.ts
 *   # or
 *   bun run src/seeds/seedRoles.ts
 *
 * This script is idempotent: it only creates roles that do not
 * already exist, and never removes existing roles or tasks.
 *
 * For seeding both roles AND users, use seed.ts instead:
 *   npm run seed
 */

import dotenv from 'dotenv';
import { connectDB, closeDB } from '../config/database';
import Role from '../models/Role';
import { Task } from '../enums/Task';

dotenv.config();

const seedRoles = async (): Promise<void> => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // ── Super Admin role ─────────────────────────────────────────
    const superAdminExists = await Role.findOne({ name: 'Super Admin' });

    if (!superAdminExists) {
      await Role.create({
        name: 'Super Admin',
        description: 'Unrestricted access to every operation in the system',
        tasks: [Task.SUPER_ADMIN],
        isSystem: true,
        isActive: true,
      });
      console.log('✅ Created Super Admin role');
    } else {
      console.log('⏭  Super Admin role already exists');
    }

    // ── Admin role ───────────────────────────────────────────────
    const adminExists = await Role.findOne({ name: 'Admin' });

    if (!adminExists) {
      await Role.create({
        name: 'Admin',
        description: 'Administrative access for user and role management',
        tasks: [
          Task.VIEW_USERS,
          Task.CREATE_USER,
          Task.UPDATE_USER,
          Task.DELETE_USER,
          Task.MANAGE_USER_ROLES,
        ],
        isSystem: true,
        isActive: true,
      });
      console.log('✅ Created Admin role');
    } else {
      console.log('⏭  Admin role already exists');
    }

    console.log('\n🎉 Role seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await closeDB();
    console.log('Database connection closed');
  }
};

seedRoles();
