/**
 * Sprintly - Database Reset Script
 *
 * Deletes ALL data from every table, then re-seeds the admin user and
 * default labels so the application is immediately usable.
 *
 * Tables are truncated (not dropped) — schema stays intact.
 *
 * Usage:
 *   npx ts-node scripts/reset.ts          # local
 *   docker compose run --rm reset          # Docker
 *
 * Prerequisites:
 *   - Tables must already exist (run migrate.ts first)
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME = process.env.DB_NAME || 'sprintly';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'alwin.kunjachan@zeronorth.com';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Alwin Kunjachan';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

async function run() {
  console.log('=== Sprintly Database Reset ===\n');

  const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false,
  });

  await sequelize.authenticate();

  // ── Step 1: Truncate all tables (order matters for FK constraints) ───
  console.log('[1/3] Clearing all data...');
  await sequelize.query('TRUNCATE TABLE issue_labels CASCADE');
  console.log('  ✓ issue_labels');
  await sequelize.query('TRUNCATE TABLE issues CASCADE');
  console.log('  ✓ issues');
  await sequelize.query('TRUNCATE TABLE cycles CASCADE');
  console.log('  ✓ cycles');
  await sequelize.query('TRUNCATE TABLE projects CASCADE');
  console.log('  ✓ projects');
  await sequelize.query('TRUNCATE TABLE labels CASCADE');
  console.log('  ✓ labels');
  await sequelize.query('TRUNCATE TABLE members CASCADE');
  console.log('  ✓ members');

  // ── Step 2: Re-seed admin user ───────────────────────────────────────
  console.log('[2/3] Seeding admin user...');
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await sequelize.query(
    `INSERT INTO members (id, name, email, password_hash, provider, role, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'local', 'admin', NOW(), NOW())`,
    { bind: [ADMIN_NAME, ADMIN_EMAIL, hash] },
  );
  console.log(`  ✓ Admin: ${ADMIN_EMAIL}`);

  // ── Step 3: Re-seed default labels ───────────────────────────────────
  console.log('[3/3] Seeding labels...');
  const labels = [
    { name: 'Bug', color: '#EF4444' },
    { name: 'Feature', color: '#3B82F6' },
    { name: 'Improvement', color: '#8B5CF6' },
    { name: 'Design', color: '#F59E0B' },
    { name: 'Documentation', color: '#10B981' },
    { name: 'Performance', color: '#F97316' },
    { name: 'Security', color: '#DC2626' },
    { name: 'Testing', color: '#14B8A6' },
  ];
  for (const label of labels) {
    await sequelize.query(
      `INSERT INTO labels (id, name, color, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())`,
      { bind: [label.name, label.color] },
    );
  }
  console.log(`  ✓ ${labels.length} labels`);

  // ── Flush Redis cache ────────────────────────────────────────────────
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(redisUrl);
      await redis.flushall();
      await redis.quit();
      console.log('  ✓ Redis cache flushed');
    } catch {
      console.log('  ⚠ Could not flush Redis (non-critical)');
    }
  }

  await sequelize.close();

  console.log('\n=== Reset complete ===');
  console.log(`Database "${DB_NAME}" is now empty with admin + labels.`);
  console.log(`Admin: ${ADMIN_EMAIL}`);
}

run().catch((err) => {
  console.error('\n✗ Reset failed:', err.message);
  process.exit(1);
});
