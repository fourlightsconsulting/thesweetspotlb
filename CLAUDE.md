@AGENTS.md

# Project notes

- Site for The Sweet Spot (dessert shop, Tripoli). EN + AR with full RTL, routed as `/en/...` and `/ar/...` (root layout is `src/app/[lang]/layout.tsx`; locale config in `src/i18n/config.ts`).
- Public pages: home, about, contact & locations, privacy, order → checkout → confirmation. No payments: orders are saved to Supabase and the shop gets a WhatsApp alert.
- An admin side (later) manages menu items/prices and shows orders and analytics.
- Hosted on Cloudflare Workers via `@opennextjs/cloudflare`, deployed by Cloudflare's GitHub integration. Avoid `export const runtime = "edge"`.
- Design references live in `design_handoff_sweet_spot_site/` (start with its `README.md`) and `mockups/`. They are local-only (gitignored) prototypes, not code to copy; recreate the design in React and copy needed assets into `public/`.
- Colours: the twelve official brand colours are the tokens in `src/app/globals.css`. The hex values in the design handoff are outdated (e.g. Blueberry, Cotton Candy); never copy colours from it.
- Scales: section padding uses `pt/pb/py-section-sm|section|section-lg` (tokens in `globals.css`) and every section heading or page title uses `title-section`; menu icons live in `src/components/icons.tsx`.
- Menu: `src/data/menu.ts` is the Tripoli menu imported from the old site's Firestore (2026-10-06), prices in integer cents; photos in `src/assets/images/menu/`. It is replaced by Supabase once the admin exists. Schema: `supabase/migrations/`, seed (same data): `supabase/seed.sql`.
- Ordering: `/[lang]/order` (menu; the customiser opens from `?item=`), `/[lang]/checkout`, `/[lang]/orders/[ref]` (confirmation). Cart: `src/lib/cart.ts` (localStorage). Pricing rules shared by browser and server: `src/lib/pricing.ts`. The checkout server action (`src/server/orders.ts`) re-prices everything; the database's `create_order` re-checks it. Until `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set, development returns demo orders and production refuses orders.
- Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` before committing.
