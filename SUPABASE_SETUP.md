# Tallyo — Supabase Setup Guide (Beginner Friendly)

This guide walks you through connecting Tallyo to a real Supabase backend,
step by step. No prior Supabase experience needed.

## 1. Create a Supabase account
Go to https://supabase.com and sign up (GitHub login works great).

## 2. Create a new Supabase project
1. Click **New Project**.
2. Choose an organization, give the project a name (e.g. `tallyo`).
3. Set a strong database password (save it somewhere safe).
4. Choose the region closest to you and click **Create new project**.
5. Wait 1–2 minutes for provisioning to finish.

## 3. Open the SQL Editor
In the left sidebar, click **SQL Editor** → **New query**.

## 4. Copy the contents of `schema.sql`
Open the `schema.sql` file included in this project, select all, and copy it.

## 5. Run the SQL
Paste it into the SQL Editor and click **Run** (or press Ctrl/Cmd+Enter).
You should see "Success. No rows returned." This creates every table,
index, trigger, and Row Level Security policy Tallyo needs — safely, with
no `DROP TABLE` statements, so it won't destroy existing data.

## 6. Find your Supabase Project URL
Go to **Project Settings** (gear icon) → **API**. Copy the **Project URL**
(looks like `https://xxxxxxxxxxxx.supabase.co`).

## 7. Find your Supabase anon/public key
On the same **API** settings page, copy the **anon public** key under
"Project API keys". This key is safe to use in frontend code — Row Level
Security is what actually protects your data.

## 8. Add the values to the project configuration
- **Local development**: copy `.env.example` to `.dev.vars` in the project
  root, then fill in:
  ```
  SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
  SUPABASE_ANON_KEY=your-anon-key-here
  ```
- **Production (Cloudflare Pages)**: add the same two variables in the
  Cloudflare Pages dashboard under **Settings → Environment variables**,
  or run:
  ```
  npx wrangler pages secret put SUPABASE_URL
  npx wrangler pages secret put SUPABASE_ANON_KEY
  ```

## 9. Start the website
```
npm install
npm run build
pm2 start ecosystem.config.cjs   # or: npm run dev:sandbox
```
Visit the site in your browser.

## 10. Test account registration
Click **Get Started** → fill in name, email, password → **Create Account**.
If email confirmation is enabled on your Supabase project (default for new
projects), check your inbox and confirm before logging in. You can disable
email confirmation for local testing under **Authentication → Providers →
Email → Confirm email**.

## 11. Test login
Log in with the account you just created. You should land on the Dashboard.

## 12. Test creating a transaction
Click **Add Transaction**, fill in an amount/category/date, and save.

## 13. Verify the transaction appears in Supabase
In Supabase, go to **Table Editor → transactions**. You should see your new
row there, with `user_id` matching your account.

## 14. Test logging out and back in
Use the log-out button in the sidebar, then log back in with the same
credentials.

## 15. Verify data persists
Your transaction should still be visible on the Dashboard and Transactions
page after logging back in — confirming Supabase (not browser storage) is
the source of truth.

---

### Troubleshooting
- **"Supabase is not configured yet" warning in the browser console** →
  double-check `.dev.vars` (local) or your Cloudflare environment variables
  (production) contain the correct `SUPABASE_URL` / `SUPABASE_ANON_KEY`.
- **Signup succeeds but login fails** → your Supabase project may require
  email confirmation. Check your inbox, or disable confirmation for testing.
- **"new row violates row-level security policy"** → make sure you ran the
  *entire* `schema.sql` file, including the RLS policy sections at the
  bottom — partial runs will leave some tables unprotected/blocked.
