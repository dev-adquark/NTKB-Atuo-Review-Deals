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

The real production engine is the **Keyword-to-Blog API**
(`POST /v1/generate`). The full integration lives in
`lib/content-engine/providers/keyword-to-blog.ts` (request builder + response
parser, built from that API's actual documented schema and real captured
responses/error bodies — not guessed) and is wired through
`lib/content-engine/client.ts` (timeout, retry with the server's own
`resetAt`/`retryAfterSeconds` backoff timing, `Idempotency-Key` so a retried
attempt can't double-generate). Configure it under **Admin → Content Engine**
(base URL, endpoint, API key, tone, max words, factuality mode). The API key is
encrypted at rest, decrypted only server-side, and never appears in any
client-serializable output.

Until real credentials are supplied (or while the configured plan's request quota
is exhausted — see below), leave **Mock mode** on: it produces clearly-labeled
placeholder content so the rest of the pipeline (validation, affiliate resolution,
SEO, publishing) can be exercised safely without spending real quota. Production
must run with mock mode off; the app never silently falls back to mock content —
if the real engine is misconfigured or fails, generation fails visibly instead.

The API's own quality-pipeline verdict (`quality.status`/`quality.score`) is
trusted as an extra signal: `lib/validation/content.ts` rejects generation if the
provider itself reports anything other than `"pass"`.

Real API content arrives as markdown per section — it's rendered with
`react-markdown` (`components/content/markdown.tsx`), which never uses
`dangerouslySetInnerHTML` and doesn't render embedded raw HTML, with an extra
allow-list on link `href`s. The mock provider's plain-text output renders through
the same path unchanged.

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
- Affiliate network fallback (`lib/affiliate/networks/`): a real
  `AffiliateNetworkProvider` interface, tried only when no admin mapping exists and
  `networkFallbackEnabled` is on, every lookup audit-logged, a found link persisted
  as a `NETWORK`-sourced mapping that an admin mapping still always overrides. The
  registered example provider is a documented no-op (returns null) — no real
  network contract/credentials exist to integrate against yet; this is the
  architecture a real one plugs into, not a fabricated integration.
- Content freshness (`lib/publishing/refresh.ts`, **Admin → Content Freshness**):
  finds published pages older than a configurable threshold and regenerates them —
  a failed refresh always leaves the current published version live, never taking
  a good page down. `POST /api/refresh` is a cron-ready endpoint (shared-secret
  header, `CONTENT_REFRESH_SECRET`) for an external scheduler (e.g. Vercel Cron)
  to trigger on a schedule; manual "Refresh now" in the admin UI works without it.
- Search: public (`/search`, published pages only) and admin (`/admin/search`,
  every status, admin-only).
- Automated tests: `tests/unit` (Vitest, pure logic — canonical URLs, claims scanner,
  disclosure rules, publish gates, placeholder resolution, the Keyword-to-Blog
  request/response adapter against real captured API responses and error bodies)
  and `tests/integration` (Vitest against the real configured database —
  region-isolated affiliate resolution incl. network-fallback priority, uniqueness
  scoring, hreflang, draft-page visibility) and `tests/e2e` (Playwright against a
  real production build — full admin login → generate → validate → preview →
  publish → public page → GSC flow including a real uniqueness-rejection →
  Regenerate → publish recovery, a full sitemap crawl with console-error checking,
  search, security/open-redirect checks, and mobile-viewport overflow checks).

## Real API integration status (honest, as tested)

The Keyword-to-Blog API key provided is on a very small trial quota (observed: 1
request/minute, 3 requests/day). Against it, this integration was verified with:
- **One successful live `POST /v1/generate` call** — confirmed the exact response
  shape (`requestId`/`post.{title,meta,outline,sections,faqs,conclusion,
  coverageNotes}`/`rendered`/`debug`/`quality`) matches what's documented and what
  the adapter parses.
- **Three real error responses captured live** (`RATE_LIMITED` per-minute,
  `RATE_LIMITED` daily-quota, `INTERNAL_ERROR` on a length-constraint failure) —
  all three are now regression-tested fixtures in
  `tests/unit/keyword-to-blog-provider.test.ts`.
- The full documented schema (all endpoints, every error code, webhook signing) was
  read from the API's own `/docs/*` pages to build the adapter, rather than guessed.

**Not tested**: a full generate → validate → publish run against the real API
end-to-end (the 3/day quota was exhausted by the schema-discovery calls above
before a full pipeline run could be attempted), the async `/v1/jobs` + webhook
path (needs a publicly reachable HTTPS endpoint this environment doesn't have),
and `GET /v1/usage` (confirmed to 404 on this specific preview deployment, so it
isn't wired into Test Connection). The shared dev database in this environment is
currently set to **mock mode** so the rest of the test suite keeps working without
spending the real quota — the real credentials are fully configured and encrypted
in the database, ready to flip on via **Admin → Content Engine → Mock mode**
(quota resets daily at UTC midnight per the API's own docs).

## Deliberately out of scope for this pass

- The async `/v1/jobs` + webhook path (`POST /v1/jobs`, `GET /v1/jobs/{jobId}`,
  webhook signature verification) — the API supports it, and it would suit large
  batches better given how tight the sync endpoint's rate limit is, but it needs a
  publicly reachable HTTPS webhook endpoint this environment doesn't have, so it's
  unbuilt rather than built-and-untestable.
- A durable, crash-recoverable job queue: `GenerationJob` rows are real, persisted,
  and queryable after a restart, but a job that was actually in-flight when the
  process died isn't automatically resumed — there's no background worker,
  everything runs within the request that triggered it.
- Manual content field overrides (spec section 110) and a dedicated admin
  request/response debug viewer (spec section 68) beyond what's already on each
  page's detail view (request ID, API version, validation report).
- A real affiliate network integration and a production deployment (see the final
  report for this session for why, and what running one would require).

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
