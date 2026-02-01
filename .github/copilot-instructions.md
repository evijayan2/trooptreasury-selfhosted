# GitHub Copilot Instructions for TroopTreasury 🧭

Purpose: short, actionable notes to help an AI agent be immediately productive in this repo.

## Quick architecture overview
- App: Next.js (App Router, `app/` directory). UI + server-actions live together; use server-first patterns.
- DB: PostgreSQL via Prisma (`prisma/schema.prisma`). `lib/prisma.ts` exports the Prisma client.
- Auth: NextAuth with a custom Credentials provider (`auth.ts`, `auth.config.ts`). Roles (e.g. `PLATFORM_ADMIN`, `ADMIN`, `FINANCIER`) are used for permission checks and encoded into the JWT/session.
- Payments/Events: Stripe/resend integrations live in `lib/stripe.ts` and `lib/notify-client.ts` and webhook handlers in `app/api/webhooks`.

## Where to look for focused logic
- Server actions & domain operations: `app/actions/*.ts` and `actions.ts` (centralized helpers).
- API and webhook handlers: `app/api/*` and `api/webhooks/*`.
- Business logic & utilities: `lib/*` (e.g., `lib/auth-helpers.ts`, `lib/prisma.ts`, `lib/stripe.ts`).
- Data model: `prisma/schema.prisma` (single source of truth for DB shapes & enums).

## Important behaviors & conventions (do not change without checking tests)
- DB migration flow: build/start runs a custom script `node scripts/db-migrate.js` which chooses DB URL from `VERCEL_ENV`-aware env vars (e.g. `PROD_DATABASE_URL`, `PREVIEW_DATABASE_URL`, fallback `DATABASE_URL`) and executes `npx prisma db push --accept-data-loss` then runs `npx prisma db seed`.
- Post-install step: `postinstall` runs `prisma generate` (ensure CI installs then runs `npm ci`).
- Fundraising payout semantics: for PRODUCT_SALE campaigns, scout IBA credits are applied only when the campaign is **CLOSED** (see `FundraisingCampaign` model and `USER_GUIDE.md`).
- Auth locking: login attempts are tracked and accounts can be temporarily locked (see `auth.ts` authorize logic).
- Session TTL: short sessions (15m) configured in `auth.config.ts`.

## Dev & test workflows (commands)
- Dev server: `npm run dev` (Next dev server).
- Build (includes schema push + seed): `npm run build` (runs `scripts/db-migrate.js` then `next build`).
- Start (prod): `npm run start` (expects DB to be available).
- Playwright E2E tests: install browsers `npm run test:install`, run `npm run test:e2e`, or targeted runs like `npm run test:e2e -- tests/e2e/auth/`.
- Test DB: use `.env.test` and `npm run test:migrate` which uses `dotenv-cli` and `prisma db push`.
- Test cleanup: `npm run test:cleanup`.

## Testing fixtures & patterns
- Use the provided Playwright fixtures (`tests/fixtures/auth.fixture.ts`) which expose pre-authenticated pages (`adminPage`, `financierPage`, etc.).
- Tests can access Prisma client via fixtures to assert DB state.
- Prefer semantic locators (text/role) and explicit waits per `tests/README.md`.

## Coding style & small gotchas
- Use `zod` for input validation inside server actions (common pattern in `app/actions/*`).
- Money fields use Prisma Decimal: always use decimal-safe operations or the `decimal.js` package if manipulating values in JS.
- Many important behaviors are enforced at the database/schema level (enums) — check `prisma/schema.prisma` before adding ad-hoc strings.
- Login flows depend on email lowercasing; ensure tests use lowercase emails for lookups.

## Debugging tips
- If migrations fail in CI or build, check what `scripts/db-migrate.js` printed — it logs which env var was used and masks the URL.
- To run migrations locally against a specific DB: `DATABASE_URL=... npx prisma db push --schema=./prisma/schema.prisma` then `npx prisma db seed`.
- To seed local dev DB use `npx prisma db seed` (script expects database URL in env vars).

## Where to add tests & examples
- Add Playwright tests under `tests/e2e/*` using the fixtures. Use the existing test naming pattern `TC###` for traceability.
- Server/logic unit tests: prefer integration-style tests that exercise Prisma via the same test DB and fixtures.

---
If anything here is unclear or you want more detail (e.g., CI, Docker secrets mapping, or key business flows like `campout` lifecycle), tell me which section to expand and I will iterate. ✅
