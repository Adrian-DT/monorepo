# AGENTS.md

## Scope

- Work from `workspace-adt/`. The repo root above it is just a container; the actual Angular workspace and lockfile live here.

## Repo shape

- `projects/calendar/` is the frontend Angular app.
- `projects/calendar-backend/` is a separate Spring Boot backend with its own Maven wrapper.
- The Angular workspace defines a single app project: `calendar` in `angular.json`.

## Commands

- Install deps: `npm install`
- Frontend dev server: `npm start` or `npx ng serve`
- Frontend build: `npm run build`
- Frontend watch build: `npm run watch`
- Frontend tests: `npm test`
- Frontend lint: `npm run lint`
- Backend dev run: `./mvnw spring-boot:run` from `projects/calendar-backend/` on bash, or `mvnw.cmd spring-boot:run` on Windows shells.
- Backend tests: `./mvnw test` / `mvnw.cmd test` from `projects/calendar-backend/`.
- Start local Postgres for backend: `docker compose up -d` from `projects/calendar-backend/`.

## Verification

- For frontend-only changes, run `npm run lint` and the smallest relevant `npm test` pass before finishing.
- There is no separate root typecheck script; Angular build/test cover compilation.

## Frontend architecture

- Frontend entrypoint is `projects/calendar/src/main.ts`, bootstrapping `App` with `appConfig` via `bootstrapApplication`.
- Routing is in `projects/calendar/src/app/app.routes.ts` and uses lazy `loadComponent(...)` routes, not NgModules.
- Authenticated app pages render inside `core/layout/app-shell/`; `login` and `forgot-password` sit outside that shell.
- Major frontend boundaries under `src/app/` are `core/`, `features/`, and per-feature `pages/`, `components/`, `services/`, `models/`.

## Angular workspace conventions enforced by config

- Use npm, not pnpm/yarn (`packageManager` is `npm@11.16.0`).
- New components are configured to use inline templates and inline styles by default (`angular.json`). Match that unless an existing area already uses external files.
- Component selector prefix is `yko` in kebab-case; directive selector prefix is `yko` in camelCase (`eslint.config.js`).
- Lint covers only `projects/calendar/**/*.ts` and `projects/calendar/**/*.html`.
- HTML accessibility rules come from `angular-eslint` template accessibility config; do not disable them casually.

## Frontend API wiring

- Frontend API calls should go through `projects/calendar/src/app/core/http/api.service.ts` unless there is a strong reason not to.
- Base URL comes from `projects/calendar/src/environments/environment*.ts` via the `API_BASE_URL` injection token.
- Local frontend expects backend API at `http://localhost:8080/api` in development.
- Production frontend expects `/api`, so avoid hardcoding absolute backend URLs in feature code.
- Auth headers are added centrally by `core/http/auth.interceptor.ts`.

## Backend coupling that affects frontend work

- Backend listens on port `8080` and uses PostgreSQL on `localhost:5432` with database `calendar` / user `calendar` / password `calendar_dev`.
- Flyway is enabled and Hibernate uses `ddl-auto: validate`; schema changes belong in backend migrations, not ad hoc database edits.

## Testing notes

- Frontend unit tests use Angular's unit-test builder with Vitest globals enabled in `projects/calendar/tsconfig.spec.json`.
- Existing frontend specs live next to source as `*.spec.ts`; follow that placement.
