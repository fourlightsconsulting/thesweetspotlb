# The Sweet Spot — website

Bilingual (EN / AR, RTL) marketing site and online ordering for The Sweet Spot, a dessert shop in Tripoli, Lebanon. Orders are saved to Supabase; the site takes no payments (cash on delivery / pay at pickup).

## Stack

Next.js (App Router, TypeScript, React Compiler) · Tailwind CSS v4 · ESLint + Prettier · Supabase (orders and tracking, coming later)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Script              | What it does     |
| ------------------- | ---------------- |
| `npm run dev`       | Dev server       |
| `npm run build`     | Production build |
| `npm run lint`      | ESLint           |
| `npm run typecheck` | TypeScript check |
| `npm run format`    | Prettier (write) |

## Design references

- `design_handoff_sweet_spot_site/` — HTML prototypes (home directions 3a and 2a, order, checkout, done), menu data and EN/AR strings in `tss-data.js`, brand notes. See its `README.md` for tokens and specs.
- `mockups/` — earlier landing and order page mockups.

These are references only; they are not part of the app build.
