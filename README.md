# The Sweet Spot — website

Bilingual (EN / AR, RTL) marketing site and online ordering for The Sweet Spot, a dessert shop in Tripoli, Lebanon, at [thesweetspotlb.com](https://thesweetspotlb.com), with its admin at admin.thesweetspotlb.com. Orders are saved to Supabase; the site takes no payments (cash on delivery / pay at pickup).

## Stack

Next.js 16 (App Router, TypeScript, React Compiler) · Tailwind CSS v4 · ESLint + Prettier · Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare) · Supabase (menu, branches, orders, customers, codes, site settings, staff)

Routes are locale-prefixed: `/en/...` and `/ar/...`; `/` redirects to `/en`. The admin is under `/admin` (on admin.thesweetspotlb.com in production, `localhost:3000/admin` or `admin.localhost:3000` in development).

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without `.env.local` the site runs on its built-in menu and returns demo orders. To use the database, create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` (Supabase → Project Settings → API Keys).

| Script               | What it does                                      |
| -------------------- | ------------------------------------------------- |
| `npm run dev`        | Next.js dev server                                |
| `npm run build`      | Next.js production build                          |
| `npm run preview`    | Build for Cloudflare and run it locally (workerd) |
| `npm run lint`       | ESLint                                            |
| `npm run typecheck`  | Generate route types, then `tsc`                  |
| `npm run format`     | Prettier (write)                                  |
| `npm run cf-typegen` | Generate types for bindings in `wrangler.jsonc`   |
| `npm run db:types`   | Regenerate Supabase types from the linked project |

## Database (Supabase)

Migrations live in `supabase/migrations/` and are applied to the linked project with `supabase db push` (no local database needed); `supabase/seed.sql` holds the starting menu and settings. After a migration, run `npm run db:types`. The first owner is made with `node --env-file=.env.local scripts/make-owner.mjs <email> "<name>"`; owners add everyone else from the admin's Team page.

## Tracking

`track()` in `src/lib/tracking/` sends each visitor event to our own record (`POST /api/e` → `analytics_events`, written with the secret key), to the Meta pixel and to GA4; the event list and each platform's name for it are in `src/lib/tracking/events.ts`. `/api/e` adds the device, browser and Cloudflare location, stamps robots `bot` and staff browsing `internal` (the admin sets a `tss_staff` cookie on the whole domain), and relays events to Meta's Conversions API with the browser's event id. Orders add a server-side `order_placed` event and Meta Purchase with the customer's hashed phone and name (`src/server/tracking.ts`). IP addresses and user agents are cleared after 30 days (pg_cron). Managers can switch our own records off in the admin (Site) if the database nears the free plan's 500 MB. In development, events are recorded as internal and the ad tags stay off unless `NEXT_PUBLIC_TRACKING_IN_DEV=true`.

## Connections (Meta, Instagram, Facebook, Google)

Scheduled jobs bring in ad results and audience numbers (`supabase/functions/`, Supabase Edge Functions; deploy with `supabase functions deploy import-meta-ads import-social import-google --use-api --no-verify-jwt`). pg_cron starts them through `run_job()`, which records each run in `job_runs`; the admin's Connections page shows their status, runs them on demand, fetches past dates and takes ad spend no platform reports. Each answers "not set up yet" until its settings exist, set as Supabase function secrets (`supabase secrets set NAME=value`):

- **Meta ads, Instagram and Facebook:** in Meta Business Settings, add a system user (admin), give it the ad account, the Facebook page and the Instagram account, and generate a token with `ads_read`, `read_insights`, `pages_show_list`, `pages_read_engagement`, `instagram_basic` and `instagram_manage_insights`. Secrets: `META_ADS_TOKEN`, `META_AD_ACCOUNT_ID` (the number), `META_PAGE_ID`; `META_IG_USER_ID` only if the Instagram account isn't linked to the page.
- **Google:** in Google Cloud, enable the Google Analytics Data API and the Search Console API, create a service account and download its JSON key. Add its email as a Viewer in GA4 (Admin → Property access management) and as a user in Search Console. Link Google Ads to GA4 for ad costs. Secrets: `GOOGLE_SERVICE_ACCOUNT_JSON` (the whole key), `GA4_PROPERTY_ID` (the number), `SEARCH_CONSOLE_SITE` (e.g. `sc-domain:thesweetspotlb.com`).

The "Retries" job (`POST /api/jobs/sweep` on the website) resends WhatsApp alerts and Meta events that failed at the time.

## Admin

Staff (orders board, customers, sold-out switches) < managers (menu, bundles, prices, offers, site, store) < owners (team). Each section lives in `src/app/admin/(app)/<section>/` with its page, client forms and server actions; access is checked in each action and again by row level security. The orders board updates live (Supabase Realtime) and chimes for new orders. Bundles are products of kind `bundle` whose parts are option groups of kind `items`; the customer's picks are stored as `selections[slot] = [itemId]` with each pick's own choices under `"slot/group"` (see `src/lib/pricing.ts`).

## Deployment (Cloudflare Workers Builds)

Deploys happen only through Cloudflare's GitHub integration: every push to `main` builds and deploys. Connect the GitHub repo to a Worker named `thesweetspotlb` (it must match `name` in `wrangler.jsonc`) and set:

- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy`
- Build variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Runtime secret: `SUPABASE_SECRET_KEY`
- WhatsApp new-order alerts (optional until connected): `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN` (secret), and if they differ from the defaults `WHATSAPP_ALERT_TEMPLATE` (`new_order_alert`) and `WHATSAPP_TEMPLATE_LANGUAGE` (`en`). The template text is in `src/server/order-alerts.ts`; the numbers that get alerts are set in the admin (Store).
- Ad tracking (each tag stays off until its id is set; build variables, as they're in the page): `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID` (`AW-…`) and `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL`. Runtime secret for Meta's Conversions API: `META_CAPI_TOKEN`; `META_CAPI_TEST_EVENT_CODE` only while checking in Events Manager → Test events. In GA4, turn off Enhanced Measurement's "page changes based on browser history" (the site sends page views itself).
- Custom domains: `thesweetspotlb.com`, `www.thesweetspotlb.com` (redirects to the bare domain) and `admin.thesweetspotlb.com`

Pages are cached in the R2 bucket `thesweetspotlb-cache`, with revalidation tags in the D1 database `thesweetspotlb-tags` (see `open-next.config.ts`); admin saves revalidate the `menu`, `store` and `settings` tags.

## Design references

The design prototypes (`design_handoff_sweet_spot_site/`, `mockups/`) are kept locally and are not in git. Assets the site needs are copied into `public/`.
