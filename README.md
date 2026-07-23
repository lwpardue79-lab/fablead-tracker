# FabLead Tracker

FabLead Tracker is a fabrication-focused buyer and opportunity database. The launch market is the Kansas City metro across Missouri and Kansas; the territory model is designed to expand across the United States. This MVP includes a polished Next.js dashboard, a multi-tenant Supabase PostgreSQL schema, explainable buyer-fit scoring, source-verified KC launch records, example reporting queries, and CSV tools.

## What is included

- Dashboard metrics, top leads, bids, and upcoming follow-ups
- Searchable company and contact views, plus company detail/history
- Outreach, bid opportunity, and follow-up workflows
- A built-in Pilot Test page for running a 1-week validation with a real shop
- CSV import template and browser export
- Workspace-based tenant isolation with Supabase Auth-ready RLS
- Indexed schema, enum/check constraints, timestamp triggers, and security-invoker reporting views
- Kansas City launch seed data using public business/source records

## Run the dashboard

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. For production or a real Shawnee Steel pilot, set Supabase environment values and require login. If Supabase environment values are missing, the app falls back to local browser storage for development only.

Required environment variables:

```bash
NEXT_PUBLIC_APP_URL=https://fablead-tracker.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xtpqniktirazzsnzfjqu.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Never put a secret/service-role key in a browser environment variable.

For a real company test, open `/pilot` and follow [PILOT_TEST.md](./PILOT_TEST.md).
Before a one-week pilot, run the manual QA checklist in [MANUAL_QA_CHECKLIST.md](./MANUAL_QA_CHECKLIST.md).

## Public demo URL

For a professional company pilot, deploy the app and use a branded URL such as:

- `https://demo.fableadtracker.com`
- `https://app.fableadtracker.com`
- a temporary Vercel URL like `https://fablead-tracker.vercel.app`

Set `NEXT_PUBLIC_APP_URL` to the final hosted URL so metadata, sharing previews, and canonical app references are production-ready. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full deployment and custom-domain checklist.

## Set up Supabase

1. Use the connected Supabase project: `https://xtpqniktirazzsnzfjqu.supabase.co`.
2. Enable email/password authentication in Supabase Auth.
3. Disable unrestricted public signup for production. Create or invite approved Shawnee Steel users from Supabase Auth instead.
4. Require email confirmation before users can access the app.
5. In the SQL editor or Supabase CLI, run migrations in timestamp order:
   - `supabase/migrations/20260630000000_initial_schema.sql`
   - `supabase/migrations/20260708000000_internal_crm_upgrade.sql`
   - `supabase/migrations/20260708155943_move_pg_trgm_extension.sql`
   - `supabase/migrations/20260708162000_pilot_workflow_soft_delete.sql`
   - `supabase/migrations/20260709134000_bid_reporting_fields.sql`
   - `supabase/migrations/20260723090000_production_foundation.sql`
6. Run `supabase/seed.sql` only if you want demo records in a non-production workspace.
7. Confirm the private `fablead-documents` storage bucket exists. The production foundation migration creates it with workspace-scoped storage policies.
8. Set the public environment variables in Vercel, restart or redeploy the app, and sign in at `/login`. The app calls `bootstrap_shawnee_workspace()` to create or attach the Shawnee Steel & Welding workspace for the authenticated user.

For Supabase CLI development, initialize/link the project and use the normal migration workflow (`supabase db reset`, then `supabase db push`). The migrations explicitly grant Data API access because new Supabase projects no longer expose new public tables automatically. Every exposed business table has RLS enabled.

## Authentication, roles, and RLS

Production pages are protected by `proxy.ts` when Supabase environment variables are present. Unauthenticated users are redirected to `/login`.

Application roles:

- Admin
- Estimator
- Business Development
- Read Only

The current RLS foundation uses workspace membership for data isolation and the existing database roles `owner`, `admin`, `member`, and `viewer` for enforcement. Use those membership roles as follows:

- `owner` / `admin`: full workspace access, user administration, imports/exports, deletes/restores, audit logs.
- `member`: estimator or business-development user who can create and edit records.
- `viewer`: read-only user.

Do not let users edit their own role from the browser. Role and membership changes should be performed by an admin through Supabase or a future admin UI.

## Data persistence model

Supabase is the production source of truth. Browser storage is only a development fallback when Supabase env vars are missing. In production:

- creates, edits, deletes, restores, status changes, imports, and reports should read/write Supabase;
- row-level security restricts records to active workspace members;
- realtime subscriptions refresh common record lists when another user changes companies, contacts, bids, tasks/follow-ups, or outreach logs;
- soft-deleted records use `deleted_at` and can be restored before permanent deletion.

## Storage and documents

Use Supabase Storage bucket `fablead-documents`.

Recommended storage path format:

```text
{workspace_id}/{entity_type}/{entity_id}/{version_or_timestamp}-{file_name}
```

The migration adds policies so authenticated users can only access files under a workspace folder where they are a member. Admin/owner users can delete; member users can upload and update.

## Backup recommendations

- Enable Supabase point-in-time recovery or scheduled backups before using the app as Shawnee Steel’s source of truth.
- Export companies, contacts, bids, tasks, registrations, and audit logs weekly during the pilot.
- Keep source documents in Supabase Storage and avoid overwriting proposal versions.
- Never store portal passwords, payment card data, bank data, or private financial information in FabLead Tracker.

## How Shawnee Steel should use it daily

1. Start on Dashboard and review overdue tasks, bids due this week, and unassigned records.
2. Add or update companies from public buyer/GC/prequalification sources.
3. Add contacts and mark estimating, prequalification, project manager, or decision-maker roles.
4. Log every call, email, meeting, site visit, registration update, and customer reply.
5. Create follow-up tasks with owners and due dates.
6. Track every bid invite from received through submitted/won/lost/no-bid.
7. Upload drawings, specs, addenda, quotes, proposals, W-9s, insurance certificates, and prequalification documents.
8. Review Weekly Owner Report and Bid Reports during the weekly business-development meeting.

## CSV import format

Use `public/fablead-companies-template.csv`. `company_name` is required. Recommended deduplication key is `workspace_id + company_name`; imports should upsert only after the user previews row-level validation. Store public business contact information only—no payment card, bank, tax, private financial, or sensitive personal information.

Suggested import flow:

1. Parse locally in the browser and show a preview.
2. Map incoming headers to the template fields.
3. Validate required values, email/URL shape, enum values, and score range.
4. Insert in batches and record counts in `import_batches`.
5. Recalculate scores after contacts, outreach, and bids are loaded.

## Lead scoring (100 points)

The included SQL function is deterministic and easy to explain: distance 20, company-type fit 15, specialization 15, contact completeness 10, decision maker 10, recent positive engagement 10, open bid 10, size fit 5, and high-potential notes 5. Keep the UI’s settings weights as preferences until a later migration makes each scoring component fully configurable.

## Page structure

```text
app/
  page.tsx                 Dashboard
  companies/               Company list and detail
  contacts/                Contact list
  outreach/                Activity history and entry
  bids/                    Opportunity pipeline
  follow-ups/              Prioritized task list
  import-export/           CSV tools
  settings/                Workspace and scoring preferences
```

## Production checklist

- Apply all migrations in timestamp order before enabling real Supabase login.
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel.
- Create/invite users in Supabase Auth; public self-signup is not exposed in the app.
- Use `/login` to sign into an email/password account; the app calls `bootstrap_shawnee_workspace()` to create the Shawnee Steel & Welding workspace and shop profile for the first authenticated user.
- Use `/shop-profile` to tune trade scopes, radius, project size, certifications, and contact info.
- Use `/capability` for capability statement and outreach email templates.
- Use `/reports` for the weekly owner report.
- Keep browser-storage fallback limited to local development only.
- Add server-side CSV batch validation, duplicate review, and error download.
- Add tests for every RLS role (owner, admin, member, viewer, anonymous).
- Run Supabase database/security advisors after applying migrations.
- Configure backups, a custom domain, error tracking, privacy terms, and retention rules.
- Add pagination before regional packages exceed a few hundred records.

## Practical upgrades

Next: bid calendar, automated reminders, mobile rep view, configurable score explanations, and Google Maps distance calculation. Later: Gmail history, team invitations, Stripe billing, AI outreach summaries, regional lead packages, and CRM integrations. AI features should suggest and explain; the underlying score and activity history should remain auditable.

## Product packaging

- **Software dashboard:** recurring subscription per workspace with team seats later.
- **Custom setup:** import, cleanup, scoring configuration, and training for a shop.
- **Regional database package:** curated public business leads delivered into a customer-owned workspace, with source and refresh date recorded.
