# NTKB Auto Review Deals

A multi-region affiliate content orchestration platform. This app does **not** generate
article content itself — it calls an external Content Generation Engine API, then
handles everything around that content: affiliate URL resolution, disclosures, SEO,
validation, versioning, publishing, and Google Search Console submission.

Stack: Next.js 16 (App Router, TypeScript strict), Tailwind CSS, Prisma 7 + Postgres
(Neon), server actions for admin CRUD, route handlers for the external-facing API.

## Setup

1. Copy `.env.example` to `.env` and fill in a Postgres `DATABASE_URL`/`DIRECT_URL`
   (a Neon project works well — `DIRECT_URL` should be the non-pooled connection,
   used only for migrations), `NEXT_PUBLIC_SITE_URL`, `SESSION_SECRET`, and
   `CONTENT_ENGINE_ENCRYPTION_KEY`.
2. Install dependencies and apply migrations:
   ```bash
   npm install
   npx prisma migrate deploy   # or `npx prisma migrate dev` in development
   ```
3. Seed the four regions (US/EU/AU/IN), a bootstrap admin user, and sample
   brands/keywords/affiliate mappings for local testing:
   ```bash
   npm run seed
   ```
   Set `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` in `.env` first.
4. Run the app:
   ```bash
   npm run dev
   ```
   Admin console: `/admin` (log in with the bootstrap admin above). Public site: `/`.

## Content Generation Engine

Configure the external API under **Admin → Content Engine** (base URL, endpoint, API
key, auth method, timeout/retries). The API key is encrypted at rest and never sent to
the browser. Until real credentials are supplied, leave **Mock mode** on — it produces
clearly-labeled placeholder content so the rest of the pipeline (validation, affiliate
resolution, SEO, publishing) can be exercised safely. Production must run with mock
mode off and `CONTENT_ENGINE_MOCK_MODE=false`.

`lib/content-engine/schema.ts` has an `unwrapExternalResponse` adapter point — adjust
it if the real API wraps its JSON payload differently than the normalized
`GeneratedContentResult` shape documented in `lib/content-engine/types.ts`.

## What's implemented

- Regions (US/EU/AU/IN), Keywords, Brands, per-region Brand Rankings, Affiliate
  Mappings (admin mappings always win — no scraping, no unauthorized fallback),
  Sponsored Placements with mandatory disclosure.
- All three page types (Keyword Review Landing, Brand Review, Top Picks/Deal Roundup),
  each calling the Content Generation Engine, then validated (required content, FAQ/
  pros-cons/comparison presence, prohibited-claims scan, unresolved-placeholder scan,
  cross-page uniqueness scoring) before it can be previewed or published.
- Hard publish gates (`lib/validation/publish-gates.ts`): a page cannot publish unless
  every gate passes — SEO fields, canonical, affiliate mapping (when required),
  affiliate/sponsored disclosure, uniqueness threshold, no unresolved placeholders, no
  flagged claims.
- Versioned `GeneratedPage` rows — publishing never overwrites history; it marks the
  previous version `UNPUBLISHED` and the new one `PUBLISHED`.
- SEO: deterministic canonical URLs per page type, hreflang alternates computed live
  from sibling published pages, JSON-LD (Article/BreadcrumbList/FAQPage — only emitted
  when the FAQ is actually on the page), `robots.ts`/`sitemap.ts` (published pages
  only, real `lastModified`), real 404s for unknown routes.
- Google Search Console: submission is queued on publish and calls the real Indexing
  API when `GSC_CLIENT_ID`/`GSC_CLIENT_SECRET`/`GSC_REFRESH_TOKEN`/`GSC_PROPERTY_URL`
  are set; otherwise it's marked `FAILED` with a clear "not configured" reason —
  publishing itself is never blocked on GSC. The UI never conflates "submitted" with
  "indexed".
- Outbound affiliate click redirect (`/click/[brandId]`) that only ever redirects to a
  URL matching an active admin-configured affiliate mapping (no open redirect).
- Admin auth via a signed HTTP-only session cookie (bcrypt + JWT), enforced both by
  `proxy.ts` (redirect UX) and independently inside every admin page/action/route
  (`lib/auth/guard.ts`) — never by hiding buttons alone.
- Full audit log of generation, publish/unpublish, affiliate/sponsored changes, config
  changes, and GSC submissions.
- Version diff (`lib/publishing/diff.ts`): every page detail view shows what changed
  (title, meta description, canonical, SEO fields, affiliate URL, sections) versus the
  immediately preceding version, plus a version-history list.
- Batch generation: the Generation page can fire one independent job per selected
  keyword (bounded by the configured concurrency), so one failure never blocks or
  hides the others.
- GA4 analytics, loaded only when `NEXT_PUBLIC_ANALYTICS_ID` is set (never breaks the
  page when absent); affiliate CTA clicks fire a best-effort `affiliate_cta_click`
  event in addition to the server-side audit log entry that always happens regardless
  of analytics.
- Automated tests: `tests/unit` (Vitest, pure logic — canonical URLs, claims scanner,
  disclosure rules, publish gates, placeholder resolution, mock content schema) and
  `tests/integration` (Vitest against the real configured database — region-isolated
  affiliate resolution, uniqueness scoring, hreflang, draft-page visibility) and
  `tests/e2e` (Playwright against a real production build — full admin login → generate
  → validate → preview → publish → public page → GSC flow, a full sitemap crawl with
  console-error checking, security/open-redirect checks, and mobile-viewport overflow
  checks).

## Deliberately out of scope for this pass

These are real spec areas not yet built — flagged rather than faked:

- Affiliate network fallback providers (the `networkFallbackEnabled` setting exists
  but no provider adapters are implemented; admin mappings are the only source).
- A background job queue (batch generation runs synchronously within the request that
  triggered it, not via a durable queue/worker).
- Scheduled content-freshness refresh, manual content overrides, and an in-app search.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint` / `npm run typecheck`
- `npm run seed` — idempotent; safe to re-run
- `npm run test` — Vitest unit + integration tests (the integration tests hit the
  real database configured in `.env`)
- `npm run test:e2e` — Playwright E2E suite; builds and boots a production server on
  port 3100 automatically (see `playwright.config.ts`)

## Known environment note

`uniquenessMinScore` defaults to `0.35`. The bundled mock content provider draws from
a small, region-flavored phrase pool (by design — it exists to exercise the pipeline,
not to write real articles), so a stricter default made legitimate mock-generated
pages fail the uniqueness gate too often in practice. The detection logic itself is
verified independently in `tests/integration/uniqueness.test.ts` with controlled
fixtures (an exact duplicate scores nowhere near an unrelated topic). Recalibrate this
setting upward once real Content Generation Engine output — which has far more
inherent lexical diversity than the mock — is in use; **Admin → Settings**.
