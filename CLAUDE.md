# CLAUDE.md

## Commands

```bash
npm start                                # Dev server at http://localhost:4200/
npm run build                            # Production build
npm test                                 # Vitest
npx vitest run src/app/app.spec.ts       # Single test file
```

## Backend API

Contract: **`api-documentation/qui-est-ce.yaml`** (OpenAPI 3.1) — primary reference, re-read when it changes. Backend at `http://localhost:8080`, proxied via `/api` and `/ws` (`proxy.conf.json`).

**Pack** — `GET /pack`, `POST /pack/create` (body: `{ packName }`), `PATCH /pack/{id}` (body: `{ packName }`), `DELETE /pack/{id}`, `GET /pack/{id}`, `GET /pack/{id}/cards`.
**Card** — `POST /card/create` (multipart: `name`, `packId`, `image`), `DELETE /card/{id}`.
**Game** — `POST /game/create?packId=`, `POST /game/{id}/playerN/join` → `CardDTO`, `POST /game/{id}/start`, `POST /game/{id}/playerN/guess?cardId=` → `GameStatusResponse`, `POST /game/{id}/reset`, `DELETE /game/{id}`.

Key DTOs: `CardDTO` (`id`, `name`, `imageUrl`, `packId`), `PackDto` (`id`, `name`), `GameDTO` (`gameId`, `gameState`, `cards`), `GameStatusResponse` (`status` always `"Success"` — *not* a game state — and `correct` for guesses).

## WebSocket

Two endpoints proxied via `/ws`:

| Endpoint | Events |
|---|---|
| `ws://…/ws/game/{gameId}` | `STATE_CHANGE` on every transition; `DELETED` when removed |
| `ws://…/ws/games` | `GAME_CREATED`, `DELETED` for lobby updates |

**Message shape** (`GameUpdateEvent` in `src/app/models/game.model.ts`):
```json
{ "gameId": "…", "type": "STATE_CHANGE", "gameState": "STARTED", "correct": null }
```
`correct` only present on guess events; `gameState` absent on `DELETED`.

**On connect**, the backend immediately pushes current state: `/ws/game/{id}` → a `STATE_CHANGE`; `/ws/games` → the full games list as a JSON array (not a `GameUpdateEvent` — parse accordingly).

**Auth.** The token is appended as `?access_token=<jwt>` (browsers can't set headers on `WebSocket`). The backend uses a `@RouteFilter` to promote it into a Bearer header — see backend `CLAUDE.md` / README. **`AuthService.getValidToken()`** refreshes if expiry < 30s; `GameWebSocketService` calls it via `defer(...)` so each (re)subscription gets a fresh token. 5-retry backoff via rxjs.

**Key pattern:** the WebSocket is the **single authoritative source** for `gameStatus` in `player-view`. HTTP guess/start responses are only used for `correct` — never call `this.gameStatus.set(response.status)` from HTTP handlers (the backend always returns `"Success"`).

## Error handling — backend unreachable

Two failure modes, handled separately:

**1. Keycloak down at startup** — `auth.init()` in `APP_INITIALIZER` would hang forever, leaving a blank page. Fix: `init()` races against a 5 s timeout (`Promise.race`). On failure it sets `AuthService.initFailed = signal(true)` and returns without throwing, so Angular finishes bootstrapping. `app.html` checks that signal and renders `<app-backend-error />` directly (no router involved). The 5 s timeout is a safety net for servers that accept the TCP connection but never respond; for localhost a dead server gives an immediate "connection refused" so the timeout rarely fires in development.

**2. Spring API down during normal use** — `backendErrorInterceptor` (`src/app/interceptors/backend-error.interceptor.ts`) catches any `/api` response with `status === 0` (network error) or `status >= 500` and navigates to `/backend-error`. It skips the redirect if the router is already on that route.

**Loading state** — `index.html` contains a static CSS spinner inside `<app-root>`. Angular replaces it when it bootstraps, so the user always sees a spinner rather than a blank page during the auth init window.

**Retry** — `BackendError` (`src/app/backend-error/`) always calls `window.location.reload()`. This re-runs the full init cycle and works for both failure modes.

## Architecture

Angular 21 frontend for a two-player "Guess Who?" game. **Standalone components** (no `NgModule`s); entry point `src/main.ts` bootstraps `App` with `appConfig`. Routes in `src/app/app.routes.ts` render in `<router-outlet>`.

### Conventions

- Standalone components everywhere — components declare their own `imports`.
- **Signals** (`signal()`, `computed()`) for reactive state, not RxJS — except for async data streams.
- New control flow in templates: `@for`, `@if`, `@switch` (not `*ngFor`/`*ngIf`).
- **Tailwind CSS v4** via `@import 'tailwindcss'` in `src/styles.css`; no `tailwind.config.js`.

### Build & tooling

- Builder: `@angular/build:application` (esbuild-based).
- Tests: **Vitest** (not Karma/Jasmine).
- TS strict mode fully on, including `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`.
- Prettier 100-char, single quotes; EditorConfig 2-space indent.
