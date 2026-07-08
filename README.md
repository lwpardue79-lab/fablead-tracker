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

Open `http://localhost:3000`. Without environment values the app displays the Kansas City launch dataset. For live data, create a Supabase project and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never put a secret/service-role key in a browser environment variable.

For a real company test, open `/pilot` and follow [PILOT_TEST.md](./PILOT_TEST.md).

## Public demo URL

For a professional company pilot, deploy the app and use a branded URL such as:

- `https://demo.fableadtracker.com`
- `https://app.fableadtracker.com`
- a temporary Vercel URL like `https://fablead-tracker.vercel.app`

Set `NEXT_PUBLIC_APP_URL` to the final hosted URL so metadata, sharing previews, and canonical app references are production-ready. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full deployment and custom-domain checklist.

## Set up Supabase

1. Create a Supabase project and enable email/password authentication.
2. In the SQL editor, run `supabase/migrations/20260630000000_initial_schema.sql`.
3. Run `supabase/seed.sql` if you want the fictional demo records.
4. Create a user in Auth, copy its UUID, and run the commented membership insert at the bottom of `seed.sql`.
5. Set the two public environment variables, restart the app, and replace the demo-data reads with Supabase queries as screens are made production-live.

For Supabase CLI development, initialize/link the project and use the normal migration workflow (`supabase db reset`, then `supabase db push`). The migration explicitly grants Data API access because new Supabase projects no longer expose new public tables automatically. Every exposed table also has RLS enabled.

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

- Apply `supabase/migrations/20260708000000_internal_crm_upgrade.sql` before enabling real Supabase login.
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel.
- Use `/login` to create/sign into an email/password account; the app calls `bootstrap_shawnee_workspace()` to create the Shawnee Steel & Welding workspace and shop profile for the first authenticated user.
- Use `/shop-profile` to tune trade scopes, radius, project size, certifications, and contact info.
- Use `/capability` for capability statement and outreach email templates.
- Use `/reports` for the weekly owner report.
- Add authenticated sign-in and a server-side workspace bootstrap endpoint.
- Replace the local launch dataset with typed Supabase queries and mutations.
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
