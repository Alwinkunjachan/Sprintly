# Server Documentation

The Sprintly server is a TypeScript Express 4 REST API backed by PostgreSQL (via Sequelize) and an optional Redis cache. It handles authentication (local + Google OAuth), authorization, validation, business logic, and analytics for the Sprintly issue tracker.

---

## 1. Tech Stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js (TypeScript 5.7) |
| HTTP | Express 4 |
| ORM | Sequelize 6 + `pg` driver (PostgreSQL) |
| Validation | Zod 3 |
| Auth | Passport.js (`passport-local`, `passport-google-oauth20`) + JWT (`jsonwebtoken`) |
| Hashing | `bcryptjs` (cost factor 12) |
| Security | `helmet`, `express-rate-limit`, login-attempt lockout |
| Cache | `ioredis` (graceful degradation) |
| Sessions | `express-session` (used only by Google OAuth handshake) |
| Tooling | `nodemon`, `ts-node` |

Run scripts ([server/package.json](../server/package.json)):

```bash
npm run dev        # nodemon, port 3000
npm run build      # tsc -> dist/
npm start          # node dist/index.js
npm run db:setup   # migrate + seed admin + 8 default labels
npm run db:seed    # sample projects, cycles, issues
npm run db:reset   # wipe and re-seed
```

---

## 2. Folder Layout

```
server/src/
├── index.ts              # Bootstrap (DB + Redis + cycle sweeper + listen)
├── app.ts                # Express app: helmet, CORS, body-parser, session, passport, routes
├── config/
│   ├── environment.ts    # Loads .env, enforces required vars in production
│   ├── database.ts       # Sequelize instance (postgres, underscored, no logging)
│   ├── redis.ts          # ioredis client (lazy connect, retry strategy)
│   └── passport.ts       # Local + Google strategies, login-attempt limiter
├── routes/               # Route definitions per resource
│   ├── index.ts          # Mounts all routers under /api/v1, applies global authenticate
│   ├── auth.routes.ts    # public, with auth-specific rate limiter
│   ├── project.routes.ts
│   ├── issue.routes.ts
│   ├── cycle.routes.ts
│   ├── label.routes.ts
│   ├── member.routes.ts  # admin-only sub-routes use requireAdmin
│   └── analytics.routes.ts # admin-only
├── controllers/          # Thin HTTP layer — delegates to services, formats responses
├── services/             # Business logic + cache invalidation
├── models/               # Sequelize models + index.ts wires associations
├── middleware/
│   ├── authenticate.ts   # JWT verify, member cache lookup, attaches req.member
│   ├── admin.ts          # requireAdmin
│   ├── validate.ts       # Zod-based request body validation
│   └── error-handler.ts  # ApiError -> JSON, otherwise 500
├── utils/
│   ├── api-error.ts      # Typed error class with helper factories
│   ├── jwt.ts            # generate/verify access & refresh tokens
│   └── cache.ts          # Redis cache-aside helpers (get/set/del/invalidate, hashKey)
└── scripts/              # migrate.ts, seed.ts, reset.ts (run via ts-node)
```

---

## 3. Bootstrap — [server/src/index.ts](../server/src/index.ts)

On `bootstrap()`:

1. `sequelize.authenticate()` — fail fast if PostgreSQL is unreachable.
2. `redis.connect()` — best-effort. On failure, `setRedisAvailable(false)` and the app continues without cache.
3. **First-run admin seed** — if `Member.count() === 0`, inserts `Alwin Kunjachan / alwin.kunjachan@zeronorth.com` with role `admin` and password `password123`.
4. **Cycle sweeper** — `cycleService.checkExpiredCycles()` runs immediately and then every hour. Auto-completes any cycle past its `endDate`, moving incomplete issues back to backlog (see § 7.4).
5. `app.listen(env.port)` — defaults to port 3000.

If any step fails, `process.exit(1)`.

---

## 4. App Wiring — [server/src/app.ts](../server/src/app.ts)

Middleware stack, in order:

1. `helmet()` — security headers (CSP, X-Frame-Options, etc.)
2. `cors({ origin: env.clientUrl, credentials: true })`
3. `express.json({ limit: '1mb' })` and `urlencoded` with the same limit — guard against runaway payloads.
4. **Global rate limiter** — `100 req / 15 min` in production, `1000` in development.
5. `express-session` (24h cookie, `httpOnly`, `secure` in prod, `sameSite: 'lax'`) — only required for the OAuth handshake.
6. `passport.initialize()` + `passport.session()`.
7. `app.use('/api/v1', routes)` — see § 5.
8. `GET /health` — returns `{ status: 'ok', redis: 'connected' | 'unavailable' }`.
9. `errorHandler` — must be last.

---

## 5. Routes

All API routes live under `/api/v1`. The mount point is in [routes/index.ts](../server/src/routes/index.ts):

```ts
router.use('/auth', authRoutes);   // public

router.use(authenticate);          // global JWT middleware below
router.use('/projects',  projectRoutes);
router.use('/issues',    issueRoutes);
router.use('/labels',    labelRoutes);
router.use('/cycles',    cycleRoutes);
router.use('/members',   memberRoutes);
router.use('/analytics', analyticsRoutes);
```

So **every non-auth route requires a valid Bearer token**. Admin-only sub-routes layer `requireAdmin` on top.

### 5.1 Auth — [routes/auth.routes.ts](../server/src/routes/auth.routes.ts)

A second, stricter rate limiter (`10 / 15 min` in prod, `100` in dev) is applied to `register`, `login`, and `refresh`.

| Method | Path | Auth | Body / Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | `{ name, email, password (≥8) }` — Zod-validated |
| POST | `/auth/login` | public | `{ email, password }` — passport-local |
| POST | `/auth/refresh` | public | `{ refreshToken }` |
| GET | `/auth/me` | bearer | Returns sanitized current member |
| POST | `/auth/logout` | bearer | Stateless — client discards tokens |
| GET | `/auth/google` | public | OAuth start (only mounted if Google creds set) |
| GET | `/auth/google/callback` | public | Redirects back to client with tokens in query |

### 5.2 Projects — [routes/project.routes.ts](../server/src/routes/project.routes.ts)

`GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`. Identifier must be 2–5 chars and is uppercased on create.

### 5.3 Issues — [routes/issue.routes.ts](../server/src/routes/issue.routes.ts)

Full CRUD. Status enum: `backlog | todo | in_progress | ready_to_test | testing_in_progress | done | cancelled`. Priority enum: `urgent | high | medium | low | none`. List supports filters (`projectId`, `status`, `priority`, `assigneeId`, `cycleId`, `labelId`, `search`, `sort`, `order`) and pagination (`page`, `pageSize`, max 100).

### 5.4 Cycles — [routes/cycle.routes.ts](../server/src/routes/cycle.routes.ts)

Full CRUD. Dates are `YYYY-MM-DD`. Status enum: `upcoming | active | completed`. If status is omitted on create, it's inferred from the date range.

### 5.5 Labels — [routes/label.routes.ts](../server/src/routes/label.routes.ts)

`GET /`, `POST /`, `PATCH /:id`, `DELETE /:id`. Color must match `^#[0-9A-Fa-f]{6}$`. Labels are global — not scoped per project.

### 5.6 Members — [routes/member.routes.ts](../server/src/routes/member.routes.ts)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/members` | bearer | All members (sanitized) |
| GET | `/members/users` | **admin** | Non-admin members (for the user-management tab) |
| POST | `/members` | bearer | Manual member creation (no password) |
| PATCH | `/members/:id` | bearer | Profile fields |
| PATCH | `/members/:id/toggle-block` | **admin** | Block/unblock; never blocks an admin |

### 5.7 Analytics — [routes/analytics.routes.ts](../server/src/routes/analytics.routes.ts)

`GET /analytics/dashboard` — admin only. Aggregated dashboard payload (see § 7.6).

---

## 6. Middleware

### 6.1 [authenticate.ts](../server/src/middleware/authenticate.ts)

1. Read `Authorization: Bearer <token>` (else 401).
2. `verifyAccessToken(token)` — throws `ApiError.unauthorized` on bad/expired token.
3. **Cache-aside lookup** of `Member` by `payload.sub`:
   - `cacheGet('sprintly:member:<id>')` — hit → rebuild `Member.build(cached, { isNewRecord: false })`.
   - Miss → `Member.findByPk` and `cacheSet(..., 300s)`.
4. Attaches `req.member` (TypeScript module augmentation in the same file extends `Express.Request`).

This makes admin checks O(1) on cache hits and avoids a DB hit per authenticated request.

### 6.2 [admin.ts](../server/src/middleware/admin.ts)

Single guard: `req.member.role === 'admin'` or `ApiError.unauthorized('Admin access required')`.

### 6.3 [validate.ts](../server/src/middleware/validate.ts)

Factory: `validate(schema: ZodSchema)` parses `req.body` and replaces it with the validated object. On `ZodError`, responds **400** with `{ error: { message: 'Validation failed', details: [{ field, message }] } }`. Schemas are defined inline at the top of each route file.

### 6.4 [error-handler.ts](../server/src/middleware/error-handler.ts)

The terminal middleware. If the error is an `ApiError`, returns its `statusCode` and JSON `{ error: { message, statusCode } }`. Otherwise logs the stack and returns a generic 500. Always last in the chain.

---

## 7. Services & Business Logic

Controllers ([server/src/controllers/](../server/src/controllers/)) are intentionally thin: parse input → delegate to a service → return JSON. All business logic lives in services, all of which are singleton class exports (e.g. `export const issueService = new IssueService()`). Caching is applied **inside** services so caches are kept consistent even when one service calls another.

### 7.1 AuthService — [services/auth.service.ts](../server/src/services/auth.service.ts)

- **register** — checks email uniqueness; checks name uniqueness case-insensitively (`Op.iLike`); hashes password (`bcrypt`, cost 12); creates member; returns `{ member, accessToken, refreshToken }`.
- **login** — receives the `Member` already validated by passport-local; just generates tokens.
- **refresh** — `verifyRefreshToken` → reissue both tokens.
- **getProfile** — `findByPk` then sanitize.
- **sanitizeMember** strips `passwordHash` from every response.

JWT details ([utils/jwt.ts](../server/src/utils/jwt.ts)): payload `{ sub: id, email }`. Defaults: access token `15m`, refresh token `7d` (overridable via `JWT_*_EXPIRES_IN`).

### 7.2 Passport — [config/passport.ts](../server/src/config/passport.ts)

**Local strategy** with login-attempt lockout (`MAX_LOGIN_ATTEMPTS = 5`, `LOCKOUT_DURATION_MS = 30 min`):

- If member is blocked with reason `max_attempts` and the lockout window has passed → auto-unlock (clear `blocked`, `failedLoginAttempts`, `blockedReason`, `blockedAt`).
- If member is blocked for any other reason (e.g. `admin`) → reject. **Admin blocks never auto-unlock.**
- If password mismatch:
  - Increment `failedLoginAttempts`.
  - At ≥5, set `blocked = true`, `blockedReason = 'max_attempts'`, `blockedAt = now`. Reject with the lockout message.
  - Below 5, return `Invalid email or password. N attempt(s) remaining.`
- On success, reset `failedLoginAttempts` to 0.

Password hashes are excluded by default — use `Member.scope('withPassword').findOne(...)` here.

**Google strategy** is only registered if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Lookup order: by `googleId`, then by email. If found by email, link `googleId` to the existing local account (and back-fill avatar). Otherwise, create a new member with `provider: 'google'`. Blocked members are rejected.

### 7.3 IssueService — [services/issue.service.ts](../server/src/services/issue.service.ts)

- **findAll(filters)** — builds `where` from `projectId`, `assigneeId`, `cycleId`, comma-separated `status`/`priority` lists, case-insensitive `title` search, optional `labelId` (joined via the labels include). Includes `project`, `assignee`, `labels`. Supports pagination (`page`, `pageSize`) returning `{ data, total, page, pageSize }`; otherwise returns a flat array.
- **create(data)** — wraps in a transaction, atomically increments `Project.issueCounter`, builds the identifier `<projectIdentifier>-<n>`, creates the issue, bulk-inserts label associations, then commits. Cache invalidation: `issues:*`, `projects:*`, `analytics:*`.
- **update(id, data)** — updates fields; if `labelIds` is present, deletes existing `IssueLabel` rows and inserts the new set.
- **delete(id)** — removes label joins, then the issue.

### 7.4 CycleService — [services/cycle.service.ts](../server/src/services/cycle.service.ts)

- Auto-status on create from today vs. start/end.
- **handleCycleCompletion(cycleId)** — `Issue.update({ status: 'backlog', cycleId: null }, { where: { cycleId, status: notIn ['done', 'cancelled'] } })`. Used both when manually setting a cycle to completed and by the sweeper.
- **checkExpiredCycles()** — finds cycles with `endDate < today` and `status !== 'completed'`; for each, runs `handleCycleCompletion` and sets status to completed. Called on startup and hourly from `index.ts`.

### 7.5 ProjectService — [services/project.service.ts](../server/src/services/project.service.ts)

`findAll` supports pagination and decorates each project with `issueCount` via a SQL subquery: `(SELECT COUNT(*) FROM issues WHERE issues.project_id = "Project"."id")`. `create` uppercases the identifier. `delete` cascades cache invalidation across `projects:*`, `issues:*`, `analytics:*`.

### 7.6 AnalyticsService — [services/analytics.service.ts](../server/src/services/analytics.service.ts)

Single endpoint: `GET /analytics/dashboard`. Runs 14 queries in parallel (`Promise.all`) — counts plus six raw SQL aggregations (status, priority, per-project, top assignees, overdue cycles, recent issues, 30-day creation trend). Computes `openIssues` and `completionRate` from the status breakdown. Cached for 10 min.

### 7.7 MemberService — [services/member.service.ts](../server/src/services/member.service.ts)

- **toggleBlock(id)** — refuses to block admins (`ApiError.badRequest`). Block sets `blockedReason: 'admin'`, `blockedAt: now`. Unblock clears `blocked`, `failedLoginAttempts`, `blockedReason`, `blockedAt`. Critically, deletes the member's session cache (`sprintly:member:<id>`) so the change takes effect on the next request without waiting for TTL.

### 7.8 LabelService — [services/label.service.ts](../server/src/services/label.service.ts)

Standard CRUD. Labels are global (not project-scoped). On update/delete, also invalidates `issues:*` since label payloads are denormalized into issue responses.

---

## 8. Models — [server/src/models/](../server/src/models/)

All models use `underscored: true` (camelCase in TS, `snake_case` in DB), `timestamps: true` (`created_at`, `updated_at`), and `id: UUID v4`.

| Model | Notable fields |
| --- | --- |
| `Project` | `name`, `identifier` (2–5 uppercase, unique), `issueCounter` (atomically incremented) |
| `Issue` | `identifier` (`PROJ-123`, unique), `number`, ENUM `status`, ENUM `priority`, `projectId`, `assigneeId`, `cycleId` — composite unique index on `(project_id, number)` |
| `Cycle` | `name`, `startDate`/`endDate` (DATEONLY), ENUM `status`, `projectId` |
| `Member` | `email` (unique), `passwordHash` (nullable for OAuth users), `googleId` (unique, nullable), `provider`, `role` (`'user' \| 'admin'`), `blocked`, `failedLoginAttempts`, `blockedReason`, `blockedAt`. `defaultScope` excludes `passwordHash`; `withPassword` scope includes it. |
| `Label` | `name`, `color` (`#RRGGBB`) — global |
| `IssueLabel` | Join table — `issueId`, `labelId` |

### Associations ([models/index.ts](../server/src/models/index.ts))

```
Project  hasMany     Issue      (foreignKey: projectId, as: 'issues')
Project  hasMany     Cycle      (foreignKey: projectId, as: 'cycles')
Issue    belongsTo   Project    (as: 'project')
Issue    belongsTo   Member     (foreignKey: assigneeId, as: 'assignee')
Issue    belongsTo   Cycle      (as: 'cycle')
Issue    belongsToMany Label    (through: IssueLabel, as: 'labels')
Cycle    belongsTo   Project    (as: 'project')
Cycle    hasMany     Issue      (as: 'issues')
Member   hasMany     Issue      (foreignKey: assigneeId, as: 'assignedIssues')
```

Schema is created via `npm run db:setup` ([server/scripts/migrate.ts](../server/scripts/migrate.ts)) — there is **no** `sequelize.sync()` on startup.

---

## 9. Caching — [utils/cache.ts](../server/src/utils/cache.ts)

Cache-aside pattern using ioredis. Every helper is a no-op if Redis is unavailable, so the API stays functional with a cold cache.

### Helpers

| Function | Purpose |
| --- | --- |
| `cacheGet<T>(key)` | Returns parsed JSON or `null` |
| `cacheSet(key, value, ttlSeconds)` | `JSON.stringify` + EX TTL |
| `cacheDel(key)` | Single key delete |
| `cacheInvalidate(pattern)` | Glob-based invalidation via `SCAN` + pipelined `DEL` (non-blocking) |
| `hashKey(prefix, params)` | Deterministic key — sorts entries alphabetically, drops empty values, SHA-256 hashes to a 16-char hex suffix |
| `setRedisAvailable` / `getRedisAvailable` | Bootstrap-controlled toggle |

### Key Pattern

```
sprintly:<entity>:<identifier-or-hash>
```

| Domain | Example keys | TTL |
| --- | --- | --- |
| Auth member lookup | `sprintly:member:<uuid>` | 5 min |
| Issues | `sprintly:issues:<uuid>`, `sprintly:issues:list:<hash>` | 2 min |
| Projects | `sprintly:projects:<uuid>`, `sprintly:projects:list:<hash>` | 5 min |
| Cycles | `sprintly:cycles:<uuid>`, `sprintly:cycles:list:<hash>` | 5 min |
| Members list | `sprintly:members:all`, `sprintly:members:users` | 10 min |
| Labels | `sprintly:labels:all` | 1 hr |
| Analytics | `sprintly:analytics:dashboard` | 10 min |

### Invalidation Map

| Mutation | Patterns invalidated |
| --- | --- |
| Issue create / update / delete | `issues:*`, `projects:*` (counts), `analytics:*` |
| Project create / update / delete | `projects:*`, `analytics:*` (delete also `issues:*`) |
| Cycle create / update / delete / completion | `cycles:*`, sometimes `issues:*`, `analytics:*` |
| Label create | `labels:*` |
| Label update / delete | `labels:*`, `issues:*` (issues embed labels) |
| Member create | `members:*`, `analytics:*` |
| Member update / unblock / toggle | `members:*` + per-key `member:<id>`, `analytics:*` |
| Auth register | `members:*` |

---

## 10. Errors — [utils/api-error.ts](../server/src/utils/api-error.ts)

`ApiError extends Error` with:

```ts
ApiError.badRequest(msg)    // 400
ApiError.unauthorized(msg)  // 401
ApiError.notFound(msg)      // 404
ApiError.conflict(msg)      // 409
ApiError.internal(msg)      // 500
```

Throw from anywhere; the controller's `try/catch` calls `next(error)`, and `errorHandler` formats the JSON response. Validation errors are handled separately by `validate()` (400 with field-level details).

---

## 11. Environment — [config/environment.ts](../server/src/config/environment.ts)

`dotenv` loads `server/.env`. The `requireEnv` helper crashes on startup in production if a required variable is missing.

| Variable | Default (dev) | Required in prod | Notes |
| --- | --- | --- | --- |
| `PORT` | `3000` | no | |
| `NODE_ENV` | `development` | — | Switches rate-limit thresholds, cookie `secure`, dotenv-loaded fallbacks |
| `DB_HOST` | `localhost` | no | |
| `DB_PORT` | `5432` | no | |
| `DB_NAME` | `sprintly` | no | |
| `DB_USER` | `postgres` | no | |
| `DB_PASSWORD` | `''` | **yes** | |
| `JWT_ACCESS_SECRET` | `dev-access-secret-change-me` | **yes** | |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret-change-me` | **yes** | |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | no | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | no | |
| `SESSION_SECRET` | `dev-session-secret` | **yes** | Session is only used during OAuth handshake |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `''` | no | If empty, Google routes are not mounted |
| `GOOGLE_CALLBACK_URL` | `http://localhost:3000/api/v1/auth/google/callback` | no | |
| `CLIENT_URL` | `http://localhost:4200` | no | Used for CORS origin and OAuth redirects |
| `REDIS_URL` | `redis://localhost:6379` | no | App degrades gracefully if unreachable |

The migration script also accepts `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` to override the seeded admin.

---

## 12. Security Posture

- **Helmet** for default secure headers (CSP, HSTS, X-Frame-Options, etc.).
- **Two-tier rate limiting**: a global limiter and a stricter auth-specific limiter on `register`/`login`/`refresh`.
- **JSON body size capped at 1 MB**.
- **CORS** restricted to `CLIENT_URL`, with `credentials: true` for the OAuth cookie.
- **Bcrypt cost 12** for password hashing.
- **JWTs in `Authorization: Bearer` header** — sessions are not used for API auth (only for the OAuth handshake).
- **Login lockout**: 5 failed attempts → 30-minute auto-unlock window. Admin-imposed blocks (`blockedReason: 'admin'`) never auto-unlock.
- **Production guardrails**: missing `DB_PASSWORD`, `JWT_*_SECRET`, or `SESSION_SECRET` crashes the process at startup.
- **`Member.defaultScope`** excludes `passwordHash` from every read by default.
- **Validation everywhere** via Zod — invalid bodies are rejected before reaching controllers.
- **Member-cache invalidation** on block/unblock/role change so revoked permissions take effect promptly.

---

## 13. Conventions

- Controllers and services are **classes with a singleton export** — e.g. `export const issueController = new IssueController()`.
- Sequelize models use `underscored: true` so TS can stay camelCase while the DB stays snake_case.
- All errors flow through `ApiError` and `errorHandler` — controllers never call `res.status(500)` directly.
- Cache invalidation always happens **after** the DB mutation succeeds.
- Read endpoints check the cache first; write endpoints invalidate related glob patterns.
- Strict TypeScript — `tsc --noEmit` in CI catches type drift between models, services, and controllers.
- DB schema changes go through `scripts/migrate.ts`; there is **no** `sequelize.sync()` on startup.
