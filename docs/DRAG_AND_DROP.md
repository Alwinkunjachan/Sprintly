# Drag-and-Drop Kanban Board — Sprintly

This document is a complete deep-dive into how the **list / board view toggle** and the **drag-and-drop** behaviour for issues are implemented in Sprintly. It covers every file, the data flow from the moment the user starts dragging until the database is updated, the optimistic-update strategy, and the error-recovery path.

The feature was introduced in commit `7574120 — Add list/board view toggle with Kanban drag-and-drop for issues`.

---

## 1. High-Level Picture

Sprintly's Kanban board is a **column-per-status** layout where each column shows the issues currently in that status. Dragging a card from one column to another changes the issue's status. Concretely:

- The **container component** (`IssueListComponent`, `MyIssuesComponent`, or `CycleDetailComponent`) owns the list of `Issue` objects and the current `viewMode` (`'list' | 'board'`).
- Toggling to **board** mode swaps the rendered template from a paginated list of `app-issue-row`s to a single `<app-issue-board>` component.
- `IssueBoardComponent` groups the issues by `status` into columns and renders each issue as a draggable card.
- The drag is implemented with the **native HTML5 Drag-and-Drop API** (no Angular CDK, no third-party library). The board component listens to `dragstart`, `dragover`, `dragleave`, `drop`, and `dragend` events.
- On drop, the board does an **optimistic local update** (the card visually jumps to the new column instantly), then emits a `statusChange` event to the parent.
- The parent calls `IssuesService.update(id, { status })`, which hits `PATCH /api/v1/issues/:id`. The server validates with Zod, persists via Sequelize, invalidates the issue/analytics cache, and returns the updated issue.
- If the server rejects the update, the parent reloads the issues, snapping the board back to the last server state.

The board view loads **up to 200 issues at a time** (no pagination); the list view stays paginated at 25/50/100 per page.

---

## 2. Sequence Diagram

```
User                IssueBoardComponent          Container Component          Backend
 |                     |                           |                           |
 | dragstart on card ->|                           |                           |
 |                     | draggedIssue = issue      |                           |
 |                     |                           |                           |
 | dragover column --->|                           |                           |
 |                     | dragOverStatus = status   |                           |
 |                     | (CSS .drag-over kicks in) |                           |
 |                     |                           |                           |
 | drop on column ----->|                          |                           |
 |                     | (optimistic) update       |                           |
 |                     |  this.issues() locally    |                           |
 |                     | emit statusChange(id,     |                           |
 |                     |   newStatus) ------------>|                           |
 |                     |                           | issuesService.update      |
 |                     |                           |   (id, { status }) ------>|
 |                     |                           |                           | Zod validate
 |                     |                           |                           | issue.update()
 |                     |                           |                           | cache invalidate
 |                     |                           |<---- 200 OK + Issue ------|
 |                     |                           | notification.success      |
 |                     |                           | (in list mode also reload)|
 |                     |                           |                           |
 |                     |                           |  --- ON ERROR ---         |
 |                     |                           | notification.error +      |
 |                     |                           | this.loadIssues()  -----> |
 |                     |                           |   (revert by re-fetching) |
```

---

## 3. Files Involved

### Frontend — Board UI

| File | Role |
|------|------|
| [client/src/app/features/issues/issue-board/issue-board.component.ts](../client/src/app/features/issues/issue-board/issue-board.component.ts) | The Kanban board itself. Renders columns, handles all native HTML5 drag events, performs the optimistic update, emits `statusChange`. |
| [client/src/app/features/issues/issue-list/issue-list.component.ts](../client/src/app/features/issues/issue-list/issue-list.component.ts) | "All Issues" page (admin view). Owns the list/board toggle and calls the API on `statusChange`. |
| [client/src/app/features/issues/my-issues/my-issues.component.ts](../client/src/app/features/issues/my-issues/my-issues.component.ts) | "My Issues" page (per-user view). Same toggle, but pre-filtered by `assigneeId = currentMember.id`. |
| [client/src/app/features/cycles/cycle-detail/cycle-detail.component.ts](../client/src/app/features/cycles/cycle-detail/cycle-detail.component.ts) | Cycle detail page. Same toggle, pre-filtered by `cycleId`. |
| [client/src/app/features/issues/issue-row/issue-row.component.ts](../client/src/app/features/issues/issue-row/issue-row.component.ts) | List-mode row. Not involved in dragging — but emits the same `statusChange` event when the user changes status from the dropdown menu. |

### Frontend — Reusable visual atoms used inside cards

| File | Role |
|------|------|
| [client/src/app/shared/components/status-icon/status-icon.component.ts](../client/src/app/shared/components/status-icon/status-icon.component.ts) | SVG icon shown in column header and (in list mode) in the row. |
| [client/src/app/shared/components/priority-icon/priority-icon.component.ts](../client/src/app/shared/components/priority-icon/priority-icon.component.ts) | Priority indicator (urgent / high / medium / low / none) on the card header. |
| [client/src/app/shared/components/label-badge/label-badge.component.ts](../client/src/app/shared/components/label-badge/label-badge.component.ts) | Coloured label chips in the card footer. |

### Frontend — Data plumbing

| File | Role |
|------|------|
| [client/src/app/core/models/issue.model.ts](../client/src/app/core/models/issue.model.ts) | Defines `IssueStatus`, the `ISSUE_STATUSES` array (drives the columns), and `PaginatedResponse<T>`. |
| [client/src/app/features/issues/services/issues.service.ts](../client/src/app/features/issues/services/issues.service.ts) | `update(id, data)` → `PATCH /issues/:id`. `getAllPaginated(filters)` → `GET /issues?...`. |
| [client/src/app/core/services/api.service.ts](../client/src/app/core/services/api.service.ts) | Thin wrapper over `HttpClient` adding the API base URL. |

### Backend — Persistence path

| File | Role |
|------|------|
| [server/src/routes/issue.routes.ts](../server/src/routes/issue.routes.ts) | `PATCH /issues/:id` with Zod `updateIssueSchema` validating that `status` is one of the seven allowed enum values. |
| [server/src/controllers/issue.controller.ts](../server/src/controllers/issue.controller.ts) | `update()` delegates to `issueService.update`. |
| [server/src/services/issue.service.ts](../server/src/services/issue.service.ts) | `update(id, data)` writes via Sequelize, invalidates `sprintly:issues:*` and `sprintly:analytics:*` cache keys, returns the rehydrated issue. |
| [server/src/models/issue.model.ts](../server/src/models/issue.model.ts) | Sequelize model with `status` as an enum column. |

### Configuration / dependencies

| File | Role |
|------|------|
| [client/package.json](../client/package.json) | `@angular/cdk` is listed but **not** used for drag-and-drop. The board uses native HTML5 events instead. |

---

## 4. The Status Domain

The seven statuses, defined once in [issue.model.ts](../client/src/app/core/models/issue.model.ts):

```ts
export type IssueStatus =
  | 'backlog' | 'todo' | 'in_progress'
  | 'ready_to_test' | 'testing_in_progress'
  | 'done' | 'cancelled';

export const ISSUE_STATUSES: { value: IssueStatus; label: string }[] = [
  { value: 'backlog',             label: 'Backlog' },
  { value: 'todo',                label: 'Todo' },
  { value: 'in_progress',         label: 'In Progress' },
  { value: 'ready_to_test',       label: 'Ready to Test' },
  { value: 'testing_in_progress', label: 'Testing in Progress' },
  { value: 'done',                label: 'Done' },
  { value: 'cancelled',           label: 'Cancelled' },
];
```

These exact same seven values appear:

- In the Sequelize `Issue` model as an `ENUM`.
- In the Zod `updateIssueSchema` on the server: `z.enum(['backlog', 'todo', 'in_progress', 'ready_to_test', 'testing_in_progress', 'done', 'cancelled'])`.
- In the board's column generation (`columnsData` computed signal) — one column per entry.
- In the list-view status filter dropdown.

If a new status is ever added, it has to be updated in **all four** places to stay consistent.

---

## 5. The View Toggle

The toggle is a Material `mat-button-toggle-group` rendered in the page header. Excerpt from [issue-list.component.ts](../client/src/app/features/issues/issue-list/issue-list.component.ts):

```html
<mat-button-toggle-group [value]="viewMode" (change)="onViewModeChange($event.value)" class="view-toggle" hideSingleSelectionIndicator>
  <mat-button-toggle value="list" aria-label="List view">
    <mat-icon>view_list</mat-icon>
  </mat-button-toggle>
  <mat-button-toggle value="board" aria-label="Board view">
    <mat-icon>view_kanban</mat-icon>
  </mat-button-toggle>
</mat-button-toggle-group>
```

```ts
viewMode: 'list' | 'board' = 'list';
pageIndex = 0;
pageSize = 25;

onViewModeChange(mode: 'list' | 'board') {
  this.viewMode = mode;
  this.filters.status = '';   // status filter is meaningless in board mode
  this.pageIndex = 0;
  this.loadIssues();
}
```

Two important details about how data is loaded for each mode:

```ts
loadIssues() {
  if (this.viewMode === 'board') {
    const boardFilters: IssueFilters = {
      ...this.filters,
      page: '1',
      pageSize: '200',          // load up to 200 — no UI pagination on the board
    };
    ...
  } else {
    const paginatedFilters: IssueFilters = {
      ...this.filters,
      page: String(this.pageIndex + 1),
      pageSize: String(this.pageSize),  // 10 / 25 / 50
    };
    ...
  }
}
```

Why `pageSize: 200` instead of "no pagination"? Because the server caps `pageSize` at 100 (`Math.min(size, 100)` in `findAll`). Asking for 200 just gets you 100 — the board is effectively showing the most recent 100 issues per page-1 load. This is a deliberate trade-off: large boards stay performant, small/medium teams see everything.

The status filter dropdown is hidden in board mode (`@if (viewMode === 'list')`) — moving cards between columns *is* the status filter on the board.

The HTML template then renders one of the two views:

```html
@if (viewMode === 'list') {
  <div class="issue-list">
    @for (issue of issues(); track issue.id) {
      <app-issue-row [issue]="issue" (statusChange)="onStatusChange($event)" />
    }
  </div>
  <mat-paginator ... />
} @else {
  <app-issue-board [issues]="issues" (statusChange)="onStatusChange($event)" />
}
```

Note that `[issues]="issues"` passes the **signal itself**, not the unwrapped value — the board component declares `@Input() issues = signal<Issue[]>([])` so it can mutate the parent's signal directly during the optimistic update. (This is a minor breach of one-way data flow but keeps the optimistic UX trivial. See §8.)

---

## 6. Inside `IssueBoardComponent`

Full file: [issue-board.component.ts](../client/src/app/features/issues/issue-board/issue-board.component.ts).

### 6.1 Class fields

```ts
@Input()  issues = signal<Issue[]>([]);
@Output() statusChange = new EventEmitter<{ id: string; status: IssueStatus }>();

draggedIssue: Issue | null = null;     // which card is being dragged right now
dragOverStatus: IssueStatus | null = null; // which column the cursor is hovering over
```

Two transient state fields are not signals — they don't need to drive change detection on their own; the template simply binds to them via property reads inside event handlers (`[class.dragging]="draggedIssue?.id === issue.id"` is evaluated as part of the handler-triggered render cycle).

### 6.2 Computing the columns

```ts
columnsData = computed(() => {
  const issues = this.issues();
  return ISSUE_STATUSES.map(s => ({
    status: s.value,
    label: s.label,
    issues: issues.filter(i => i.status === s.value),
  }));
});
```

This is a standard "group-by" implemented in a single `computed`. Whenever the parent signal `issues` changes, every column's array of cards is rebuilt. The seven columns always render in the canonical order from `ISSUE_STATUSES` — even if a column is empty, its header and drop zone are still visible (so you can drag *into* an empty column).

### 6.3 Template skeleton

```html
<div class="board-container">
  <div class="board-columns">
    @for (col of columnsData(); track col.status) {
      <div class="board-column">
        <div class="column-header">
          <app-status-icon [status]="col.status" [size]="14" />
          <span class="column-title">{{ col.label }}</span>
          <span class="column-count">{{ col.issues.length }}</span>
        </div>

        <div class="column-body"
             [class.drag-over]="dragOverStatus === col.status"
             (dragover)="onDragOver($event, col.status)"
             (dragleave)="onDragLeave($event)"
             (drop)="onColumnDrop($event, col.status)">
          @for (issue of col.issues; track issue.id) {
            <div class="board-card"
                 draggable="true"
                 [class.dragging]="draggedIssue?.id === issue.id"
                 (dragstart)="onDragStart($event, issue)"
                 (dragend)="onDragEnd()">
              ...card content...
              <a [routerLink]="['/issues', issue.id]"
                 (click)="$event.stopPropagation()">{{ issue.title }}</a>
              ...
            </div>
          }
        </div>
      </div>
    }
  </div>
</div>
```

Three things worth highlighting:

1. **`draggable="true"`** on each card — the single attribute that opts a DOM element into the HTML5 drag API.
2. **Drop target is `.column-body`**, not the column itself, so empty space below the cards still accepts drops.
3. **`$event.stopPropagation()` on the `<a>`** — without it, clicking the title would also start a drag (the click bubbles up to the card). Stopping propagation lets the title behave as a normal navigation link.

### 6.4 The five event handlers

```ts
onDragStart(event: DragEvent, issue: Issue) {
  this.draggedIssue = issue;
  event.dataTransfer!.effectAllowed = 'move';
  event.dataTransfer!.setData('text/plain', issue.id);
}
```

- `effectAllowed = 'move'` tells the browser this is a *move* operation, not a copy — affects the cursor.
- `setData('text/plain', issue.id)` is technically required by Firefox (which won't fire `dragstart` correctly without any data on the transfer), even though we read state from `this.draggedIssue` rather than `dataTransfer`.

```ts
onDragOver(event: DragEvent, status: IssueStatus) {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';
  this.dragOverStatus = status;
}
```

- `event.preventDefault()` is **mandatory**. By default an element does **not** allow drops; calling `preventDefault()` on `dragover` declares this element as a valid drop target. Forgetting this is the #1 cause of "drag works but I can't drop anywhere" bugs.
- `dragOverStatus = status` triggers the `.drag-over` CSS class on the column body — a dashed accent-colored border and a subtle background tint show the user where the card will land.

```ts
onDragLeave(event: DragEvent) {
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  const currentTarget = event.currentTarget as HTMLElement;
  if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
    this.dragOverStatus = null;
  }
}
```

This is the trickiest piece. `dragleave` fires every time the cursor crosses a child element's boundary — even if the cursor is still inside the column. Without the `contains()` check, the highlight would flicker on/off as the cursor moves across each card. The check says: *"only clear the highlight if the cursor is leaving the column entirely."*

```ts
onDragEnd() {
  this.draggedIssue = null;
  this.dragOverStatus = null;
}
```

`dragend` fires on the **source card** when the drag finishes — whether or not a drop occurred. This is the safety net that resets state if the user releases over a non-drop-target.

```ts
onColumnDrop(event: DragEvent, newStatus: IssueStatus) {
  event.preventDefault();
  this.dragOverStatus = null;

  if (!this.draggedIssue || this.draggedIssue.status === newStatus) {
    this.draggedIssue = null;
    return;     // dropped on the same column = no-op
  }

  const issueId = this.draggedIssue.id;

  // Optimistic update — move card to new column immediately
  const updated = this.issues().map(i =>
    i.id === issueId ? { ...i, status: newStatus } : i
  );
  this.issues.set(updated);

  this.statusChange.emit({ id: issueId, status: newStatus });
  this.draggedIssue = null;
}
```

Key behaviours:

- Same-column drops are short-circuited (no API call).
- The `issues` signal is **mutated synchronously** before the API call goes out. The card "snaps" to its new column with zero perceived latency — the user does not wait for the server.
- Only after the local update does the component emit the event up to its parent.

### 6.5 The CSS feedback

From the same file:

```css
.board-card {
  cursor: grab;
  transition: border-color 150ms ease, opacity 150ms ease;
  &:active  { cursor: grabbing; }
  &.dragging { opacity: 0.3; }              /* ghosted source card */
}

.column-body {
  transition: background 150ms ease;
  &.drag-over {
    background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
    border: 1px dashed var(--accent-primary);
    border-top: none;
    margin: 0 -1px -1px;
    padding: 8px 7px 7px;
  }
}
```

- `.dragging` → opacity 0.3 on the source card while the browser-rendered drag image follows the cursor, making it visually clear "this is moving".
- `.drag-over` → drop zone highlight. The `margin: 0 -1px -1px; padding: 8px 7px 7px;` trick compensates for the 1-px dashed border so the column doesn't shift when the highlight appears.
- `cursor: grab` / `grabbing` → tactile affordance so hovering a card already shows it is draggable.

---

## 7. The Container's Role

`IssueListComponent`, `MyIssuesComponent`, and `CycleDetailComponent` all implement the same handler:

```ts
onStatusChange(event: { id: string; status: IssueStatus }) {
  this.issuesService.update(event.id, { status: event.status }).subscribe({
    next: () => {
      if (this.viewMode === 'list') {
        this.loadIssues();      // list view: refresh from server
      }
      this.notification.success('Status updated');
    },
    error: () => {
      this.notification.error('Failed to update status');
      this.loadIssues();        // re-fetch — discards the optimistic change
    },
  });
}
```

Notice the asymmetry:

- **List mode** reloads on success too. That's because the list view is *paginated and sorted*; after a status change, an issue might have moved in or out of the current page. Reloading guarantees the list still matches the server.
- **Board mode** does **not** reload on success. The optimistic update has already placed the card in the right column, and a reload would cause a visible flash. The server's response is implicitly trusted; if it later disagrees, the next navigation will re-fetch.
- **Both modes** reload on error — that's the rollback. `loadIssues()` overwrites the local `issues` signal with whatever the server says, which snaps the card back to its original column.

The `MyIssuesComponent` adds an `assigneeId` filter:

```ts
loadIssues() {
  const member = this.authService.currentMember();
  const filtersWithAssignee: IssueFilters = {
    ...this.filters,
    assigneeId: member?.id || '',
    page: this.viewMode === 'board' ? '1' : String(this.pageIndex + 1),
    pageSize: this.viewMode === 'board' ? '200' : String(this.pageSize),
  };
  this.issuesService.getAllPaginated(filtersWithAssignee).subscribe({...});
}
```

Otherwise, the drag-and-drop semantics are identical.

---

## 8. The Optimistic-Update Trick

The `IssueBoardComponent` declares its input as a **signal**, not a plain value:

```ts
@Input() issues = signal<Issue[]>([]);
```

When the parent does `[issues]="issues"`, it passes the signal *reference* itself. The child can therefore call `this.issues.set(updated)` and the parent's signal — and any other component reading from it — sees the new value immediately. This is unusual: most Angular `@Input()` patterns pass the unwrapped data and emit events back to mutate the parent's state.

The trade-off is:

| Pros | Cons |
|------|------|
| Optimistic UI is one line: `this.issues.set(updated)`. No round-trip latency. | Two-way coupling between parent and child via a shared mutable signal. |
| Container's `loadIssues()` (the rollback path) automatically drives the board too — same signal. | Slightly unusual shape for Angular newcomers reading the code. |

For this feature, the simplicity wins. The pattern is contained to the board component.

---

## 9. Backend Path

### 9.1 Route

[server/src/routes/issue.routes.ts](../server/src/routes/issue.routes.ts):

```ts
const updateIssueSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional().nullable(),
  status: z.enum([
    'backlog', 'todo', 'in_progress', 'ready_to_test',
    'testing_in_progress', 'done', 'cancelled',
  ]).optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  cycleId: z.string().uuid().optional().nullable(),
  labelIds: z.array(z.string().uuid()).optional(),
});

router.patch('/:id', validate(updateIssueSchema), (req, res, next) =>
  issueController.update(req, res, next)
);
```

The status value travels through the request body as `{ "status": "in_progress" }`. Zod rejects anything outside the enum with a 400 before the controller ever runs — that's the schema gate.

The route is mounted under `/api/v1/issues`, which (per `routes/index.ts`) is **behind the global `authenticate` middleware**, so only signed-in users can update issues. There is no separate authorisation check beyond authentication — any signed-in user can move any issue's status.

### 9.2 Controller

[server/src/controllers/issue.controller.ts](../server/src/controllers/issue.controller.ts):

```ts
async update(req, res, next) {
  try {
    const issue = await issueService.update(req.params.id as string, req.body);
    res.json(issue);
  } catch (error) {
    next(error);
  }
}
```

A thin shim. All logic lives in the service.

### 9.3 Service

[server/src/services/issue.service.ts](../server/src/services/issue.service.ts):

```ts
async update(id: string, data: Partial<CreateIssueData>) {
  const issue = await Issue.findByPk(id);
  if (!issue) throw ApiError.notFound('Issue not found');

  const { labelIds, ...updateData } = data;
  await issue.update(updateData as any);   // status, priority, assigneeId, ...

  if (labelIds !== undefined) {
    await IssueLabel.destroy({ where: { issueId: id } });
    if (labelIds.length > 0) {
      await IssueLabel.bulkCreate(labelIds.map(labelId => ({ issueId: id, labelId })));
    }
  }

  await cacheInvalidate('sprintly:issues:*');
  await cacheInvalidate('sprintly:analytics:*');
  return this.findById(id);
}
```

For a drag-and-drop status change:

- `data` is `{ status: 'in_progress' }`.
- `labelIds` is `undefined`, so the label-rewrite branch is skipped.
- `issue.update({ status })` runs `UPDATE issues SET status = $1, updated_at = $2 WHERE id = $3`.
- Two Redis wildcard invalidations clear `sprintly:issues:list:*` (so the next list query goes to the DB), `sprintly:issues:<id>` (so the detail page is fresh), and `sprintly:analytics:*` (so the admin analytics dashboard reflects the new state).
- `findById(id)` returns the fully-hydrated issue (with project, assignee, and labels included) — which the client receives but, in board mode, already has locally.

### 9.4 Cache invalidation matters here

Without invalidation, dragging an issue to "Done" would update the DB but the cached `sprintly:issues:list:*` key would still report it as "Todo" for up to 2 minutes (the issues-list TTL). That's why both wildcards are blown away on every write.

---

## 10. End-to-End Recap (TL;DR)

1. User toggles to **board view** → container loads up to 200 issues with `pageSize=200`.
2. Container passes the `issues` signal *reference* into `<app-issue-board>`.
3. `IssueBoardComponent.columnsData` (a `computed`) groups issues by `status` into 7 columns.
4. User starts dragging a card → `dragstart` saves `draggedIssue`.
5. As the cursor moves over columns, `dragover` toggles `.drag-over` highlight on the target column.
6. User releases over a different column → `drop` fires:
   - Same column? Bail out.
   - Different column? Update `this.issues` signal locally (optimistic) and emit `statusChange`.
7. Container calls `IssuesService.update(id, { status })` → `PATCH /api/v1/issues/:id`.
8. Server validates with Zod, persists with Sequelize, invalidates `sprintly:issues:*` and `sprintly:analytics:*`.
9. On success → `notification.success('Status updated')`. (List mode also reloads to refresh pagination.)
10. On error → `notification.error('Failed to update status')` and `loadIssues()` re-fetches, snapping the card back.

That is the complete data-flow story for every drag-and-drop interaction in Sprintly's Kanban board.
