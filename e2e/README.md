# End-to-end tests

Playwright tests of the inventory workflows (decision D16 in the backend's
`docs/architecture/inventory-integration.md`) and of Analytics & Insights,
driven through the real screens against a running API and database.

| Spec | Covers |
|---|---|
| `inventory-lifecycle.spec.ts` | 1 item and warehouse · 2 purchase order and approval · 3 goods receipt · 4 stock balance and movement history · 5 stock issue · 6 valuation and journals reconcile · 7 transfer · 8 stocktake and an approved adjustment · 9 report export |
| `inventory-permissions.spec.ts` | 10 an auditor reads but can't change; an HR manager has no inventory access, on screen or through the API |
| `analytics.spec.ts` | Payroll analytics reconcile with the payroll-cost report · filters in the URL narrow every figure and survive the section tabs · drill-down and CSV export with metadata · charts from the keyboard and as a table · axe (WCAG 2.1 A and AA) and phone width on all ten pages · an HR manager can't open payroll analytics and an auditor can't open financial, on screen or through the API |
| `countries.spec.ts` | Sign-up offers only countries with approved rules (Nigeria) and shows the five drafts as not available · Setup shows the organisation's country and currency and won't change to an unapproved one · the catalogue shows each country's readiness · the API refuses an unapproved country (422) and an HR manager's change (403) · axe and phone width |
| `inventory-ux.spec.ts` | Every inventory list and document page passes axe (WCAG 2.1 A and AA) and doesn't scroll sideways at phone width (390 px); the New Item drawer opens on its first field and Escape returns focus to the button |

`global-setup.ts` signs up one fresh organisation per run (an admin, an
auditor and an HR manager) and saves their sign-ins under `e2e/.auth/`
(git-ignored). The lifecycle steps share that organisation and run in order.

## Running them

Never point these at production: they create organisations, employees and
pay runs, and post stock.

1. A database at the current migration, and the API connected as an
   **ordinary role**, so row-level security applies as it does in
   production (see the backend's `docs/operations/runbook.md`):

   ```bash
   # in the backend repo
   DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5432/plutus_e2e \
     uv run alembic upgrade head
   APP_DATABASE_PASSWORD=plutus_app_e2e APP_DATABASE_ROLE=plutus_app_e2e \
   DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5432/plutus_e2e \
     uv run python -m scripts.provision_app_role
   DATABASE_URL=postgresql+psycopg://plutus_app_e2e:plutus_app_e2e@127.0.0.1:5432/plutus_e2e \
   REQUIRE_RLS_ENFORCED=true uv run uvicorn app.main:app --port 8000
   ```

2. The frontend, built against that API:

   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 npm run build
   npm run start   # port 3000
   ```

3. The tests (`npx playwright install chromium` once, if no Chromium is installed):

   ```bash
   npm run test:e2e
   ```

`E2E_BASE_URL` (default `http://localhost:3000`) and `E2E_API_URL` (default
`http://localhost:8000/api/v1`) point the tests elsewhere.

The API allows 5 sign-ups an hour per address, and each run uses one. If a
run fails in global setup with status 429, restart the API (the limit is
kept in memory) or wait.
