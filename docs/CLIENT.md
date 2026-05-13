# Client Documentation

The Sprintly client is an Angular 19 single-page application that consumes the Sprintly REST API. It is implemented entirely with **standalone components**, **Angular signals** for state, and **Angular Material 19** for UI primitives.

---

## 1. Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Angular 19 (standalone API) |
| Language | TypeScript 5.7 (strict mode) |
| UI library | Angular Material 19 + Angular CDK |
| State | Angular Signals (`signal`, `computed`) — no NgRx |
| HTTP | `HttpClient` with a functional interceptor |
| Routing | Lazy-loaded feature routes |
| Theming | CSS custom properties + `html.light-theme` toggle |
| Build | Angular CLI (esbuild) |
| Tests | Karma + Jasmine |

Run scripts ([client/package.json](../client/package.json)):

```bash
ng serve     # dev server on http://localhost:4200
ng build     # production build to dist/client/
ng test      # Karma unit tests
```

---

## 2. Folder Layout

```
client/src/app/
├── app.component.ts       # Root <router-outlet>
├── app.config.ts          # ApplicationConfig — providers
├── app.routes.ts          # Top-level routes
├── core/                  # Singletons, guards, interceptors, models
│   ├── guards/            # auth, guest, admin, role-redirect
│   ├── interceptors/      # auth.interceptor.ts
│   ├── models/            # TS interfaces shared across features
│   └── services/          # AuthService, ApiService, ThemeService, IdleService, NotificationService
├── features/              # Lazy-loaded feature modules
│   ├── auth/              # login, google-callback
│   ├── issues/            # list, board, detail, my-issues, create dialog
│   ├── projects/          # list, detail, create dialog
│   ├── cycles/            # list, detail, create dialog
│   ├── labels/            # list
│   └── settings/          # admin analytics + user management
├── layout/                # LayoutComponent, SidebarComponent, ToolbarComponent
└── shared/                # Reusable presentational components & pipes
    ├── components/        # status-icon, priority-icon, label-badge, empty-state, confirm-dialog, idle-timeout-dialog
    └── pipes/             # relative-time.pipe.ts
```

---

## 3. Bootstrap & Providers

[app.config.ts](../client/src/app/app.config.ts) wires the application root:

```ts
provideZoneChangeDetection({ eventCoalescing: true }),
provideRouter(routes),
provideHttpClient(withInterceptors([authInterceptor])),
provideAnimationsAsync(),
provideNativeDateAdapter(),
```

Notable choices:
- `eventCoalescing` reduces change-detection cycles for noisy DOM events (e.g. drag listeners).
- `provideHttpClient(withInterceptors([authInterceptor]))` — functional interceptor; no NgModule.
- `provideNativeDateAdapter()` — Material datepickers use the browser's `Date`.

---

## 4. Routing

[app.routes.ts](../client/src/app/app.routes.ts) defines two top-level segments:

| Path | Guard(s) | Behavior |
| --- | --- | --- |
| `/auth/**` | (none here, child uses `guestGuard`) | Public login & Google callback |
| `/` | `authGuard` → `LayoutComponent` | All authenticated routes nested |

Inside the authenticated tree, the empty path runs `roleRedirectGuard` to send admins to `/issues` and regular users to `/my-issues`. All feature routes are **lazy-loaded** via `loadChildren` / `loadComponent`.

| Path | Component | Notes |
| --- | --- | --- |
| `/issues` | `IssueListComponent` | All issues — admin landing |
| `/issues/:id` | `IssueDetailComponent` | |
| `/my-issues` | `MyIssuesComponent` | Filtered to assignee = current user — non-admin landing |
| `/projects` | `ProjectListComponent` | |
| `/projects/:id` | `ProjectDetailComponent` | |
| `/cycles/:id` | `CycleDetailComponent` | (no list — cycles browsed via project) |
| `/labels` | `LabelListComponent` | |
| `/settings` | `SettingsComponent` | `adminGuard` — analytics + user management |

### Guards ([core/guards/](../client/src/app/core/guards/))

| Guard | Type | Purpose |
| --- | --- | --- |
| [authGuard](../client/src/app/core/guards/auth.guard.ts) | sync | Redirects to `/auth/login` if no `access_token` in localStorage |
| [guestGuard](../client/src/app/core/guards/guest.guard.ts) | sync | Redirects authenticated users away from `/auth/login` |
| [adminGuard](../client/src/app/core/guards/admin.guard.ts) | async | Awaits `authReady`, allows only `role === 'admin'` |
| [roleRedirectGuard](../client/src/app/core/guards/role-redirect.guard.ts) | async | Awaits `authReady`, redirects based on role |

The split between sync and async guards matters: `authGuard` is sync because it only inspects localStorage and must run instantly on hard reload. `adminGuard` and `roleRedirectGuard` need the loaded `Member` to know the role, so they `await authService.authReady`.

---

## 5. Core Services

### 5.1 AuthService — [core/services/auth.service.ts](../client/src/app/core/services/auth.service.ts)

Owns authentication state via signals:

| Signal | Description |
| --- | --- |
| `currentMember` | The logged-in `Member` or `null` |
| `isAuthenticated` | Boolean flag flipped on login/logout |
| `isLoading` | True during the startup auth check |
| `isAdmin` (computed) | `currentMember?.role === 'admin'` |
| `memberInitial` (computed) | First letter of name for avatar fallback |
| `authReady` | Promise — resolves after the startup auth check completes |

**Startup flow (`loadStoredAuth`).** The constructor kicks off this async flow and exposes it as `authReady`. It uses native `fetch()` rather than `HttpClient` to avoid an interceptor loop while the interceptor itself depends on `AuthService`:

1. Read `access_token` from localStorage.
2. `GET /auth/me` with the access token.
3. On 401 with a `refresh_token` present → `POST /auth/refresh`, then retry `/me` with the new access token.
4. On any failure → clear tokens, `isAuthenticated = false`.
5. Always sets `isLoading = false` in `finally`.

**Tokens** are stored under the keys `access_token` and `refresh_token` in `localStorage`. `logout()` clears them and routes to `/auth/login`.

**Google login** is initiated by full-page redirect to `${apiUrl}/auth/google`; the server redirects back to `/auth/google/callback?accessToken=…&refreshToken=…`, handled by `GoogleCallbackComponent` calling `authService.handleGoogleCallback(...)`.

### 5.2 ApiService — [core/services/api.service.ts](../client/src/app/core/services/api.service.ts)

Thin generic wrapper around `HttpClient`. Strips empty/`undefined`/`null` query params, prefixes `environment.apiUrl`, and exposes `get`, `post`, `patch`, `delete`. Feature services compose on top of this.

### 5.3 Auth Interceptor — [core/interceptors/auth.interceptor.ts](../client/src/app/core/interceptors/auth.interceptor.ts)

Functional interceptor registered in `app.config.ts`. Behavior:

1. Skip `/auth/login`, `/auth/register`, `/auth/refresh` (no Bearer needed).
2. Attach `Authorization: Bearer <accessToken>` to every other request.
3. On a 401, if a refresh token exists, call `POST /auth/refresh`, retry the original request with the new access token. On any failure → `authService.logout()`.

### 5.4 IdleService — [core/services/idle.service.ts](../client/src/app/core/services/idle.service.ts)

Idle-timeout for the authenticated layout:

- 10-minute inactivity window (`mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll`).
- Listeners are added with `runOutsideAngular` to avoid triggering change detection on every event.
- On idle, opens [IdleTimeoutDialogComponent](../client/src/app/shared/components/idle-timeout-dialog/idle-timeout-dialog.component.ts) with a 30-second countdown — Sign out or Extend.
- Started in `LayoutComponent.ngOnInit` and stopped in `ngOnDestroy`, so it only runs while authenticated.

### 5.5 ThemeService — [core/services/theme.service.ts](../client/src/app/core/services/theme.service.ts)

Persists `dark` | `light` to `localStorage`. Toggling adds/removes the `light-theme` class on `<html>`. CSS custom properties (`--surface-bg`, `--text-primary`, `--accent-primary`, etc.) are switched in [styles.scss](../client/src/styles.scss). Default is `dark`.

### 5.6 NotificationService — [core/services/notification.service.ts](../client/src/app/core/services/notification.service.ts)

Wraps `MatSnackBar` with `success` (3s, green) and `error` (5s, red) helpers. Used after every mutation.

---

## 6. Models — [core/models/](../client/src/app/core/models/)

Pure TypeScript interfaces — no class instances are sent to the server. Each model maps 1:1 to a server entity:

- `Member` — id, name, email, avatarUrl, provider, role, blocked
- `Project` — id, name, identifier (2–5 char uppercase), issueCount
- `Issue` — id, identifier (`PROJ-123`), number, title, description, status, priority, project, assignee, labels
- `Cycle` — id, name, startDate, endDate, status (`upcoming` | `active` | `completed`)
- `Label` — id, name, color (hex)
- `auth.model.ts` — `LoginRequest`, `RegisterRequest`, `AuthResponse`, `TokenResponse`

Status and priority enums are exported with display labels (`ISSUE_STATUSES`, `ISSUE_PRIORITIES`) for use in dropdowns and badges.

`PaginatedResponse<T>` describes `{ data, total, page, pageSize }` returned from issue/project list endpoints when `page`/`pageSize` query params are present.

---

## 7. Layout

[layout/layout.component.ts](../client/src/app/layout/layout.component.ts) is the shell for all authenticated routes:

```
┌──────────────────────────────────────────┐
│  Sidebar     │  Toolbar (theme, profile) │
│  (collapsible)──────────────────────────  │
│              │  <router-outlet />        │
└──────────────────────────────────────────┘
```

- **SidebarComponent** lists primary nav (All Issues / My Issues, Projects + nested cycles for the active project) and respects `collapsed` state. Collapsed state is held by the parent `LayoutComponent` so it survives route changes.
- **ToolbarComponent** shows the user avatar menu — theme toggle, Settings (admin only), Sign out (with confirm dialog).
- **IdleService** is started/stopped on layout mount/unmount so it only runs for authenticated users.

---

## 8. Features

Each feature folder owns its routes, components, and a `services/` subfolder that calls `ApiService`.

### Auth — [features/auth/](../client/src/app/features/auth/)
- `LoginComponent` — email/password + "Continue with Google" button
- `GoogleCallbackComponent` — reads `accessToken`/`refreshToken` from query params and hands off to `AuthService`
- `guestGuard` blocks already-authenticated users from `/auth/login`

### Issues — [features/issues/](../client/src/app/features/issues/)
- `IssueListComponent` — full table for admins (all issues), with filters (search, project, status, priority, assignee), pagination via `MatPaginator`, and a list/board view toggle
- `IssueBoardComponent` — Kanban board with native HTML5 drag-and-drop across status columns; emits status updates back to the parent
- `MyIssuesComponent` — same UI as `IssueListComponent` minus the assignee filter; pre-applies `assigneeId = currentMember.id`
- `IssueDetailComponent` — full issue editor (title, description, status, priority, assignee, cycle, labels, delete)
- `IssueRowComponent` — row presentation used by both list views
- `IssueCreateDialogComponent` — modal create form
- Services: [issues.service.ts](../client/src/app/features/issues/services/issues.service.ts), [members.service.ts](../client/src/app/features/issues/services/members.service.ts)

### Projects — [features/projects/](../client/src/app/features/projects/)
- `ProjectListComponent` — paginated grid with issue counts
- `ProjectDetailComponent` — project header + nested issue list filtered by `projectId`
- `ProjectCreateDialogComponent` — name + identifier (2–5 uppercase) + description

### Cycles — [features/cycles/](../client/src/app/features/cycles/)
- `CycleListComponent` — used inside project detail
- `CycleDetailComponent` — cycle header + filtered issue list
- `CycleCreateDialogComponent` — name, start/end dates, project

### Labels — [features/labels/](../client/src/app/features/labels/)
- `LabelListComponent` — global label CRUD (create, rename, recolor, delete)

### Settings (admin only) — [features/settings/](../client/src/app/features/settings/)
- `SettingsComponent` — tabbed view with Analytics tab (overview cards, status/priority charts, top assignees, overdue cycles, recent issues, 30-day issue creation trend) and Users tab (block/unblock non-admins). Calls `GET /analytics/dashboard` and `GET /members/users`, plus `PATCH /members/:id/toggle-block`.

---

## 9. Shared Components — [shared/components/](../client/src/app/shared/components/)

| Component | Purpose |
| --- | --- |
| `StatusIconComponent` | Color-coded SVG icon for each `IssueStatus` |
| `PriorityIconComponent` | Bars/icon for each `IssuePriority` |
| `LabelBadgeComponent` | Colored pill rendering label name + hex color |
| `EmptyStateComponent` | Illustration + heading + CTA when a list is empty |
| `ConfirmDialogComponent` | Generic Material modal for destructive actions |
| `IdleTimeoutDialogComponent` | 30-second countdown dialog used by `IdleService` |

[shared/pipes/relative-time.pipe.ts](../client/src/app/shared/pipes/relative-time.pipe.ts) — formats timestamps as `just now`, `5m ago`, `3h ago`, `2d ago`, then locale date.

---

## 10. Environments — [client/src/environments/](../client/src/environments/)

| File | `apiUrl` |
| --- | --- |
| `environment.ts` | `http://localhost:3000/api/v1` (dev) |
| `environment.prod.ts` | `/api/v1` (prod — relative, served behind nginx in Docker) |

`angular.json` swaps the file via `fileReplacements` for production builds.

---

## 11. State Management Pattern

Sprintly uses **Angular Signals** instead of NgRx, RxJS BehaviorSubjects, or service-with-Subject patterns:

- Component-local state: `signal<T>(initial)` + `computed(() => …)`.
- Cross-component shared state (auth, theme): owned by a `providedIn: 'root'` service exposing read-only signals (`asReadonly()`).
- HTTP responses are still RxJS `Observable<T>` (returned by `HttpClient`); components subscribe and write into local signals.

This keeps the mental model lean: a feature service returns `Observable<Issue[]>`, the component subscribes once and stuffs the result into a `signal`, and the template reads `issues()`.

---

## 12. Backend Contract Quick Reference

All requests go through `ApiService` to `${environment.apiUrl}` (`/api/v1`). See [API.md](API.md) for the full reference. The interceptor adds `Authorization: Bearer <token>` automatically.

| Resource | Endpoints used by the client |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout`, `GET /auth/google`, `GET /auth/google/callback` |
| Projects | `GET /projects`, `GET /projects/:id`, `POST /projects`, `PATCH /projects/:id`, `DELETE /projects/:id` |
| Issues | `GET /issues` (filters + pagination), `GET /issues/:id`, `POST /issues`, `PATCH /issues/:id`, `DELETE /issues/:id` |
| Cycles | `GET /cycles`, `GET /cycles/:id`, `POST /cycles`, `PATCH /cycles/:id`, `DELETE /cycles/:id` |
| Labels | `GET /labels`, `POST /labels`, `PATCH /labels/:id`, `DELETE /labels/:id` |
| Members | `GET /members`, `GET /members/users` (admin), `PATCH /members/:id/toggle-block` (admin) |
| Analytics | `GET /analytics/dashboard` (admin) |

---

## 13. Conventions

- **Standalone components only** — no `NgModule`s anywhere in the client.
- **Strict TypeScript** — `strict: true` in `tsconfig.json`.
- **Signals over Subjects** for local & shared state.
- **Material Design first** — reuse `MatButton`, `MatFormField`, `MatSelect`, `MatDialog`, `MatMenu`, `MatTabs`, `MatPaginator`, `MatSnackBar`, etc., for any new UI.
- **CSS custom properties** for theming — never hard-code colors that need to change between dark/light.
- **One feature per folder** — each feature owns its components, route file, and services.
- **Services use `@Injectable({ providedIn: 'root' })`** — no manual provider arrays.
- **Lazy-load every feature** via `loadChildren` / `loadComponent`.
