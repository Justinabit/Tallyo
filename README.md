# Tallyo

**Track it. Plan it. Keep it.**

A personal budgeting and financial tracking **website** built with Hono
(Cloudflare Workers/Pages) on the backend, vanilla HTML/CSS/JavaScript on the
frontend, and **Supabase** (PostgreSQL + Auth) as the real, persistent
database. AI is used only for optional written insights — every number on
screen is calculated deterministically in JavaScript.

## Features
- Email/password authentication (signup, login, logout, password reset) via Supabase Auth
- Dashboard: balance, income, expenses, safe daily spending, spending-by-category donut, recent transactions, budget progress, upcoming expenses, insights
- Transactions: add/edit/delete, search, filter by type/category/wallet, grouped by date, CSV export
- Budgets: amount/period/category scope, live progress bars, over/near-limit badges
- Wallets: multiple accounts (cash/bank/e-wallet/savings/other) with computed balances
- Savings goals: target vs current, progress %, quick "add funds"
- Recurring transactions: auto-generate real transactions on their schedule
- Upcoming expenses: due-date tracking, overdue highlighting, mark-as-paid
- Financial calendar: month view with income/expense/upcoming/recurring dots, day drill-down
- Reports: period-over-period comparison, income vs expense bar chart, category donut
- Settings: profile, currency/theme/default period preferences, custom categories, JSON/CSV export, account deletion
- Privacy Policy & Terms/Financial Disclaimer pages
- Fully responsive (desktop / tablet / mobile, with off-canvas sidebar + FAB on mobile)
- Light + dark theme via CSS variables

## Technologies
- **Backend**: Hono on Cloudflare Workers/Pages (serves static assets, exposes `/api/config` and the secret-holding `/api/ai/insights` proxy)
- **Frontend**: Vanilla JavaScript (ES modules), no framework — organized into `config/`, `services/`, `utils/`, `components/`, `pages/`
- **Database/Auth**: Supabase (PostgreSQL + Row Level Security + Supabase Auth)
- **Charts**: Chart.js (CDN)
- **Styling**: Hand-written CSS design system with tokens (`public/static/css/styles.css`), Font Awesome icons

## Project Structure
```
webapp/
├── src/index.tsx                 # Hono backend: /api/config, /api/ai/insights, static asset fallthrough
├── public/
│   ├── index.html
│   └── static/
│       ├── css/styles.css        # Design tokens + all component styles
│       └── js/
│           ├── app.js            # Hash router + auth-gated bootstrap
│           ├── store.js          # Tiny shared app state
│           ├── config/           # supabase.js, ai.js — the ONLY config entry points
│           ├── services/         # One file per Supabase table/domain (transactionService, budgetService, ...)
│           ├── utils/             # currency.js, dates.js, calculations.js, validation.js, dom.js
│           ├── components/       # sidebar, topbar, modals/forms, charts, icons, layout, empty states
│           └── pages/             # dashboard, transactions, budgets, wallets, savings, calendar, reports, settings, auth, landing, legal
├── schema.sql                    # Full Supabase schema + RLS (paste into SQL Editor)
├── SUPABASE_SETUP.md              # Step-by-step beginner setup guide
├── .env.example                   # Template for .dev.vars / Cloudflare env vars
└── wrangler.jsonc
```

## Installation (local)
```bash
npm install
cp .env.example .dev.vars   # then fill in your Supabase URL/anon key
npm run build
pm2 start ecosystem.config.cjs   # or: npm run dev:sandbox
curl http://localhost:3000
```

## Supabase Setup
See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for the full beginner walkthrough
(create project → run `schema.sql` → copy URL/anon key → test signup/login/persistence).

## Environment Variables
See **[.env.example](./.env.example)**. Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
Optional: `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` (only for AI insights).

## API KEY CHECKLIST
- [ ] `SUPABASE_URL` — safe to expose to the browser (set in `.dev.vars` locally / Cloudflare env vars in production)
- [ ] `SUPABASE_ANON_KEY` — safe to expose to the browser; Row Level Security is what actually protects data
- [ ] `AI_API_KEY` — **secret**, optional, server-side only (`npx wrangler pages secret put AI_API_KEY`). Never place this in frontend code or in `wrangler.jsonc`'s committed `vars`.

## WHERE TO ADD API KEYS
- **Supabase**: `public/static/js/config/supabase.js` fetches them from the backend `/api/config` route, which reads `c.env.SUPABASE_URL` / `c.env.SUPABASE_ANON_KEY` in `src/index.tsx`. Set the actual values in `.dev.vars` (local) or Cloudflare Pages env vars (production) — never hardcode them in source.
- **AI**: `src/index.tsx`'s `/api/ai/insights` route reads `c.env.AI_API_KEY` server-side only. The frontend (`public/static/js/services/aiService.js`) never sees this key — it only calls the proxy route.

## Data Architecture
- **Storage**: Supabase PostgreSQL (see `schema.sql`) — no localStorage, no mock/fake data in production.
- **Tables**: `profiles`, `user_preferences`, `categories`, `wallets`, `transactions`, `budgets`, `budget_categories`, `savings_goals`, `recurring_transactions`, `upcoming_expenses`.
- **Security**: Row Level Security enabled on every table; every policy scopes rows to `auth.uid()`.
- **Calculations**: All financial math (balance, budget %, savings %, safe daily spend, period comparisons) lives in `public/static/js/utils/calculations.js` — deterministic JavaScript, never AI.
- **AI**: Optional, additive only. `src/index.tsx` `/api/ai/insights` forwards already-computed summary numbers to an LLM to generate short written observations. If AI is unavailable, the rest of the app keeps working normally.

## User Guide
1. Open the site → **Get Started** to sign up, or **Log In** if you already have an account.
2. On the Dashboard, pick a period (Weekly/Monthly/Yearly/Custom) from the top bar.
3. Use **Add Transaction** to log income/expenses.
4. Create **Budgets** to set spending limits per category or overall.
5. Add **Wallets** to separate cash, bank, e-wallet, etc.
6. Set **Savings Goals** and contribute funds toward them.
7. Set up **Recurring** transactions (salary, rent, subscriptions) and **Upcoming Expenses** (bills, tuition) under the Budgets page tabs.
8. Check the **Calendar** for a day-by-day view, and **Reports** for category breakdowns and period comparisons.
9. Adjust currency, theme, categories, and export your data from **Settings**.

## Deployment
This project deploys to **Cloudflare Pages**. In this sandbox, use the active
deploy skill (BYOK or Genspark-hosted, as applicable) or run:
```bash
npm run build
npx wrangler pages deploy dist --project-name <your-project-name>
```
Then set `SUPABASE_URL` / `SUPABASE_ANON_KEY` (and optionally `AI_API_KEY`) as
Cloudflare Pages environment variables/secrets before testing signup/login in
production.

After deploying, verify: site loads, signup works, login works, a transaction
saves and appears in Supabase's Table Editor, logout/login preserves data,
mobile layout works, and no secret keys are visible in browser DevTools.

## Deployment Status
- **Platform**: Cloudflare Pages (Hono backend)
- **Status**: ✅ Built and verified locally (PM2 + wrangler pages dev) — not yet deployed to production
- **Tech Stack**: Hono + TypeScript (backend) · Vanilla JS/CSS (frontend) · Supabase (DB/Auth)
- **Last Updated**: 2026-09-08

## Not Yet Implemented / Suggested Next Steps
- Server-side (Edge Function) full `auth.users` deletion for the "Delete Account" flow (client-side can only delete the `profiles` row + related data via cascade; fully removing the login credential requires Supabase's service-role key on a secure backend).
- JSON **import** (export is implemented; re-importing exported JSON back into Supabase is a good follow-up).
- Push/email notifications for budget/bill alerts (currently these are shown in-app only, via badges and the Insights card).
- Automated tests (unit tests for `utils/calculations.js`, e2e smoke tests for auth + CRUD flows).
