# Google Sign-In Flow — Sprintly

This document is a deep dive into how Google Sign-In is implemented in Sprintly using **Passport.js** with the `passport-google-oauth20` strategy on the server, and a redirect-based handoff to the Angular client. It covers every file involved, the OAuth 2.0 Authorization Code grant performed in the background, how new accounts are provisioned, how existing accounts are linked, how JWTs are issued, and how the client persists the resulting session.

---

## 1. High-Level Picture

Sprintly does **not** use Google Identity Services (the "One Tap" library) on the front-end. Instead it uses the classic **server-side OAuth 2.0 Authorization Code flow**:

1. The Angular SPA simply navigates the browser to the backend route `GET /api/v1/auth/google`.
2. Passport (server) builds the Google consent URL and 302-redirects the browser to `accounts.google.com`.
3. The user authenticates with Google. Google sends an authorization `code` back to `GET /api/v1/auth/google/callback`.
4. Passport exchanges the code for an access token, fetches the user's profile (email, name, photo), and runs the verify callback that finds-or-creates the `Member`.
5. The auth controller mints a JWT pair (access + refresh) and 302-redirects the browser back to the Angular SPA at `/auth/google/callback?accessToken=…&refreshToken=…`.
6. The Angular `GoogleCallbackComponent` reads the tokens from the URL, hands them to `AuthService.handleGoogleCallback`, which stores them in `localStorage`, fetches `/auth/me`, and finally navigates the user into the application.

Every subsequent API request rides on the access token via the `authInterceptor`; if it expires, the interceptor refreshes silently using the refresh token.

---

## 2. Sequence Diagram

> **Reading the URLs in this diagram:** there are **three** different `/auth/google…` paths in the flow and they live on different hosts. To remove all ambiguity, every URL below is shown with its host prefix:
>
> | URL in diagram | Host | What it is |
> |----------------|------|------------|
> | `http://localhost:3000/api/v1/auth/google` | **Server** (Express API) | Entry point — kicks off OAuth. Defined in `server/src/routes/auth.routes.ts`. |
> | `http://localhost:3000/api/v1/auth/google/callback` | **Server** (Express API) | Where Google sends the authorization `code`. Defined in `server/src/routes/auth.routes.ts`. |
> | `http://localhost:4200/auth/google/callback` | **Client** (Angular SPA) | Where the server bounces the browser **after** minting JWTs. Defined in `client/src/app/features/auth/auth.routes.ts`. |
> | `https://accounts.google.com/o/oauth2/v2/auth` | **Google** | The consent screen. |
>
> Notice: the **server** callback path is `/api/v1/auth/google/callback`, and the **client** callback path is `/auth/google/callback` (no `/api/v1/` prefix). They look similar but are completely different routes on completely different servers.

```
 Browser            Angular SPA               Express API                 Google
 (port any)         (port 4200)               (port 3000)                 (accounts.google.com)
   |                    |                          |                         |
   | click "Sign in" -->|                          |                         |
   |                    | window.location =        |                         |
   |                    |   http://localhost:3000  |                         |
   |                    |   /api/v1/auth/google -->|                         |
   |                    |                          |  [SERVER endpoint]      |
   |                    |                          |                         |
   |                    |                          | 302 Redirect to         |
   |                    |                          | accounts.google.com --->|
   |                    |                          |                         |
   |  Google consent screen (user picks account / approves)                  |
   |                                                                         |
   |<------------------------------ 302 with ?code=<auth_code>               |
   |          to http://localhost:3000/api/v1/auth/google/callback           |
   |                    |                          |                         |
   |  GET http://localhost:3000/api/v1/auth/google/callback?code=...         |
   |                    |                       -->|  [SERVER endpoint —     |
   |                    |                          |   different from above] |
   |                    |                          |                         |
   |                    |                          | Exchanges code for      |
   |                    |                          | access_token ---------->|
   |                    |                          |<-- access_token + ------|
   |                    |                          |    profile info         |
   |                    |                          |                         |
   |                    |                          | verify callback runs:   |
   |                    |                          |  - find by googleId     |
   |                    |                          |  - else find by email   |
   |                    |                          |    (link existing)      |
   |                    |                          |  - else create Member   |
   |                    |                          |                         |
   |                    |                          | generate JWT pair       |
   |                    |                          |                         |
   |<-------------------|--- 302 to ---------------|                         |
   |   http://localhost:4200/auth/google/callback                            |
   |     ?accessToken=...&refreshToken=...                                   |
   |                    |  [CLIENT route — Angular Router picks it up]      |
   |                    |                          |                         |
   |                    | GoogleCallbackComponent reads query params,        |
   |                    | stores tokens in localStorage,                     |
   |                    | calls GET http://localhost:3000/api/v1/auth/me --->|
   |                    |                          |                         |
   |                    |<-- profile JSON ---------|                         |
   |                    | Router.navigate(['/'])  - user is now signed in    |
```

---

## 3. Files Involved

### Server-side

| File | Role |
|------|------|
| [server/src/config/passport.ts](../server/src/config/passport.ts) | Registers Local + Google strategies, the verify callbacks, and serialize/deserialize handlers. |
| [server/src/config/environment.ts](../server/src/config/environment.ts) | Loads `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `CLIENT_URL`, JWT secrets, and session secret from `.env`. |
| [server/src/routes/auth.routes.ts](../server/src/routes/auth.routes.ts) | Exposes `GET /auth/google` and `GET /auth/google/callback` (only mounted when Google credentials are configured). |
| [server/src/controllers/auth.controller.ts](../server/src/controllers/auth.controller.ts) | `googleCallback` handler — generates JWTs and redirects the browser back to the Angular client. |
| [server/src/services/auth.service.ts](../server/src/services/auth.service.ts) | `login(member)` — wraps a member into a `{ member, accessToken, refreshToken }` response. |
| [server/src/utils/jwt.ts](../server/src/utils/jwt.ts) | `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`. |
| [server/src/middleware/authenticate.ts](../server/src/middleware/authenticate.ts) | Bearer-token middleware used by every protected route after sign-in. |
| [server/src/models/member.model.ts](../server/src/models/member.model.ts) | Sequelize Member model, including the OAuth-specific columns `google_id`, `provider`, `avatar_url`. |
| [server/src/app.ts](../server/src/app.ts) | Wires up `passport.initialize()`, `passport.session()`, the express-session middleware, and CORS using `CLIENT_URL`. |

### Client-side

| File | Role |
|------|------|
| [client/src/app/features/auth/login/login.component.ts](../client/src/app/features/auth/login/login.component.ts) | Renders the "Sign in with Google" button and calls `authService.googleLogin()`. |
| [client/src/app/core/services/auth.service.ts](../client/src/app/core/services/auth.service.ts) | `googleLogin()` redirects the browser; `handleGoogleCallback()` stores tokens and fetches the profile. |
| [client/src/app/features/auth/google-callback/google-callback.component.ts](../client/src/app/features/auth/google-callback/google-callback.component.ts) | Lightweight component shown during the redirect — reads `?accessToken` / `?refreshToken` from the URL. |
| [client/src/app/features/auth/auth.routes.ts](../client/src/app/features/auth/auth.routes.ts) | Maps `/auth/google/callback` to `GoogleCallbackComponent`. |
| [client/src/app/core/interceptors/auth.interceptor.ts](../client/src/app/core/interceptors/auth.interceptor.ts) | Attaches the bearer token to every API call and silently refreshes on 401. |
| [client/src/app/core/guards/auth.guard.ts](../client/src/app/core/guards/auth.guard.ts) | Rejects unauthenticated users on protected routes. |
| [client/src/app/core/guards/guest.guard.ts](../client/src/app/core/guards/guest.guard.ts) | Pushes already-signed-in users away from `/auth/login`. |
| [client/src/app/core/models/auth.model.ts](../client/src/app/core/models/auth.model.ts) | TypeScript shapes for `AuthResponse`, `TokenResponse`, etc. |
| [client/src/environments/environment.ts](../client/src/environments/environment.ts) | `apiUrl` used to build `${apiUrl}/auth/google`. |

---

## 4. Configuration & Environment

The flow is **opt-in** — if the two Google environment variables are blank, the routes and the strategy are simply not registered, so Sprintly works without Google sign-in.

From [server/src/config/environment.ts](../server/src/config/environment.ts):

```ts
google: {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback',
},
```

| Variable | Purpose | Example |
|----------|---------|---------|
| `GOOGLE_CLIENT_ID` | OAuth client ID issued by Google Cloud Console. | `…apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret. | `GOCSPX-…` |
| `GOOGLE_CALLBACK_URL` | The redirect URI registered in Google Cloud Console. **Must match exactly**. | `http://localhost:3000/api/v1/auth/google/callback` |
| `CLIENT_URL` | Where the server redirects the browser **after** the OAuth dance is complete. | `http://localhost:4200` |
| `JWT_ACCESS_SECRET` | Signs short-lived (15 m) access tokens. | random 32+ byte string |
| `JWT_REFRESH_SECRET` | Signs long-lived (7 d) refresh tokens. | random 32+ byte string |
| `SESSION_SECRET` | Signs the express-session cookie used by Passport during the OAuth round-trip. | random string |

> In production, `requireEnv()` aborts startup if any of `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, or `DB_PASSWORD` are missing.

The redirect URI registered in the Google Cloud Console **must** equal the value of `GOOGLE_CALLBACK_URL`. If they don't match, Google returns `redirect_uri_mismatch` and the user is bounced back without ever reaching Sprintly.

---

## 5. Step-by-Step Walkthrough

### Step 1 — User clicks "Sign in with Google"

The button lives in [LoginComponent](../client/src/app/features/auth/login/login.component.ts). Its click handler is one line:

```ts
onGoogleLogin(): void {
  this.authService.googleLogin();
}
```

`AuthService.googleLogin()` performs a **full-page navigation** (not an XHR) so the browser is the one driving the OAuth dance:

```ts
googleLogin(): void {
  window.location.href = `${environment.apiUrl}/auth/google`;
}
```

This is important. Cookies (the express-session cookie) and 3rd-party redirects only work when the browser's address bar actually changes — an XHR would be blocked by CORS at the Google consent screen.

### Step 2 — Server receives `GET /api/v1/auth/google`

In [auth.routes.ts](../server/src/routes/auth.routes.ts):

```ts
if (env.google.clientId && env.google.clientSecret) {
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );
  ...
}
```

`passport.authenticate('google', …)` is a middleware that, on the first hit, builds a Google authorization URL like:

```
https://accounts.google.com/o/oauth2/v2/auth
  ?response_type=code
  &client_id=<GOOGLE_CLIENT_ID>
  &redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fv1%2Fauth%2Fgoogle%2Fcallback
  &scope=profile%20email
  &state=<csrf-state>
```

It then sends a `302` to that URL. The browser follows it and the user lands on Google's consent screen.

### Step 3 — Google sends an authorization code back

After the user picks an account / approves the scopes, Google `302`s the browser to:

```
http://localhost:3000/api/v1/auth/google/callback?code=<auth_code>&state=<csrf-state>
```

This URL is the one configured both in `GOOGLE_CALLBACK_URL` and in the Google Cloud Console.

### Step 4 — Passport handles the callback

Same file:

```ts
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${env.clientUrl}/auth/login`,
  }),
  authController.googleCallback
);
```

Two things happen here, **in order**:

1. **`passport.authenticate('google', …)` middleware** — Behind the scenes, the `passport-google-oauth20` strategy:
   - Reads `req.query.code`.
   - POSTs to `https://oauth2.googleapis.com/token` with `code`, `client_id`, `client_secret`, and `redirect_uri` to exchange the code for an `access_token`.
   - Calls `https://www.googleapis.com/oauth2/v3/userinfo` (and includes the Google ID token) to fetch the user profile, producing a `profile` object with `id`, `displayName`, `emails`, `photos`.
   - Invokes the **verify callback** registered in [passport.ts](../server/src/config/passport.ts) (covered in Step 5).
   - On success, sets `req.user` to whatever the verify callback returned via `done(null, user)`.
   - On failure, redirects to `failureRedirect` (`<CLIENT_URL>/auth/login`).
   - `session: false` — we are deliberately **not** using session-based auth from here on; we mint our own JWTs.

2. **`authController.googleCallback`** — Generates JWTs and redirects to the SPA (Step 6).

### Step 5 — The Google verify callback

This is the heart of provisioning logic, in [server/src/config/passport.ts](../server/src/config/passport.ts):

```ts
if (env.google.clientId && env.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: env.google.callbackUrl,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(null, false, { message: 'No email provided by Google' });
          }

          // 1. Try to match an existing Google-linked account
          let member = await Member.scope('withPassword').findOne({
            where: { googleId: profile.id },
          });

          if (!member) {
            // 2. No googleId match — fall back to matching by email (account linking)
            member = await Member.scope('withPassword').findOne({ where: { email } });
            if (member) {
              // Existing local account — link it to this Google identity
              await member.update({
                googleId: profile.id,
                avatarUrl: member.avatarUrl || profile.photos?.[0]?.value || null,
              });
              await cacheDel(`sprintly:member:${member.id}`);
              await cacheInvalidate('sprintly:members:*');
            } else {
              // 3. Brand-new user — create from Google profile
              member = await Member.create({
                name: profile.displayName,
                email,
                googleId: profile.id,
                provider: 'google',
                avatarUrl: profile.photos?.[0]?.value || null,
              });
              await cacheInvalidate('sprintly:members:*');
            }
          }

          if (member.blocked) {
            return done(null, false, {
              message: 'Your account has been blocked. Contact an administrator.',
            });
          }

          return done(null, member);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}
```

**Resolution order (very important):**

1. **`googleId` match** → Returning Google user. Sign them straight in.
2. **Email match** → User already had a local password account; link this Google identity to it (`googleId` and optionally `avatarUrl` are filled in). Future sign-ins via either method work.
3. **No match** → New user. A `Member` row is inserted with `provider: 'google'`, no `passwordHash`, and `role: 'user'` (Sequelize default).

> **Side effect:** When the `Member` is created or mutated, the Redis cache is invalidated (`cacheInvalidate('sprintly:members:*')`) so admin lists refresh.

If the user is `blocked` (admin-blocked or auto-locked), the callback returns `done(null, false, …)` and Passport redirects to `failureRedirect`.

### Step 6 — `googleCallback` controller mints JWTs and redirects

In [auth.controller.ts](../server/src/controllers/auth.controller.ts):

```ts
async googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const member = req.user as Member;             // set by Passport
    const result = await authService.login(member); // builds tokens
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    res.redirect(`${env.clientUrl}/auth/google/callback?${params.toString()}`);
  } catch (error) {
    next(error);
  }
}
```

`authService.login(member)` reuses the same code path as a normal email/password login — see [auth.service.ts](../server/src/services/auth.service.ts):

```ts
private generateTokens(member: Member) {
  const payload = { sub: member.id, email: member.email };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}
async login(member: Member) {
  const tokens = this.generateTokens(member);
  return { member: this.sanitizeMember(member), ...tokens };
}
```

JWT generation, in [utils/jwt.ts](../server/src/utils/jwt.ts):

```ts
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,    // default '15m'
  });
}
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,   // default '7d'
  });
}
```

The token payload is intentionally minimal — just `{ sub: member.id, email }`. Roles/permissions are loaded from the DB on each request by `authenticate()` so they can change in real-time.

> **Why a redirect with tokens in the URL?** Because the OAuth dance happens in the browser's main frame. We can't return JSON to JavaScript here — there is no `XMLHttpRequest` waiting. Putting the tokens on the URL is the simplest way to hand them to the SPA. They are immediately consumed and removed by the SPA, never logged, and the request travels over HTTPS in production.

### Step 7 — Angular consumes the redirect

The route is registered in [auth.routes.ts](../client/src/app/features/auth/auth.routes.ts):

```ts
{ path: 'google/callback', component: GoogleCallbackComponent }
```

[GoogleCallbackComponent](../client/src/app/features/auth/google-callback/google-callback.component.ts):

```ts
ngOnInit(): void {
  const params = this.route.snapshot.queryParams;
  const accessToken = params['accessToken'];
  const refreshToken = params['refreshToken'];

  if (accessToken && refreshToken) {
    this.authService.handleGoogleCallback(accessToken, refreshToken);
  } else {
    this.router.navigate(['/auth/login']);
  }
}
```

It just shows a spinner and delegates to `AuthService.handleGoogleCallback`, in [auth.service.ts](../client/src/app/core/services/auth.service.ts):

```ts
handleGoogleCallback(accessToken: string, refreshToken: string): void {
  this.storeTokens(accessToken, refreshToken);
  this.isAuthenticatedSignal.set(true);
  this.getProfile().subscribe({
    next: (member) => {
      this.currentMemberSignal.set(member);
      this.router.navigate(['/']);
    },
    error: () => {
      this.logout();
    },
  });
}
```

Where `storeTokens` is:

```ts
private storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}
```

`getProfile()` calls `GET /api/v1/auth/me`, which is protected by the `authenticate` middleware. The newly stored access token is attached by the `authInterceptor`.

If `/auth/me` succeeds, the `currentMember` signal is filled in (driving the entire UI — name, avatar, admin badges, role-based routing) and the user is sent to `/`. If it fails, the SPA logs out cleanly.

### Step 8 — Subsequent API calls

Every request from now on goes through [auth.interceptor.ts](../client/src/app/core/interceptors/auth.interceptor.ts):

```ts
const token = authService.getAccessToken();
const authReq = token
  ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
  : req;
```

If the server returns `401` and a refresh token is present, the interceptor calls `POST /auth/refresh` and retries the request once. If the refresh fails, the user is logged out.

On the server, [authenticate.ts](../server/src/middleware/authenticate.ts) verifies the access token, looks the member up by `payload.sub` (with a 5-minute Redis cache), and attaches `req.member`. Every business-logic controller can rely on `req.member` being fully hydrated.

---

## 6. The Member Model — OAuth Columns

From [server/src/models/member.model.ts](../server/src/models/member.model.ts):

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `name` | string(255) | Filled from `profile.displayName` for Google users. |
| `email` | string(255), unique | Used for the email-based account-linking step. |
| `password_hash` | string(255), nullable | **Null for Google-only accounts.** A linked account keeps both. |
| `google_id` | string(255), unique nullable | Stable Google user ID — primary key for matching. |
| `provider` | string(50), default `'local'` | `'google'` for Google-only, `'local'` for password-only. Linked accounts keep their original `provider` value. |
| `avatar_url` | string(500), nullable | Filled from `profile.photos[0].value` for Google users. |
| `role` | `'admin'` \| `'user'` | Defaults to `'user'`. Google sign-up never grants admin. |
| `blocked` | boolean | If true, OAuth login is rejected. |
| `failed_login_attempts`, `blocked_reason`, `blocked_at` | — | Used by **local** login attempt limiting; not relevant to Google. |

> **Default scope:** Sequelize is configured with `defaultScope: { attributes: { exclude: ['passwordHash'] } }`. The Google verify callback uses `Member.scope('withPassword')` because it may need to update the row, but the `passwordHash` is never sent to the client (it's stripped again by `sanitizeMember`).

---

## 7. Account Linking: The Subtlety

Sprintly's linking logic is **email-based**, not interactive. Concretely:

| Existing state | User signs in with Google using same email | Result |
|----------------|---------------------------------------------|--------|
| No row | — | New row created, `provider = 'google'`. |
| Row, `googleId = X` | `googleId` returned by Google = X | Direct match — login. |
| Row, `googleId = NULL`, password account | Email matches | Row is updated with `googleId` and (if previously empty) `avatarUrl`. **`provider` is left as `'local'`.** Login succeeds. |
| Row, `googleId = X`, but Google returns email Y | `googleId` matches | Direct match — login. The DB email is **not** changed to Y. |

Implication: a malicious user **cannot** hijack a Sprintly account by creating a Google account with the same email, because Google requires you to verify control of the email address before issuing the consent screen. Only verified Google emails reach the verify callback.

---

## 8. Express-Session and `passport.session()`

Even though all of Sprintly's authenticated traffic uses **stateless JWTs**, the Google round-trip itself relies on a server-side session for one purpose: Passport saves the OAuth `state` parameter (CSRF token) in the session between the redirect to Google and the callback. That is why [app.ts](../server/src/app.ts) configures:

```ts
app.use(session({
  secret: env.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.nodeEnv === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
app.use(passport.initialize());
app.use(passport.session());
```

`passport.serializeUser` and `passport.deserializeUser` (in `passport.ts`) are required to make `passport.session()` happy, but because the callback route is mounted with `{ session: false }`, the session is effectively discarded once the OAuth dance is complete.

---

## 9. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Tokens in URL query params | Browsers don't log URL query params to the address bar history for `302` responses by default; the SPA reads them once and never references them again; deployed over HTTPS. |
| CSRF on the OAuth round-trip | `passport-google-oauth20` automatically generates and verifies a `state` parameter, persisted via `express-session`. |
| Account hijack via email | Google only releases `email` and `email_verified=true` for verified accounts. |
| Rate-limit abuse | Auth endpoints are guarded by a stricter `authLimiter` (10 / 15 min in production). Note that `/auth/google` and `/auth/google/callback` are **not** wrapped by `authLimiter` in the current code — the global rate limit (100 / 15 min in prod) still applies. |
| Session cookie hijacking | `httpOnly`, `sameSite: 'lax'`, and `secure: true` in production. |
| Long-lived refresh tokens | Stored in `localStorage`. The trade-off is convenience; rotating refresh tokens or storing them in `httpOnly` cookies would harden this further. |
| Login attempt limiting on Google sign-in | Not applied. Google-only users can't be brute-forced because there's no password to test. |

---

## 10. Failure Modes

| Failure | What the user sees | What actually happens |
|---------|--------------------|------------------------|
| Google client ID/secret not set | "Sign in with Google" button still renders, but `GET /api/v1/auth/google` returns 404. | The conditional `if (env.google.clientId && env.google.clientSecret)` in `auth.routes.ts` skips registering the routes. |
| Bad `GOOGLE_CALLBACK_URL` | Google shows "redirect_uri_mismatch" error page; the user never returns to Sprintly. | Google rejects the auth request before issuing a code. |
| User cancels at consent screen | Browser is sent to `<CLIENT_URL>/auth/login`. | Strategy fails → `failureRedirect` kicks in. |
| User's Sprintly account is blocked | Browser is sent to `<CLIENT_URL>/auth/login`. | Verify callback returns `done(null, false, { message })`. The SPA login page surfaces a generic "blocked" error if it tries to sign in again. |
| Access token expires (15 m default) | API call returns 401 → interceptor refreshes silently. | If refresh also fails, the user is logged out and bounced to `/auth/login`. |
| Refresh token expires (7 d default) | Next 401 leads to logout. | User must sign in again — a new Google round-trip. |
| `Member` row deleted while user is signed in | Next request returns 401. | `authenticate()` throws "Member not found". |

---

## 11. End-to-End Recap (TL;DR)

1. `LoginComponent` button → `AuthService.googleLogin()` → `window.location = /api/v1/auth/google`.
2. `passport.authenticate('google')` builds Google consent URL → `302` to `accounts.google.com`.
3. User approves → Google `302`s to `/api/v1/auth/google/callback?code=…`.
4. `passport-google-oauth20` exchanges the code for a token, fetches profile, fires verify callback.
5. Verify callback finds-or-creates a `Member` (by `googleId`, then by `email`).
6. `authController.googleCallback` issues `accessToken` + `refreshToken` and redirects to `<CLIENT_URL>/auth/google/callback?accessToken=…&refreshToken=…`.
7. `GoogleCallbackComponent` reads the query params, calls `AuthService.handleGoogleCallback`.
8. Tokens go into `localStorage`; `GET /auth/me` populates `currentMember`; router navigates to `/`.
9. From now on, `authInterceptor` attaches `Authorization: Bearer <accessToken>` to every API call and refreshes silently on 401.

That is the full picture of every keystroke, redirect, DB write, and signal update that happens when a Sprintly user clicks "Sign in with Google".
