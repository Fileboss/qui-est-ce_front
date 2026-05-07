---
description: Angular code review for qui-est-ce frontend — checks best practices, conventions, and common bugs
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git blame:*), Bash(git status:*), Bash(find:*), Bash(grep:*), Read
---

Perform a thorough Angular code review of the changes in the current branch vs main.

Follow these steps precisely:

1. Use a Haiku agent to gather context:
   - Run `git diff main...HEAD --name-only` to list changed files
   - Run `git log main...HEAD --oneline` to summarise commits
   - Return the list of changed files and commit summary

2. Use a Haiku agent to read and return the full diff: `git diff main...HEAD`

3. Launch 5 parallel Sonnet agents to independently review the diff. Each agent reads the diff and the full CLAUDE.md at the project root. Each returns a list of issues with file path, line number, and reason flagged:

   **Agent A — Angular conventions & architecture:**
   - Standalone components: every component must declare its own `imports` array — no NgModules
   - Signals first: state must use `signal()` / `computed()` / `toSignal()`; raw `BehaviorSubject` / `Subject` for pure state is wrong. RxJS is allowed only for async data streams (HTTP, WebSocket)
   - New control flow: templates must use `@if`, `@for`, `@switch` — never `*ngIf`, `*ngFor`, `*ngSwitch` structural directives
   - No `async` pipe for signal-based state
   - `inject()` function preferred over constructor injection for dependencies
   - `input()` / `output()` signal-based APIs preferred over `@Input()` / `@Output()` decorators
   - `HttpClient` calls must go through a dedicated service, never directly in a component

   **Agent B — WebSocket & reactive patterns:**
   - `gameStatus` in `player-view` must only be updated from WebSocket `STATE_CHANGE` events — never from HTTP response `.status` field (backend always returns `"Success"`)
   - `GameWebSocketService` must use `defer(...)` to obtain a fresh token on each subscription
   - Token is passed as `?access_token=<jwt>` query param — never in a WebSocket header
   - `AuthService.getValidToken()` must be called before connecting so tokens < 30s from expiry are refreshed
   - Reconnection must implement retry with backoff (5 retries via rxjs)
   - WebSocket initial message on `/ws/games` is a JSON array (not a `GameUpdateEvent`) — must be parsed accordingly
   - WebSocket initial message on `/ws/game/{id}` is a single `STATE_CHANGE` event

   **Agent C — TypeScript & type safety:**
   - Strict mode is fully enabled (`strict`, `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`) — no `any`, no non-null assertions (`!`) unless truly impossible to avoid
   - All signal reads in templates must be invoked as functions: `mySignal()` not `mySignal`
   - `computed()` values must not have side effects
   - DTO shapes must match the OpenAPI contract in `api-documentation/qui-est-ce.yaml` — flag any mismatch
   - `GameStatusResponse.status` is always `"Success"` and must never be used as a game state indicator; `correct` is the only meaningful field from a guess response

   **Agent D — Tailwind & template quality:**
   - Tailwind CSS v4: utility classes only, no `tailwind.config.js` references, `@apply` is acceptable but classes must exist in v4
   - No inline `style` bindings for layout concerns that Tailwind can express
   - `@for` must always include a `track` expression
   - Avoid unnecessary `ngClass` when a single static class suffices
   - Accessibility: interactive elements (`button`, `a`) must have accessible labels; images need `alt` attributes
   - No `console.log` / `console.error` left in production code

   **Agent E — Bugs & regressions:**
   - Memory leaks: subscriptions inside components must be managed with `takeUntilDestroyed()` or `AsyncPipe`; manual `subscribe` without cleanup is a bug
   - Route guards and lazy-loaded routes: verify `canActivate` / `canMatch` guards are correctly typed and wired in `app.routes.ts`
   - Detect any state mutation of a signal's inner value (should call `.set()` / `.update()`, never mutate the object directly)
   - Check that removed or renamed exports are not still imported elsewhere in the codebase
   - Verify HTTP method matches the OpenAPI contract (GET vs POST vs PUT vs DELETE)

4. For each issue found in step 3, launch a parallel Haiku agent that scores it 0–100 for confidence it is a real issue (not a false positive). Give the agent this rubric verbatim:
   - 0: False positive — does not stand up to scrutiny, or is pre-existing
   - 25: Might be real but unverified; or a style nit not mentioned in CLAUDE.md
   - 50: Real issue, but minor or infrequent in practice
   - 75: Verified real issue that directly impacts functionality or is explicitly in CLAUDE.md
   - 100: Certain — will definitely occur; evidence is direct

5. Filter out issues scoring below 80. If none remain, output "No issues found." and stop.

6. Output the review in this exact format (adapt the count as needed):

---

### Angular code review

Found N issues:

1. <one-line description> (<rule or CLAUDE.md citation>)

   `<file path>:<line range>`

2. <one-line description> (<rule or CLAUDE.md citation>)

   `<file path>:<line range>`

---

False positives to ignore (do not flag these):
- Pre-existing issues not introduced by the current diff
- TypeScript / lint errors a compiler or linter will catch automatically
- Missing test coverage (unless a test file was explicitly modified and the coverage gap is obvious)
- Nitpicks a senior Angular engineer would not mention in a real review
- Issues on lines not touched by the diff
