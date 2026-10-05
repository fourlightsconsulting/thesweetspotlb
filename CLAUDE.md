@AGENTS.md

# Project notes

- Site for The Sweet Spot (dessert shop, Tripoli). EN + AR with full RTL, routed as `/en/...` and `/ar/...` (root layout is `src/app/[lang]/layout.tsx`; locale config in `src/i18n/config.ts`).
- Public pages: home, about, contact & locations, privacy, order → checkout → confirmation. No payments: orders are saved to Supabase and the shop gets a WhatsApp alert.
- An admin side (later) manages menu items/prices and shows orders and analytics.
- Hosted on Cloudflare Workers via `@opennextjs/cloudflare`, deployed by Cloudflare's GitHub integration. Avoid `export const runtime = "edge"`.
- Design references live in `design_handoff_sweet_spot_site/` (start with its `README.md`) and `mockups/`. They are local-only (gitignored) prototypes, not code to copy; recreate the design in React and copy needed assets into `public/`.
- Run `npm run lint`, `npm run typecheck` and `npm run build` before committing.
