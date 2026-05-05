# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server at http://localhost:4200/
npm run build      # Production build
npm run watch      # Dev build in watch mode
npm test           # Run unit tests (Vitest)
```

Run a single test file: `npx vitest run src/app/app.spec.ts`

## Backend API

The backend contract is defined in **`api-documentation/qui-est-ce.yaml`** (OpenAPI 3.1). This is the primary reference for all HTTP calls — check it first when implementing or debugging API interactions, and re-read it when it changes, as it evolves with the backend.

Backend runs at `http://localhost:8080`. Three resource groups:

**Pack** — card collections used to set up a game.
- `GET /pack` — list all packs
- `PUT /pack/create?packName=` — create a pack
- `GET /pack/{id}/cards` — list cards in a pack

**Card** — individual characters in a pack (uploaded with an image).
- `PUT /card/create` — multipart/form-data upload (`name`, `packId`, `image`)

**Game** — full lifecycle of a two-player match.
- `POST /game/create?packId=` → `GameStatusResponse` (contains `gameId`)
- `POST /game/{gameId}/player1/join` → `CardDTO` (the card secretly assigned to player 1)
- `POST /game/{gameId}/player2/join` → `CardDTO` (card assigned to player 2)
- `POST /game/{gameId}/start` → `GameStatusResponse`
- `POST /game/{gameId}/player1/guess?cardId=` → `GameStatusResponse` (`winner: true` if correct)
- `POST /game/{gameId}/player2/guess?cardId=` → `GameStatusResponse`
- `POST /game/{gameId}/reset` — restart the same game
- `DELETE /game/{gameId}` — delete game

Key DTOs: `CardDTO` (`id`, `name`, `imageUrl`, `packId`), `PackDto` (`id`, `name`), `GameDTO` (`gameId`, `gameState`, `cards`), `GameStatusResponse` (`status` — always the string `"Success"`, not a game state; `correct` — boolean result of a guess).

## WebSocket

The backend pushes real-time updates over two WebSocket endpoints (proxied via `/ws` in `proxy.conf.json` → `ws://localhost:8080`):

| Endpoint | Events received |
|---|---|
| `ws://…/ws/game/{gameId}` | `STATE_CHANGE` on every state transition; `DELETED` when the game is removed |
| `ws://…/ws/games` | `GAME_CREATED` and `DELETED` for lobby updates |

**Message shape** (`GameUpdateEvent` in `src/app/models/game.model.ts`):
```json
{ "gameId": "…", "type": "STATE_CHANGE", "gameState": "STARTED", "correct": null }
```
`correct` is only present (non-null) on guess events; `gameState` is absent on `DELETED`.

On connect, the backend immediately sends the current state: `/ws/game/{gameId}` sends a `STATE_CHANGE` with the live game state; `/ws/games` sends the full games list as a JSON array (not a `GameUpdateEvent` — parse accordingly).

**`GameWebSocketService`** (`src/app/services/game-websocket.service.ts`) — injectable service exposing `connectToGame(gameId)` and `connectToLobby()`, both returning `Observable<GameUpdateEvent>` via `rxjs/webSocket` with a 5-retry backoff.

**Key pattern:** WebSocket is the single authoritative source for `gameStatus` in `player-view`. HTTP guess/start responses are only used for their `correct` field — never call `this.gameStatus.set(response.status)` from HTTP handlers, since the backend always returns `"Success"` as the status string, not an actual game state.

## Architecture

**QuiEstCe Front** — Angular 21 frontend for a two-player "Guess Who?" style game where each player is secretly assigned a card from a pack and tries to guess the other player's card.

The app uses Angular 21's **standalone component model** (no NgModules). Entry point is `src/main.ts` which calls `bootstrapApplication(App, appConfig)`. All routing is driven by `src/app/app.routes.ts`; routes render inside the `<router-outlet>` in `app.html`.

### Key conventions

- **Standalone components** everywhere — no `NgModule` declarations. Each component declares its `imports` array directly.
- **Signals** (`signal()`, `computed()`) for reactive state, not RxJS observables unless dealing with async data streams.
- **Control flow syntax** in templates: `@for`, `@if`, `@switch` (Angular 17+ built-in, not `*ngFor`/`*ngIf`).
- **Tailwind CSS v4** via `@import 'tailwindcss'` in `src/styles.css`. No `tailwind.config.js` — v4 uses CSS-first config.

### Build system

Uses the new esbuild-based builder (`@angular/build:application`). Tests run with **Vitest** (not Karma/Jasmine).

### TypeScript config

Strict mode is fully enabled, including strict Angular compiler options (`strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`).

### Code style

Prettier with 100-char line width, single quotes. EditorConfig enforces 2-space indentation and single quotes for `.ts` files.
