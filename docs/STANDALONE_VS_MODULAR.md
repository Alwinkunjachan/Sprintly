# Modular vs Standalone Angular Applications

This document explains the two ways an Angular application can be structured —
the **NgModule-based (modular)** approach used historically, and the
**standalone components** approach used by Sprintly's [client/](../client/).
For each topic it shows side-by-side examples and explains how the standalone
form replaces the modular one.

> Sprintly is a **fully standalone** Angular 19 application. Every component
> in [client/src/app](../client/src/app) declares `standalone: true`, there is
> no `AppModule`, and the app is bootstrapped with `bootstrapApplication()`.
> The "modular" examples below are illustrative only — for comparison.

---

## 1. Mental Model

| Concept | Modular (NgModule) | Standalone |
| --- | --- | --- |
| Unit of composition | An `NgModule` that groups components, directives, pipes, and providers | The component itself; it imports what it needs directly |
| Dependency declaration | `declarations`, `imports`, `providers`, `exports` arrays in `@NgModule` | `imports` array on `@Component` |
| Bootstrap | `platformBrowserDynamic().bootstrapModule(AppModule)` | `bootstrapApplication(AppComponent, appConfig)` |
| Routing | `RouterModule.forRoot(routes)` / `forChild(routes)` | `provideRouter(routes)` + `loadChildren`/`loadComponent` |
| HTTP | `HttpClientModule` in `imports` | `provideHttpClient(withInterceptors([...]))` |
| Animations | `BrowserAnimationsModule` | `provideAnimationsAsync()` |
| Lazy loading | `loadChildren: () => import(...).then(m => m.FeatureModule)` | `loadChildren: () => import(...).then(m => m.ROUTES)` or `loadComponent` |
| Tree-shaking | Coarse — anything inside an imported module is pulled in | Fine — only the components/services you import are pulled in |

The key shift: **the module disappears as a unit of organisation**. The
component is now self-contained. It declares its own template dependencies
and the application config provides cross-cutting concerns (router, HTTP,
animations) at the bootstrap level.

---

## 2. Bootstrapping the App

### Modular

```ts
// app.module.ts
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot(routes),
    AppRoutingModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

// main.ts
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
```

### Standalone — how Sprintly does it

[client/src/main.ts](../client/src/main.ts)

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
```

[client/src/app/app.config.ts](../client/src/app/app.config.ts)

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
  ],
};
```

**What replaced what**

| Modular construct | Standalone replacement |
| --- | --- |
| `BrowserModule` | implicit in `bootstrapApplication` |
| `BrowserAnimationsModule` | `provideAnimationsAsync()` |
| `HttpClientModule` + `HTTP_INTERCEPTORS` provider | `provideHttpClient(withInterceptors([...]))` |
| `RouterModule.forRoot(routes)` | `provideRouter(routes)` |
| `MatNativeDateModule` | `provideNativeDateAdapter()` |
| `AppModule` itself | The `appConfig` object passed to `bootstrapApplication` |

There is **no module file**. Cross-cutting providers live in a flat
`providers` array in `app.config.ts`.

---

## 3. Declaring a Component

### Modular

A component must be declared in exactly one module, and that module must
import the modules whose components/pipes/directives appear in the template.

```ts
// shared.module.ts
@NgModule({
  declarations: [],
  imports: [CommonModule, MatIconModule, MatButtonModule],
  exports: [CommonModule, MatIconModule, MatButtonModule],
})
export class SharedModule {}

// issues.module.ts
@NgModule({
  declarations: [IssueListComponent, IssueRowComponent],
  imports: [SharedModule, FormsModule, RouterModule.forChild(issueRoutes)],
})
export class IssuesModule {}

// issue-list.component.ts
@Component({
  selector: 'app-issue-list',
  templateUrl: './issue-list.component.html',
})
export class IssueListComponent {}
```

The component cannot be used outside `IssuesModule` unless `IssuesModule`
exports it. Adding a new Material component requires editing both
`SharedModule` (or wherever) **and** the consuming module.

### Standalone — how Sprintly does it

[client/src/app/features/issues/issue-list/issue-list.component.ts](../client/src/app/features/issues/issue-list/issue-list.component.ts)

```ts
@Component({
  selector: 'app-issue-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule, MatButtonToggleModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatPaginatorModule,
    IssueRowComponent, IssueBoardComponent, EmptyStateComponent,
  ],
  template: `...`,
})
export class IssueListComponent { }
```

The component itself lists every dependency it actually uses in its template.
There is no module to update; if a developer adds `<mat-tooltip>` to the
template, they add `MatTooltipModule` to the same `imports` array.

[client/src/app/app.component.ts](../client/src/app/app.component.ts) shows
the minimal form:

```ts
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent {}
```

**Key replacement:** `declarations` and shared/feature modules are gone.
A component's `imports` array is now its declaration of dependency.

---

## 4. Routing

### Modular

Route configuration lived in two layers — the root `RouterModule.forRoot()`
and feature `RouterModule.forChild()` calls inside feature modules. Lazy
loading required a feature module as the loaded artefact.

```ts
// app-routing.module.ts
const routes: Routes = [
  {
    path: 'issues',
    loadChildren: () =>
      import('./features/issues/issues.module').then(m => m.IssuesModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

// issues.module.ts
const issueRoutes: Routes = [
  { path: '', component: IssueListComponent },
  { path: ':id', component: IssueDetailComponent },
];

@NgModule({
  declarations: [IssueListComponent, IssueDetailComponent],
  imports: [CommonModule, RouterModule.forChild(issueRoutes)],
})
export class IssuesModule {}
```

### Standalone — how Sprintly does it

Routes are plain `Routes` arrays. Lazy loading a feature exports a `Routes`
array (`loadChildren`) or a single component (`loadComponent`).

[client/src/app/app.routes.ts](../client/src/app/app.routes.ts)

```ts
export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'issues',
        loadChildren: () =>
          import('./features/issues/issues.routes').then((m) => m.ISSUE_ROUTES),
      },
      {
        path: 'my-issues',
        loadComponent: () =>
          import('./features/issues/my-issues/my-issues.component')
            .then((m) => m.MyIssuesComponent),
      },
      // ...
    ],
  },
];
```

[client/src/app/features/issues/issues.routes.ts](../client/src/app/features/issues/issues.routes.ts)

```ts
export const ISSUE_ROUTES: Routes = [
  { path: '', component: IssueListComponent },
  { path: ':id', component: IssueDetailComponent },
];
```

**What replaced what**

| Modular construct | Standalone replacement |
| --- | --- |
| `RouterModule.forRoot(routes)` | `provideRouter(routes)` in `app.config.ts` |
| `RouterModule.forChild(routes)` | A plain `Routes` constant in `*.routes.ts` |
| Lazy-loaded `FeatureModule` | Lazy-loaded `Routes` constant or a single component via `loadComponent` |
| `RouterModule` in component imports | `RouterOutlet`, `RouterLink`, `RouterLinkActive` imported individually |

`loadComponent` (used for `/my-issues`) has no NgModule equivalent — it's a
standalone-only feature for routing directly to a single component without
any wrapping module.

---

## 5. HTTP & Interceptors

### Modular

```ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) { /* ... */ }
}

@NgModule({
  imports: [HttpClientModule],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
})
export class AppModule {}
```

### Standalone — how Sprintly does it

Interceptors are now plain functions (`HttpInterceptorFn`) registered through
`withInterceptors([...])`. No `HTTP_INTERCEPTORS` token, no class boilerplate.

[client/src/app/core/interceptors/auth.interceptor.ts](../client/src/app/core/interceptors/auth.interceptor.ts)

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (req.url.includes('/auth/login') ||
      req.url.includes('/auth/register') ||
      req.url.includes('/auth/refresh')) {
    return next(req);
  }

  const token = authService.getAccessToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(/* refresh-on-401 logic */);
};
```

Registered once in [app.config.ts](../client/src/app/app.config.ts):

```ts
provideHttpClient(withInterceptors([authInterceptor])),
```

**What replaced what**

| Modular construct | Standalone replacement |
| --- | --- |
| `HttpClientModule` import | `provideHttpClient()` |
| `class AuthInterceptor implements HttpInterceptor` | `const authInterceptor: HttpInterceptorFn` |
| `{ provide: HTTP_INTERCEPTORS, useClass, multi: true }` | `withInterceptors([authInterceptor])` |
| `inject` only available in factories | `inject()` works inside the function body |

---

## 6. Guards & Resolvers

### Modular

```ts
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}
  canActivate() {
    if (localStorage.getItem('access_token')) return true;
    this.router.navigate(['/auth/login']);
    return false;
  }
}

// usage
{ path: 'issues', component: IssueListComponent, canActivate: [AuthGuard] }
```

### Standalone — how Sprintly does it

Guards are `CanActivateFn` arrow functions; `inject()` replaces constructor
injection.

[client/src/app/core/guards/auth.guard.ts](../client/src/app/core/guards/auth.guard.ts)

```ts
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (localStorage.getItem('access_token')) return true;
  router.navigate(['/auth/login']);
  return false;
};

// usage
{ path: '', component: LayoutComponent, canActivate: [authGuard] }
```

Class-based guards still work, but functional guards are the standalone-era
default — smaller, easier to test, no need to register them as a provider.

---

## 7. Services

Services barely changed. The same `@Injectable({ providedIn: 'root' })`
pattern works in both worlds because tree-shakable providers were
introduced before standalone APIs.

[client/src/app/core/services/auth.service.ts](../client/src/app/core/services/auth.service.ts)

```ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentMemberSignal = signal<Member | null>(null);
  // ...
}
```

What changed *around* services: in modular apps, you might have provided
services in feature modules' `providers` arrays to scope them to that
module. In standalone apps, scoped providers go either into a route's
`providers` array (so all components rendered under that route share an
instance) or into a component's own `providers`.

```ts
// route-scoped provider in a standalone app
{
  path: 'issues',
  providers: [IssueDraftService],   // one instance for everything under /issues
  loadChildren: () => import('./features/issues/issues.routes').then(m => m.ISSUE_ROUTES),
}
```

---

## 8. Lazy Loading

### Modular

The lazy-loaded artefact is a `FeatureModule`. The route loader returns
the module class.

```ts
{
  path: 'issues',
  loadChildren: () =>
    import('./features/issues/issues.module').then(m => m.IssuesModule),
}
```

### Standalone — how Sprintly does it

The lazy artefact is either a routes array or a single component.

```ts
// Routes array (most features)
{
  path: 'issues',
  loadChildren: () =>
    import('./features/issues/issues.routes').then((m) => m.ISSUE_ROUTES),
}

// Single component (no wrapping routes file needed)
{
  path: 'my-issues',
  loadComponent: () =>
    import('./features/issues/my-issues/my-issues.component')
      .then((m) => m.MyIssuesComponent),
}
```

Sprintly uses `loadChildren` for `auth`, `issues`, `projects`, `cycles`,
`labels`, and `settings`, and `loadComponent` for the standalone
`my-issues` page. Both produce smaller initial bundles than a modular
equivalent because the standalone build can tree-shake more aggressively
— there's no module wrapper dragging unused declarations into the chunk.

---

## 9. Layout Composition

[client/src/app/layout/layout.component.ts](../client/src/app/layout/layout.component.ts)

```ts
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, ToolbarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar [collapsed]="sidebarCollapsed"
                   (toggleCollapse)="sidebarCollapsed = !sidebarCollapsed">
      </app-sidebar>
      <main class="main-content">
        <app-toolbar></app-toolbar>
        <div class="content-area">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
})
export class LayoutComponent { }
```

The layout component imports `SidebarComponent` and `ToolbarComponent`
directly. In a modular app, those would have been declared in a
`LayoutModule` (or `SharedModule`) and exported so other modules could use
them. Here, the parent component just imports them as symbols.

---

## 10. How Standalone Replaces Modular — Migration Map

If you are migrating an NgModule app to standalone, the substitution is
mechanical:

| Step | Modular → Standalone |
| --- | --- |
| 1 | Add `standalone: true` to every component, directive, pipe |
| 2 | Move each component's *transitive* template dependencies into its `imports` array |
| 3 | Delete `declarations` from every `NgModule`; the modules become provider-only shells |
| 4 | Replace `RouterModule.forRoot/forChild` with `provideRouter` + plain `Routes` arrays |
| 5 | Replace `HttpClientModule` + `HTTP_INTERCEPTORS` with `provideHttpClient(withInterceptors([...]))` and convert interceptor classes to `HttpInterceptorFn` |
| 6 | Replace `BrowserAnimationsModule` with `provideAnimationsAsync()` |
| 7 | Convert class-based guards/resolvers to `CanActivateFn` / `ResolveFn` |
| 8 | Replace `bootstrapModule(AppModule)` with `bootstrapApplication(AppComponent, appConfig)` |
| 9 | Move module-level providers into `app.config.ts` (global) or route-level `providers` (scoped) |
| 10 | Delete the module files |

The Angular CLI ships a schematic that automates most of this:

```bash
ng generate @angular/core:standalone
```

It runs in three modes — convert components, convert routes/lazy-loading,
remove `AppModule` — applied in that order.

---

## 11. Why Sprintly Picked Standalone

From [CLAUDE.md](../CLAUDE.md):

> All components are standalone (no NgModules)
> State management: Angular Signals (no NgRx)

The practical wins in this codebase:

1. **Smaller surface area for new developers.** A new feature is a folder
   with a `*.routes.ts` and a few standalone components — no module file
   to wire up, no `SharedModule` to keep in sync.
2. **Better tree-shaking.** `MatPaginatorModule` is only pulled into the
   `issue-list` chunk because that component imports it. A modular
   `SharedModule` re-exporting it would have pulled it into every chunk
   that imported the shared module.
3. **Functional primitives everywhere.** Guards, interceptors, and
   resolvers are arrow functions using `inject()`, matching the style of
   the rest of the Angular 19 + Signals codebase.
4. **`loadComponent` for one-off pages.** `/my-issues` is a single page;
   in a modular world it would still need a `MyIssuesModule` wrapper.
5. **Zero circular-import risk between feature modules.** There are no
   feature modules to circularly import.

---

## 12. When Modules Still Show Up

Even in a fully standalone app you'll still see the word "module" in
imports — `MatIconModule`, `FormsModule`, `CommonModule`, etc. These are
**library NgModules** that haven't been broken up into standalone
directives/pipes yet (Angular Material 19 is mid-migration). You import
them into a standalone component's `imports` array exactly like a
standalone directive. They're just bundles of dependencies the library
ships; they don't make your app modular.

When Material completes its standalone migration, those `*Module`
imports will be replaced with imports of individual standalone
components and directives — and the migration will be a one-line change
per component.
