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

### Authentication & roles

`useAuth` (`src/hooks/useAuth.ts`) wraps Supabase auth. The app root (`src/app/page.tsx`) gates rendering behind `<AuthGate>` — the entire app is client-side. `userId` is threaded as a prop into every hook and component that touches the DB.

`useProfile` (`src/hooks/useProfile.ts`) fetches the `profiles` table row for the current user, exposing `isAdmin` (`role === "admin"`) and `isReadOnly` (`role === "read"`). The `AdminView` component is gated behind `isAdmin`.

### Hooks pattern

Each domain has a dedicated hook that owns all CRUD for that table:

| Hook | Table | Scope |
|---|---|---|
| `useExpenses` | `expenses` | Per user + month |
| `usePayers` | `payers` | Per user |
| `usePayments` | `payments` | Per user + month |
| `useBudgets` | `budgets` | Per user |
| `useHousehold` | `payers` | Resolves owner vs guest identity |
| `useProfile` | `profiles` | Role + email for current user |
| `useInstallments` | `expenses` | All installment series for a user |

Hooks return data + mutation functions. Components never call `supabase` directly — they call hook functions.

### Multi-user household model

`useHousehold` resolves which `ownerId` to use for all data queries. A payer row can have `linked_user_id` pointing to a Supabase auth user. If that user is not the payer's `user_id`, they are a **guest** viewing the owner's household. All hooks that accept `ownerId` should receive `household.ownerId`, not the raw `userId`, so guests see the correct data.

### AI routes

All AI features call **DeepSeek** (`deepseek-chat`) via `DEEPSEEK_API_KEY`. Three routes under `src/app/api/ai/`:

- `categorize` — single expense → category (used by `ExpenseForm` on description blur)
- `budgets` — receives per-category monthly spending history, returns suggested budget amounts (used by `ManageBudgetsView`)
- `extract-from-image` — receives raw OCR text, returns extracted transactions array (used by `ImportExpensesPage` → `ScreenshotTab`)

The screenshot import flow is two-step: **Tesseract.js** runs client-side in the browser to extract raw text from the image (no API key required), then the text is sent to `extract-from-image` where DeepSeek parses it into structured transactions.

### Types

`src/types/expense.ts` — `Expense`, `Category` (12 values), `CATEGORIES`, `CATEGORY_META` (colors, emoji per category), `Budget`  
`src/types/payer.ts` — `Payer`, `Payment`, `PAYER_COLORS`

Categories are a fixed union type. Any new category must be added to both the `Category` type and `CATEGORIES` array, plus a `CATEGORY_META` entry — the AI routes also hardcode the list and must be updated in sync.

### Installments

Expenses can belong to an installment series via `installment_id` (UUID shared across all rows in the series), `installment_index` (1-based), and `installment_total`. `useExpenses.convertToInstallments` deletes the original expense and inserts N monthly rows: the first keeps the original date, subsequent rows go to the 1st of each following month. Date arithmetic uses pure string/integer math — never `Date.toISOString()` — to avoid UTC offset bugs in UAE (UTC+4).

`useInstallments` aggregates all series for a user across all months, used by `SplitPayView`.

### Household balance model

Expenses have a `split: boolean` field. When `true`, the expense is shared 50/50 among all payers. `HouseholdBalance` computes who owes whom by comparing each payer's share of split expenses against their recorded payments (`payments` table). Overpayments are shown as a green "credit" amount rather than "Paid up".

### Currency & locale

All amounts are **AED**. Use `en-AE` locale for `Intl.NumberFormat`. The dashboard starts from **January 2026** (hardcoded in `AppSidebar`'s `getYearMonthMap`).

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
DEEPSEEK_API_KEY
```

`DEEPSEEK_API_KEY` is server-only (no `NEXT_PUBLIC_` prefix) and used only in API routes.
