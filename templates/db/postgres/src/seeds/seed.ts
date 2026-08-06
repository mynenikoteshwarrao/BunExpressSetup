/**
 * Master seed script — creates default roles and users.
 *
 * Usage:
 *   npx ts-node src/seeds/seed.ts
 *   # or
 *   bun run src/seeds/seed.ts
 *
 * This script is idempotent: it only creates records that do not
 * already exist and never removes existing data.
 *
 * Default credentials (change after first login):
 *   Super Admin — superadmin@app.com / SuperAdmin@123
 *   Admin       — admin@app.com      / Admin@123
 */

import dotenv from 'dotenv';
import { count, eq, or } from 'drizzle-orm';
import { db, connectDB, closeDB } from '../config/database';
import { roles as rolesTable } from '../models/Role';
import { users as usersTable } from '../models/User';
import { userRoles } from '../models/UserRole';
import { hashPassword } from '../services/authService';
import { Task } from '../enums/Task';

dotenv.config();

/* ───────────────────────────── Role definitions ─────────────────────────── */

const roles = [
  {
    name: 'Super Admin',
    description: 'Unrestricted access to every operation in the system',
    tasks: [Task.SUPER_ADMIN],
    isSystem: true,
    isActive: true,
  },
  {
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
  },
];

/* ───────────────────────────── User definitions ─────────────────────────── */

const users = [
  {
    username: 'superadmin',
    email: 'superadmin@app.com',
    password: 'SuperAdmin@123',
    firstName: 'Super',
    lastName: 'Admin',
    authProvider: 'local' as const,
    isEmailVerified: true,
    isActive: true,
    roleName: 'Super Admin', // resolved to a role uuid at runtime
  },
  {
    username: 'admin',
    email: 'admin@app.com',
    password: 'Admin@123',
    firstName: 'App',
    lastName: 'Admin',
    authProvider: 'local' as const,
    isEmailVerified: true,
    isActive: true,
    roleName: 'Admin', // resolved to a role uuid at runtime
  },
];

/* ──────────────────────────────── Seed logic ─────────────────────────────── */

const seed = async (): Promise<void> => {
  try {
    await connectDB();
    console.log('🔗 Connected to PostgreSQL\n');

    // ── 1. Seed Roles ────────────────────────────────────────────────
    console.log('── Seeding Roles ──────────────────────────────────');
    const roleMap = new Map<string, string>();

    for (const roleDef of roles) {
      let [role] = await db.select({ id: rolesTable.id }).from(rolesTable)
        .where(eq(rolesTable.name, roleDef.name)).limit(1);

      if (!role) {
        [role] = await db.insert(rolesTable).values(roleDef).returning({ id: rolesTable.id });
        console.log(`  ✅ Created role: ${roleDef.name}`);
      } else {
        console.log(`  ⏭  Role already exists: ${roleDef.name}`);
      }

      roleMap.set(roleDef.name, role.id);
    }

    // ── 2. Seed Users ────────────────────────────────────────────────
    console.log('\n── Seeding Users ──────────────────────────────────');

    for (const userDef of users) {
      const [existingUser] = await db.select({ id: usersTable.id }).from(usersTable)
        .where(or(eq(usersTable.email, userDef.email), eq(usersTable.username, userDef.username)))
        .limit(1);

      if (existingUser) {
        console.log(`  ⏭  User already exists: ${userDef.username} (${userDef.email})`);
        continue;
      }

      const roleId = roleMap.get(userDef.roleName);
      if (!roleId) {
        console.log(`  ❌ Role not found for user ${userDef.username}: ${userDef.roleName}`);
        continue;
      }

      const { roleName, password, ...userData } = userDef;

      // No pre-save hook here — the seed hashes the password itself.
      await db.transaction(async (tx) => {
        const [created] = await tx.insert(usersTable)
          .values({ ...userData, password: await hashPassword(password) })
          .returning({ id: usersTable.id });
        await tx.insert(userRoles).values({ userId: created.id, roleId });
      });

      console.log(`  ✅ Created user: ${userDef.username} (${userDef.email}) → role: ${userDef.roleName}`);
    }

    // ── Summary ──────────────────────────────────────────────────────
    const [{ value: totalRoles }] = await db.select({ value: count() }).from(rolesTable);
    const [{ value: totalUsers }] = await db.select({ value: count() }).from(usersTable);

    console.log('\n── Summary ────────────────────────────────────────');
    console.log(`  📋 Roles in DB: ${totalRoles}`);
    console.log(`  👤 Users in DB: ${totalUsers}`);
    console.log('\n🎉 Seed completed successfully!');
    console.log('\n💡 Default credentials:');
    console.log('   Super Admin → superadmin@app.com / SuperAdmin@123');
    console.log('   Admin       → admin@app.com      / Admin@123');
    console.log('   ⚠️  Change these passwords after first login!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await closeDB();
    console.log('\n🔒 Database connection closed');
  }
};

seed();
