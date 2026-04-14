/**
 * Sprintly - Database Seed Script
 *
 * Seeds sample data (members, projects, cycles, issues, issue-labels) for
 * testing and demo purposes.  The admin user and default labels are created
 * first via the regular migration path so they are always present.
 *
 * Idempotent — safe to run multiple times (skips if projects already exist).
 *
 * Usage:
 *   npx ts-node scripts/seed.ts          # local
 *   docker compose run --rm seed          # Docker
 *
 * Prerequisites:
 *   - Tables must already exist (run migrate.ts first)
 */

import { Sequelize, QueryTypes } from 'sequelize';
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
  console.log('=== Sprintly Database Seed ===\n');

  const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false,
  });

  await sequelize.authenticate();

  // ── Ensure admin user exists ─────────────────────────────────────────
  console.log('[1/6] Ensuring admin user...');
  const [adminRows] = await sequelize.query(
    'SELECT id FROM members WHERE email = $1',
    { bind: [ADMIN_EMAIL] },
  );
  let adminId: string;
  if ((adminRows as any[]).length === 0) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const [inserted] = await sequelize.query(
      `INSERT INTO members (id, name, email, password_hash, provider, role, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'local', 'admin', NOW(), NOW())
       RETURNING id`,
      { bind: [ADMIN_NAME, ADMIN_EMAIL, hash] },
    );
    adminId = (inserted as any[])[0].id;
    console.log(`  ✓ Created admin: ${ADMIN_EMAIL}`);
  } else {
    adminId = (adminRows as any[])[0].id;
    console.log(`  ✓ Admin exists: ${ADMIN_EMAIL}`);
  }

  // ── Ensure default labels ────────────────────────────────────────────
  console.log('[2/6] Ensuring labels...');
  const defaultLabels = [
    { name: 'Bug', color: '#EF4444' },
    { name: 'Feature', color: '#3B82F6' },
    { name: 'Improvement', color: '#8B5CF6' },
    { name: 'Design', color: '#F59E0B' },
    { name: 'Documentation', color: '#10B981' },
    { name: 'Performance', color: '#F97316' },
    { name: 'Security', color: '#DC2626' },
    { name: 'Testing', color: '#14B8A6' },
  ];
  for (const label of defaultLabels) {
    await sequelize.query(
      `INSERT INTO labels (id, name, color, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
       ON CONFLICT (name) DO NOTHING`,
      { bind: [label.name, label.color] },
    );
  }
  console.log('  ✓ Labels ready');

  // ── Check if seed data already exists ────────────────────────────────
  const [projectCheck] = await sequelize.query(
    "SELECT COUNT(*) as count FROM projects",
    { type: QueryTypes.SELECT },
  );
  if (parseInt((projectCheck as any).count, 10) > 0) {
    console.log('\n  ⚠ Projects already exist — skipping seed. Run db:reset first to re-seed.');
    await sequelize.close();
    return;
  }

  // ── Seed sample members ──────────────────────────────────────────────
  console.log('[3/6] Seeding sample members...');
  const memberPassword = await bcrypt.hash('password123', 12);
  const sampleMembers = [
    { name: 'Alice Johnson', email: 'alice@sprintly.io' },
    { name: 'Bob Smith', email: 'bob@sprintly.io' },
    { name: 'Charlie Lee', email: 'charlie@sprintly.io' },
    { name: 'Diana Chen', email: 'diana@sprintly.io' },
  ];
  const memberIds: string[] = [adminId];
  for (const m of sampleMembers) {
    const [existing] = await sequelize.query(
      'SELECT id FROM members WHERE email = $1',
      { bind: [m.email] },
    );
    if ((existing as any[]).length === 0) {
      const [inserted] = await sequelize.query(
        `INSERT INTO members (id, name, email, password_hash, provider, role, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'local', 'user', NOW(), NOW())
         RETURNING id`,
        { bind: [m.name, m.email, memberPassword] },
      );
      memberIds.push((inserted as any[])[0].id);
    } else {
      memberIds.push((existing as any[])[0].id);
    }
  }
  console.log(`  ✓ ${sampleMembers.length} sample members`);

  // ── Fetch label IDs ──────────────────────────────────────────────────
  const [labelRows] = await sequelize.query('SELECT id, name FROM labels');
  const labelMap = new Map<string, string>();
  for (const l of labelRows as any[]) {
    labelMap.set(l.name, l.id);
  }

  // ── Seed projects ────────────────────────────────────────────────────
  console.log('[4/6] Seeding projects...');
  const projects = [
    { name: 'Sprintly Platform', identifier: 'SPR', description: 'Core platform development for Sprintly issue tracker', issueCounter: 15 },
    { name: 'Mobile App', identifier: 'MOB', description: 'React Native mobile client for Sprintly', issueCounter: 8 },
    { name: 'DevOps & Infra', identifier: 'DEV', description: 'Infrastructure, CI/CD pipelines, and deployment automation', issueCounter: 5 },
  ];
  const projectIds: string[] = [];
  for (const p of projects) {
    const [inserted] = await sequelize.query(
      `INSERT INTO projects (id, name, identifier, description, issue_counter, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW() - INTERVAL '60 days', NOW())
       RETURNING id`,
      { bind: [p.name, p.identifier, p.description, p.issueCounter] },
    );
    projectIds.push((inserted as any[])[0].id);
  }
  console.log(`  ✓ ${projects.length} projects`);

  // ── Seed cycles ──────────────────────────────────────────────────────
  console.log('[5/6] Seeding cycles...');
  const cyclesDef = [
    // SPR
    { name: 'Sprint 1 - Foundation', desc: 'Initial setup and core features', start: '2026-03-02', end: '2026-03-15', status: 'completed', proj: 0 },
    { name: 'Sprint 2 - Auth & Roles', desc: 'Authentication and RBAC', start: '2026-03-16', end: '2026-03-29', status: 'completed', proj: 0 },
    { name: 'Sprint 3 - Polish', desc: 'UI polish, bug fixes, performance', start: '2026-03-30', end: '2026-04-12', status: 'active', proj: 0 },
    { name: 'Sprint 4 - Analytics', desc: 'Admin dashboard and reporting', start: '2026-04-13', end: '2026-04-26', status: 'upcoming', proj: 0 },
    // MOB
    { name: 'Sprint 1 - Setup', desc: 'Project scaffolding and navigation', start: '2026-03-16', end: '2026-03-29', status: 'completed', proj: 1 },
    { name: 'Sprint 2 - Core Screens', desc: 'Issue list and detail screens', start: '2026-03-30', end: '2026-04-12', status: 'active', proj: 1 },
    // DEV
    { name: 'Sprint 1 - Docker & CI', desc: 'Dockerize all services and setup CI', start: '2026-04-01', end: '2026-04-14', status: 'active', proj: 2 },
  ];
  const cycleIds: string[] = [];
  for (const c of cyclesDef) {
    const [inserted] = await sequelize.query(
      `INSERT INTO cycles (id, name, description, start_date, end_date, status, project_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::enum_cycles_status, $6, NOW(), NOW())
       RETURNING id`,
      { bind: [c.name, c.desc, c.start, c.end, c.status, projectIds[c.proj]] },
    );
    cycleIds.push((inserted as any[])[0].id);
  }
  console.log(`  ✓ ${cyclesDef.length} cycles`);

  // ── Seed issues ──────────────────────────────────────────────────────
  console.log('[6/6] Seeding issues...');

  // Helper: m(index) → memberIds[index], c(index) → cycleIds[index]
  const m = (i: number) => memberIds[i] || null;
  const cy = (i: number) => cycleIds[i] || null;

  interface IssueDef {
    ident: string; num: number; title: string; desc: string;
    status: string; priority: string; proj: number;
    assignee: string | null; cycle: string | null; labels: string[];
  }

  const issues: IssueDef[] = [
    // ── SPR (project 0) ─── Sprint 1 (cycle 0, completed)
    { ident: 'SPR-1', num: 1, title: 'Setup Express server with TypeScript', desc: 'Initialize the backend with Express, TypeScript, and folder structure.', status: 'done', priority: 'urgent', proj: 0, assignee: m(0), cycle: cy(0), labels: ['Feature'] },
    { ident: 'SPR-2', num: 2, title: 'Setup PostgreSQL with Sequelize ORM', desc: 'Configure database connection, create base models, and migration script.', status: 'done', priority: 'urgent', proj: 0, assignee: m(0), cycle: cy(0), labels: ['Feature'] },
    { ident: 'SPR-3', num: 3, title: 'Create project CRUD API endpoints', desc: 'Implement create, read, update, delete for projects.', status: 'done', priority: 'high', proj: 0, assignee: m(1), cycle: cy(0), labels: ['Feature'] },
    { ident: 'SPR-4', num: 4, title: 'Create issue CRUD API endpoints', desc: 'Implement CRUD for issues with filtering support.', status: 'done', priority: 'high', proj: 0, assignee: m(1), cycle: cy(0), labels: ['Feature'] },
    // Sprint 2 (cycle 1, completed)
    { ident: 'SPR-5', num: 5, title: 'Implement JWT authentication', desc: 'Add access/refresh token flow with passport-local strategy.', status: 'done', priority: 'urgent', proj: 0, assignee: m(0), cycle: cy(1), labels: ['Security'] },
    { ident: 'SPR-6', num: 6, title: 'Add Google OAuth SSO', desc: 'Integrate Google OAuth 2.0 for single sign-on.', status: 'done', priority: 'high', proj: 0, assignee: m(0), cycle: cy(1), labels: ['Security', 'Feature'] },
    { ident: 'SPR-7', num: 7, title: 'Implement role-based access control', desc: 'Add admin/user roles with route guards and middleware.', status: 'done', priority: 'high', proj: 0, assignee: m(2), cycle: cy(1), labels: ['Security'] },
    { ident: 'SPR-8', num: 8, title: 'Add login attempt limiting and account blocking', desc: 'Block after 5 failed attempts with 30-min auto-unlock.', status: 'done', priority: 'medium', proj: 0, assignee: m(2), cycle: cy(1), labels: ['Security'] },
    // Sprint 3 (cycle 2, active)
    { ident: 'SPR-9', num: 9, title: 'Fix sidebar not collapsing on mobile', desc: 'Sidebar stays expanded on viewports under 768px.', status: 'done', priority: 'high', proj: 0, assignee: m(3), cycle: cy(2), labels: ['Bug', 'Design'] },
    { ident: 'SPR-10', num: 10, title: 'Implement Redis caching for API responses', desc: 'Add cache-aside pattern with TTLs. Graceful degradation.', status: 'in_progress', priority: 'high', proj: 0, assignee: m(0), cycle: cy(2), labels: ['Performance', 'Feature'] },
    { ident: 'SPR-11', num: 11, title: 'Add dark mode theme support', desc: 'Implement theme toggle with CSS custom properties.', status: 'testing_in_progress', priority: 'medium', proj: 0, assignee: m(1), cycle: cy(2), labels: ['Design', 'Improvement'] },
    { ident: 'SPR-12', num: 12, title: 'Pagination for issue and project lists', desc: 'Support page/pageSize query params with MatPaginator.', status: 'ready_to_test', priority: 'medium', proj: 0, assignee: m(2), cycle: cy(2), labels: ['Improvement'] },
    { ident: 'SPR-13', num: 13, title: 'Add idle timeout with session expiry dialog', desc: 'Show warning after 10 min idle with 30-sec countdown.', status: 'todo', priority: 'low', proj: 0, assignee: m(3), cycle: cy(2), labels: ['Feature'] },
    // Sprint 4 (cycle 3, upcoming)
    { ident: 'SPR-14', num: 14, title: 'Build admin analytics dashboard', desc: 'Charts for issue trends, project activity, team velocity.', status: 'backlog', priority: 'high', proj: 0, assignee: null, cycle: cy(3), labels: ['Feature', 'Design'] },
    { ident: 'SPR-15', num: 15, title: 'Add Helmet.js security headers', desc: 'Configure Helmet with CSP and security headers for production.', status: 'backlog', priority: 'urgent', proj: 0, assignee: null, cycle: cy(3), labels: ['Security'] },

    // ── MOB (project 1) ─── Sprint 1 (cycle 4, completed)
    { ident: 'MOB-1', num: 1, title: 'Initialize React Native project', desc: 'Setup RN with TypeScript, navigation, and project structure.', status: 'done', priority: 'urgent', proj: 1, assignee: m(1), cycle: cy(4), labels: ['Feature'] },
    { ident: 'MOB-2', num: 2, title: 'Setup authentication flow', desc: 'Login/register screens with JWT token storage.', status: 'done', priority: 'urgent', proj: 1, assignee: m(1), cycle: cy(4), labels: ['Security', 'Feature'] },
    { ident: 'MOB-3', num: 3, title: 'Configure API client with interceptors', desc: 'Setup Axios with auth headers and token refresh interceptor.', status: 'done', priority: 'high', proj: 1, assignee: m(3), cycle: cy(4), labels: ['Feature'] },
    // Sprint 2 (cycle 5, active)
    { ident: 'MOB-4', num: 4, title: 'Build issue list screen with filters', desc: 'Display issues with status/priority chips and filter bottom sheet.', status: 'in_progress', priority: 'high', proj: 1, assignee: m(1), cycle: cy(5), labels: ['Feature'] },
    { ident: 'MOB-5', num: 5, title: 'Build issue detail screen', desc: 'Full details with edit capability, assignee picker, label selector.', status: 'todo', priority: 'high', proj: 1, assignee: m(3), cycle: cy(5), labels: ['Feature'] },
    { ident: 'MOB-6', num: 6, title: 'Push notifications for issue assignments', desc: 'Setup Firebase Cloud Messaging for real-time notifications.', status: 'backlog', priority: 'medium', proj: 1, assignee: null, cycle: cy(5), labels: ['Feature'] },
    { ident: 'MOB-7', num: 7, title: 'Fix keyboard overlapping input fields on Android', desc: 'KeyboardAvoidingView not working correctly on Android.', status: 'in_progress', priority: 'urgent', proj: 1, assignee: m(2), cycle: cy(5), labels: ['Bug'] },
    { ident: 'MOB-8', num: 8, title: 'Add offline mode with local SQLite cache', desc: 'Cache issues locally so the app works without network.', status: 'backlog', priority: 'low', proj: 1, assignee: null, cycle: null, labels: ['Feature', 'Performance'] },

    // ── DEV (project 2) ─── Sprint 1 (cycle 6, active)
    { ident: 'DEV-1', num: 1, title: 'Create Docker Compose setup', desc: 'Multi-service Docker Compose with nginx, Express, PostgreSQL, Redis.', status: 'done', priority: 'urgent', proj: 2, assignee: m(0), cycle: cy(6), labels: ['Feature'] },
    { ident: 'DEV-2', num: 2, title: 'Setup nginx reverse proxy for API', desc: 'Configure nginx to serve Angular SPA and proxy /api/*.', status: 'done', priority: 'high', proj: 2, assignee: m(0), cycle: cy(6), labels: ['Feature'] },
    { ident: 'DEV-3', num: 3, title: 'Add health check endpoints', desc: 'Add /health endpoint. Configure Docker healthchecks.', status: 'in_progress', priority: 'medium', proj: 2, assignee: m(2), cycle: cy(6), labels: ['Improvement', 'Testing'] },
    { ident: 'DEV-4', num: 4, title: 'Setup GitHub Actions CI pipeline', desc: 'Automated testing, linting, and build verification on PRs.', status: 'todo', priority: 'high', proj: 2, assignee: null, cycle: cy(6), labels: ['Feature', 'Testing'] },
    { ident: 'DEV-5', num: 5, title: 'Configure production environment variables', desc: 'Document and validate all required env vars with startup checks.', status: 'backlog', priority: 'medium', proj: 2, assignee: null, cycle: null, labels: ['Documentation', 'Security'] },
  ];

  for (const issue of issues) {
    const [inserted] = await sequelize.query(
      `INSERT INTO issues (id, identifier, number, title, description, status, priority, project_id, assignee_id, cycle_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::enum_issues_status, $6::enum_issues_priority, $7, $8, $9, NOW(), NOW())
       RETURNING id`,
      { bind: [issue.ident, issue.num, issue.title, issue.desc, issue.status, issue.priority, projectIds[issue.proj], issue.assignee, issue.cycle] },
    );
    const issueId = (inserted as any[])[0].id;

    // Attach labels
    for (const labelName of issue.labels) {
      const labelId = labelMap.get(labelName);
      if (labelId) {
        await sequelize.query(
          `INSERT INTO issue_labels (issue_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          { bind: [issueId, labelId] },
        );
      }
    }
  }
  console.log(`  ✓ ${issues.length} issues with labels`);

  await sequelize.close();

  console.log('\n=== Seed complete ===');
  console.log(`Admin:    ${ADMIN_EMAIL} / password123`);
  console.log(`Members:  ${sampleMembers.map(m => m.email).join(', ')} / password123`);
  console.log(`Projects: ${projects.map(p => p.identifier).join(', ')}`);
}

run().catch((err) => {
  console.error('\n✗ Seed failed:', err.message);
  process.exit(1);
});
