# The Sweet Spot — website

Bilingual (EN / AR, RTL) marketing site and online ordering for The Sweet Spot, a dessert shop in Tripoli, Lebanon. Orders are saved to Supabase; the site takes no payments (cash on delivery / pay at pickup).

## Stack

Next.js 16 (App Router, TypeScript, React Compiler) · Tailwind CSS v4 · ESLint + Prettier · Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare) · Supabase (orders, menu, tracking — coming later)

Routes are locale-prefixed: `/en/...` and `/ar/...`; `/` redirects to `/en`.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Script               | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Next.js dev server                                    |
| `npm run build`      | Next.js production build                              |
| `npm run preview`    | Build for Cloudflare and run it locally (workerd)     |
| `npm run deploy`     | Build and deploy to Cloudflare (needs Wrangler login) |
| `npm run lint`       | ESLint                                                |
| `npm run typecheck`  | Generate route types, then `tsc`                      |
| `npm run format`     | Prettier (write)                                      |
| `npm run cf-typegen` | Generate types for bindings in `wrangler.jsonc`       |

## Deployment (Cloudflare Workers Builds)

Connect the GitHub repo to a Worker named `thesweetspotlb` (it must match `name` in `wrangler.jsonc`) and set:

- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy`

## Design references

The design prototypes (`design_handoff_sweet_spot_site/`, `mockups/`) are kept locally and are not in git. Assets the site needs are copied into `public/`.
