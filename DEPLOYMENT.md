# FabLead Tracker deployment

Use this checklist to turn the local pilot into a professional public app link.

## Recommended launch URL

Use one of these:

- `https://app.fableadtracker.com`
- `https://demo.fableadtracker.com`
- a temporary Vercel URL like `https://fablead-tracker.vercel.app`

For a company pilot, `demo.fableadtracker.com` is the cleanest because it sets expectations that this is a test environment.

## Deploy on Vercel

1. Push this project to GitHub.
2. In Vercel, choose **Add New Project**.
3. Import the GitHub repo.
4. Framework preset should auto-detect as **Next.js**.
5. Add environment variables:

   ```text
   NEXT_PUBLIC_APP_URL=https://demo.fableadtracker.com
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

   For the current browser-storage pilot, Supabase values can remain placeholders until live auth/data is connected.

6. Click **Deploy**.
7. After deployment, open the Vercel URL and test:

   - Dashboard loads
   - Companies page shows buyer records
   - Add buyer works
   - Add contact works
   - Add verified opportunity works
   - Add follow-up works
   - Import / Export works
   - Settings → Reset pilot data works

## Connect a custom domain

1. In Vercel project settings, open **Domains**.
2. Add `demo.fableadtracker.com` or `app.fableadtracker.com`.
3. In your domain DNS provider, add the record Vercel gives you.
4. Wait for Vercel to show the domain as valid.
5. Update `NEXT_PUBLIC_APP_URL` to the final `https://...` domain.
6. Redeploy.

## Company pilot recommendation

Start with one shop using a demo URL and the Kansas City buyer list:

- Give them a 20-minute walkthrough.
- Ask them to add 5 real target buyers.
- Ask them to log 3 follow-ups.
- Ask whether the buyer/bid-list workflow is clearer than their current spreadsheet.
- Ask what they would pay for a cleaned regional list plus this dashboard.

Avoid promising automated bid feeds until those source integrations are live.
