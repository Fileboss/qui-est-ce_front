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

**Pack** — `GET /pack`, `PUT /pack/create?packName=`, `GET /pack/{id}/cards`.
**Card** — `PUT /card/create` (multipart: `name`, `packId`, `image`).
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
