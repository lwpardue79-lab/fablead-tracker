-- Pilot workflow hardening: next actions, soft delete/restore, richer contact/bid fields.

alter type public.lead_status add value if not exists 'Archived';
alter type public.bid_status add value if not exists 'Archived';
alter type public.outreach_log_type add value if not exists 'Other';

alter table public.companies add column if not exists next_action_due_date date;
alter table public.companies add column if not exists next_action_owner text;
alter table public.companies add column if not exists next_action_priority text not null default 'Medium';
alter table public.companies add column if not exists deleted_at timestamptz;

alter table public.contacts add column if not exists source text;
alter table public.contacts add column if not exists confidence_level text not null default 'Medium';
alter table public.contacts add column if not exists deleted_at timestamptz;

alter table public.outreach_logs add column if not exists deleted_at timestamptz;

alter table public.follow_ups add column if not exists notes text;
alter table public.follow_ups add column if not exists deleted_at timestamptz;

alter table public.bid_opportunities add column if not exists deleted_at timestamptz;

alter table public.documents_templates add column if not exists deleted_at timestamptz;
alter table public.import_batches add column if not exists deleted_at timestamptz;

alter table public.shop_profile add column if not exists phone text;
alter table public.shop_profile add column if not exists email text;
alter table public.shop_profile add column if not exists website text;
alter table public.shop_profile add column if not exists past_project_examples text;

do $$
begin
  alter table public.follow_ups drop constraint if exists follow_ups_status_check;
  alter table public.follow_ups add constraint follow_ups_status_check check (status in ('Open','Completed','Snoozed','Canceled','Cancelled','Archived'));
exception when duplicate_object then null;
end $$;

create index if not exists companies_workspace_deleted_idx on public.companies (workspace_id, deleted_at);
create index if not exists companies_workspace_next_action_idx on public.companies (workspace_id, next_action_due_date) where deleted_at is null;
create index if not exists contacts_workspace_deleted_idx on public.contacts (workspace_id, deleted_at);
create index if not exists outreach_logs_workspace_deleted_idx on public.outreach_logs (workspace_id, deleted_at);
create index if not exists follow_ups_workspace_deleted_idx on public.follow_ups (workspace_id, deleted_at);
create index if not exists bid_opportunities_workspace_deleted_idx on public.bid_opportunities (workspace_id, deleted_at);

create or replace view public.weekly_owner_report with (security_invoker = true) as
select w.workspace_id,
  count(distinct c.company_id) filter (where c.created_at >= date_trunc('week', now()) and c.deleted_at is null) as buyers_added_this_week,
  count(distinct c.company_id) filter (where c.last_contacted_date >= date_trunc('week', now())::date and c.deleted_at is null) as companies_contacted_this_week,
  count(distinct ol.outreach_log_id) filter (where ol.outreach_date >= date_trunc('week', now()) and ol.deleted_at is null) as outreach_completed,
  count(distinct f.follow_up_id) filter (where f.status = 'Completed' and f.deleted_at is null) as follow_ups_completed,
  count(distinct f.follow_up_id) filter (where f.status in ('Open','Snoozed') and f.due_date < current_date and f.deleted_at is null) as follow_ups_overdue,
  count(distinct ol.outreach_log_id) filter (where ol.outreach_type = 'Portal Registration' and ol.outreach_date >= date_trunc('week', now()) and ol.deleted_at is null) as portals_registered,
  count(distinct b.bid_id) filter (where b.created_at >= date_trunc('week', now()) and b.deleted_at is null) as bid_opportunities_found,
  count(distinct c.company_id) filter (where c.lead_status::text = 'Bid Invite Received' and c.deleted_at is null) as bid_invites_received,
  count(distinct b.bid_id) filter (where b.bid_status = 'Submitted' and b.submitted_date >= date_trunc('week', now())::date and b.deleted_at is null) as bids_submitted,
  count(distinct b.bid_id) filter (where b.bid_status = 'Won' and b.deleted_at is null) as won_bids,
  count(distinct b.bid_id) filter (where b.bid_status = 'Lost' and b.deleted_at is null) as lost_bids,
  count(distinct b.bid_id) filter (where b.bid_status::text in ('No Bid','No-Bid') and b.deleted_at is null) as no_bid_results
from public.workspaces w
left join public.companies c on c.workspace_id = w.workspace_id
left join public.outreach_logs ol on ol.workspace_id = w.workspace_id
left join public.follow_ups f on f.workspace_id = w.workspace_id
left join public.bid_opportunities b on b.workspace_id = w.workspace_id
group by w.workspace_id;

grant select on public.weekly_owner_report to authenticated;
