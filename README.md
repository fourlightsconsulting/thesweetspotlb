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

## Deployment (Cloudflare Workers Builds)

Deploys happen only through Cloudflare's GitHub integration: every push to `main` builds and deploys. Connect the GitHub repo to a Worker named `thesweetspotlb` (it must match `name` in `wrangler.jsonc`) and set:

- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy`
- Build variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Runtime secret: `SUPABASE_SECRET_KEY`
- Custom domains: `thesweetspotlb.com`, `www.thesweetspotlb.com` (redirects to the bare domain) and `admin.thesweetspotlb.com`

Pages are cached in the R2 bucket `thesweetspotlb-cache`, with revalidation tags in the D1 database `thesweetspotlb-tags` (see `open-next.config.ts`); admin saves revalidate the `menu`, `store` and `settings` tags.

## Design references

The design prototypes (`design_handoff_sweet_spot_site/`, `mockups/`) are kept locally and are not in git. Assets the site needs are copied into `public/`.
