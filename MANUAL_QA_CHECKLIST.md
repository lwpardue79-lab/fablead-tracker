# FabLead Tracker Manual QA Checklist

Use this before a Shawnee Steel & Welding one-week pilot.

## Delete / restore safety

- Delete/archive a company from Companies.
- Confirm the company disappears from normal Companies, Contacts, Bids, Outreach, and Follow-Ups views.
- Open Settings → Deleted Items.
- Confirm the deleted company appears with a deleted date.
- Restore the company.
- Confirm it returns to Companies.
- Delete/archive a contact, bid, follow-up, and outreach log.
- Confirm each disappears from normal pages and appears in Deleted Items.
- Restore each record and confirm it returns.
- Permanently delete a non-critical test record.
- Confirm it no longer appears in Deleted Items.
- Delete/archive a company with related contacts, bids, outreach logs, and follow-ups.
- Confirm the app does not crash.

## Workflow

- Add a company with next action, due date, owner, priority, status, and notes.
- Set a next action due date in the past.
- Confirm Dashboard shows it as overdue.
- Use company quick buttons:
  - Log Call
  - Log Email
  - Mark Registered
  - Add Follow-Up
  - Add Bid
- Confirm the related records appear in Outreach, Follow-Ups, and Bids.
- Log outreach with a next follow-up date.
- Confirm a follow-up is created automatically.
- Mark a follow-up complete.
- Snooze a follow-up.
- Edit a follow-up.

## Contacts

- Add a contact with contact type, LinkedIn URL, source, confidence, and notes.
- Edit the contact.
- Delete/archive and restore the contact from Deleted Items.

## Bids

- Add a manual bid opportunity.
- Confirm weighted value calculates on the Bids page.
- Change status to Submitted, Won, Lost, and No-Bid.
- Confirm dashboard/report counts update.

## CSV import/export

- Download the template.
- Import companies and contacts.
- Import a CSV with duplicate company names.
- Confirm duplicate warnings appear before import.
- Cancel a previewed import.
- Import previewed records.
- Export companies.
- Export contacts/outreach/follow-ups/bids.
- Export weekly report CSV and PDF.

## Storage modes

- With Supabase env vars present and a logged-in user, confirm Settings says “Database connected.”
- Without Supabase env vars, confirm Settings says “Browser storage mode.”
- In browser-storage mode, confirm add/edit/delete/restore works.
- In Supabase mode, confirm add/edit/delete/restore persists after refresh.
