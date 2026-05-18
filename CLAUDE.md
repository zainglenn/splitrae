# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## This is NOT the Next.js you know

This project runs **Next.js 16** with **React 19** and **Turbopack**. APIs, conventions, and file structure may differ from training data. Read `node_modules/next/dist/docs/` before writing any Next.js-specific code. Heed deprecation notices.

## Commands

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run lint     # ESLint
```

No test suite exists. Deploy to production via `vercel --prod`.

## Architecture

### Data flow

All state lives in Supabase. Client components fetch directly via the `supabase` proxy from `src/lib/supabase.ts` — there is no server-side data fetching layer. Every hook subscribes to real-time Postgres changes so the UI updates across devices without polling.

### Authentication

`useAuth` (in `src/components/useAuth.ts`) wraps Supabase auth. The app root (`src/app/page.tsx`) gates rendering behind `<AuthGate>` — the entire app is client-side. `userId` is threaded as a prop into every hook and component that touches the DB.

### Hooks pattern

Each domain has a dedicated hook that owns all CRUD for that table:

| Hook | Table | Scope |
|---|---|---|
| `useExpenses` | `expenses` | Per user + month |
| `usePayers` | `payers` | Per user |
| `usePayments` | `payments` | Per user + month |
| `useBudgets` | `useBudgets.ts` | Per user |
| `useDashboardStats` | `expenses` | Per user + full year |

Hooks return data + mutation functions. Components never call `supabase` directly — they call hook functions.

### AI routes

All AI features call **DeepSeek** (`deepseek-chat`) via `DEEPSEEK_API_KEY`. Four routes under `src/app/api/ai/`:

- `categorize` — single expense → category (used by `ExpenseForm` on description blur)
- `normalize` — batch of up to 30 expenses → suggested title/category corrections (current month only, shown in `ExpenseList`)
- `bulk-normalize` — fetches all user expenses via JWT auth, normalizes in batches of 30, writes corrections back to DB (used by `CleanDataDialog`)
- `insights` — month summary → 2–3 plain-English bullets (used by `AIInsightsCard`)

The `bulk-normalize` route requires `Authorization: Bearer <supabase-access-token>` — it calls `supabase.auth.getUser(token)` to enforce ownership before touching any data.

### Types

`src/types/expense.ts` — `Expense`, `Category` (12 values), `CATEGORIES`, `CATEGORY_META` (colors, emoji per category), `Budget`  
`src/types/payer.ts` — `Payer`, `Payment`, `PAYER_COLORS`

Categories are a fixed union type. Any new category must be added to both the `Category` type and `CATEGORIES` array, plus a `CATEGORY_META` entry — the AI routes also hardcode the list and must be updated in sync.

### Household balance model

Expenses have a `split: boolean` field. When `true`, the expense is shared 50/50 among all payers. `HouseholdBalance` computes who owes whom by comparing each payer's share of split expenses against their recorded payments (`payments` table).

### Currency & locale

All amounts are **AED**. Use `en-AE` locale for `Intl.NumberFormat`. The dashboard starts from **January 2026** (hardcoded in `AppSidebar`'s `getYearMonthMap`).

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
DEEPSEEK_API_KEY
```

`DEEPSEEK_API_KEY` is server-only (no `NEXT_PUBLIC_` prefix) and used only in API routes.
