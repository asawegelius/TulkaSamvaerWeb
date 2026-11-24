# Samvær web

The Angular frontend for Samvær: a private app for family and friends that makes real get-togethers simpler. Plans and people first; no likes, no follower counts.

This repository started from [AngularAWTemplate](https://github.com/asawegelius/AngularAWTemplate) (Angular 22, standalone components, NgRx, Angular Material, Vitest) and keeps its layers and feature anatomy.

## How it fits together

- **API first.** [`api/openapi.yaml`](api/openapi.yaml) is the contract. The Spring Boot backend implements it, and the frontend is built against a mock of it until the backend is ready.
- **The frontend is a pure view.** It renders, collects input and calls the API. Who may see an event, who is invited, who may claim what: all decided by the backend. Buttons come from each item's `allowedActions`.
- **One section = one module.** Each section (events, later booking, recipes, garden diary) is one Angular feature folder and one Spring Boot module, sharing a key (`events`) that is also the API path (`/api/v1/events`).

## Getting started

Requirements: Node.js `^22.12.0 || ^24.0.0`, npm `>=10`.

```bash
npm install
npm run mock:api   # mock backend on http://localhost:3000, signed in as Åsa
npm run mock       # app on http://localhost:4200 against the mock
```

`npm start` runs the app against a local backend on `http://localhost:8080`.

The mock keeps its data in memory and resets on restart. To act as another member, set `MOCK_USER` to one of the member ids in `mock-api/seed.mjs`. Set `MOCK_DELAY_MS=400` to see loading states, and `MOCK_EXTRA_EVENTS=60` to try paging.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run mock:api` | Starts the mock API (`mock-api/server.mjs`). |
| `npm run mock` | Serves the app against the mock. |
| `npm start` | Serves the app against `localhost:8080`. |
| `npm run build` | Production build into `dist/Samvaer`. |
| `npm run test:ci` | Unit and integration tests (Vitest), once. |
| `npm run test:mock` | Checks every mock answer against the contract's schemas. |
| `npm run api:lint` | Lints the contract with Redocly. |
| `npm run api:types` | Regenerates `src/app/core/api/schema.d.ts` from the contract. |
| `npm run lint:layers` | Checks the dependency rules between core, shared, layout and features. |

CI runs `build`, `test` (layer rules and unit tests) and `contract` (lint, generated types up to date, mock matches the contract).

## Changing the API

1. Edit `api/openapi.yaml`.
2. Run `npm run api:lint` and `npm run api:types`. Feature models are aliases of the generated types, so a changed field breaks the build where it is used.
3. Update `mock-api/server.mjs` and run `npm run test:mock`.
4. The backend implements the same change.

## Structure

```text
api/openapi.yaml                 # the contract
mock-api/                        # mock backend, seed data, contract tests
src/app/
  app.sections.ts                # section registry: menu and lazy routes
  core/
    api/                         # types generated from the contract
    http/                        # API URLs, ApiError (RFC 9457 problems), call state
    time/                        # instants, dates and time zones for every section
    platform/                    # /me, groups and members
    sections/                    # SectionDefinition and the SECTIONS token (shape only)
  shared/
    theme/_tokens.scss           # style guide tokens, light and dark
    layouts/                     # PageLayout, FormLayout
    components/                  # icon, avatar, visibility picker, tables
  layout/app-shell/              # side menu on desktop, bottom bar on phones
  features/events/
    pages/                       # list, detail, create/edit
    components/                  # event card, RSVP, attendees, bring-list, form
    data-access/                 # typed client for /api/v1/events
    state/ facade/               # NgRx, pages talk only to the facade
    events.routes.ts
```

Dependency rules from the template still apply: `core` imports nothing from features, layout or shared UI; `shared` imports nothing from core or features; features never import each other. Use `@core/*`, `@shared/*` and `@layout/*` across layers. Only the root files (`app.sections.ts`, `app.routes.ts`, `app.config.ts`) import features.

### Adding a section

Create `src/app/features/<key>/` with `<key>.routes.ts`, add one entry to `APP_SECTIONS` in `app.sections.ts`, add its paths to the contract and the mock. The menu entry and lazy route appear automatically.

## Dates and time zones

Every section follows [docs/dates-and-time-zones.md](docs/dates-and-time-zones.md): moments are UTC `Instant`s, plain dates are `LocalDate`s, and anything planned on a wall clock carries its IANA `timeZone`. Use the helpers in `core/time/` rather than the machine's local time.

## Look and feel

Modern Nordic, from the Tulka style guide: white walls, black text, deep green as the action colour, Hanken Grotesk throughout, fine grey lines instead of shadows, 10px corners. Light and dark follow the device setting. Components use only the tokens in `shared/theme/_tokens.scss`.

## License

See [LICENSE](LICENSE).
