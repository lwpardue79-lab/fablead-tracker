-- FabLead Tracker v1 — multi-tenant Supabase schema
create extension if not exists pgcrypto;
create schema if not exists private;

create type public.lead_status as enum ('New','Contacted','Qualified','Not Interested','Customer','Lost');
create type public.bid_status as enum ('Open','Submitted','Won','Lost','No Bid','Cancelled');
create type public.member_role as enum ('owner','admin','member','viewer');

create table public.workspaces (
  workspace_id uuid primary key default gen_random_uuid(),
  workspace_name text not null,
  base_address text,
  base_latitude numeric(9,6),
  base_longitude numeric(9,6),
  default_state text,
  company_name text,
  scoring_preferences jsonb not null default '{"distance":20,"company_type":15,"specialization":15,"contact_info":10,"decision_maker":10,"engagement":10,"open_bid":10,"company_size":5,"high_potential_notes":5}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.companies (
  company_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  company_name text not null,
  company_type text,
  industry_served text,
  website text,
  public_phone text,
  public_email text,
  street_address text,
  city text,
  state text,
  zip_code text,
  country text not null default 'USA',
  latitude numeric(9,6),
  longitude numeric(9,6),
  distance_from_base_miles numeric(8,2),
  employee_count_estimate integer check (employee_count_estimate is null or employee_count_estimate >= 0),
  revenue_estimate text,
  shop_size text,
  specialization text,
  source text,
  source_url text,
  prequalification_url text,
  bid_portal_url text,
  invite_list_status text,
  typical_scopes text,
  data_verified_at timestamptz,
  lead_status public.lead_status not null default 'New',
  lead_score integer not null default 0 check (lead_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notes text,
  unique (workspace_id, company_name)
);

create table public.contacts (
  contact_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  company_id uuid not null references public.companies(company_id) on delete cascade,
  first_name text,
  last_name text,
  title text,
  email text,
  phone text,
  linkedin_url text,
  contact_type text,
  decision_maker boolean not null default false,
  preferred_contact_method text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outreach_activities (
  outreach_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  company_id uuid not null references public.companies(company_id) on delete cascade,
  contact_id uuid references public.contacts(contact_id) on delete set null,
  activity_date timestamptz not null default now(),
  activity_type text not null check (activity_type in ('Call','Email','Meeting','LinkedIn','Note','Other')),
  direction text check (direction in ('Inbound','Outbound')),
  subject text,
  summary text,
  outcome text,
  next_step text,
  next_follow_up_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);

create table public.bid_opportunities (
  bid_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  company_id uuid not null references public.companies(company_id) on delete cascade,
  contact_id uuid references public.contacts(contact_id) on delete set null,
  project_name text not null,
  project_type text,
  location text,
  estimated_value numeric(14,2) check (estimated_value is null or estimated_value >= 0),
  bid_due_date date,
  bid_status public.bid_status not null default 'Open',
  probability_to_win numeric(5,2) check (probability_to_win between 0 and 100),
  submitted_date date,
  result text,
  reason_won_lost text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.follow_ups (
  follow_up_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  company_id uuid not null references public.companies(company_id) on delete cascade,
  contact_id uuid references public.contacts(contact_id) on delete set null,
  related_outreach_id uuid references public.outreach_activities(outreach_id) on delete set null,
  due_date date not null,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Urgent')),
  task_type text,
  description text not null,
  status text not null default 'Open' check (status in ('Open','Completed','Cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'Completed' and completed_at is not null) or status <> 'Completed')
);

create table public.tags (
  tag_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  tag_name text not null,
  tag_category text,
  created_at timestamptz not null default now(),
  unique (workspace_id, tag_name)
);

create table public.company_tags (
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  company_id uuid not null references public.companies(company_id) on delete cascade,
  tag_id uuid not null references public.tags(tag_id) on delete cascade,
  primary key (company_id, tag_id)
);

create table public.saved_views (
  view_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  view_name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

create table public.import_batches (
  import_batch_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  file_name text not null,
  imported_at timestamptz not null default now(),
  total_rows integer not null default 0 check (total_rows >= 0),
  successful_rows integer not null default 0 check (successful_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  notes text,
  check (successful_rows + failed_rows <= total_rows)
);

create table public.pilot_sessions (
  pilot_session_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  shop_name text not null,
  tester_name text,
  work_type text,
  service_radius text,
  status text not null default 'Active' check (status in ('Active','Completed','Paused')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text
);

create table public.pilot_feedback (
  pilot_feedback_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  pilot_session_id uuid references public.pilot_sessions(pilot_session_id) on delete cascade,
  useful_buyers text,
  missing_data text,
  willingness_to_pay text,
  notes text,
  created_at timestamptz not null default now()
);

-- Prevent cross-workspace relationships even if UUIDs are guessed or reused.
alter table public.companies add constraint companies_id_workspace_unique unique (company_id, workspace_id);
alter table public.contacts add constraint contacts_id_workspace_unique unique (contact_id, workspace_id);
alter table public.outreach_activities add constraint outreach_id_workspace_unique unique (outreach_id, workspace_id);
alter table public.tags add constraint tags_id_workspace_unique unique (tag_id, workspace_id);
alter table public.contacts add constraint contacts_company_workspace_fk foreign key (company_id, workspace_id) references public.companies(company_id, workspace_id);
alter table public.outreach_activities add constraint outreach_company_workspace_fk foreign key (company_id, workspace_id) references public.companies(company_id, workspace_id);
alter table public.outreach_activities add constraint outreach_contact_workspace_fk foreign key (contact_id, workspace_id) references public.contacts(contact_id, workspace_id);
alter table public.bid_opportunities add constraint bids_company_workspace_fk foreign key (company_id, workspace_id) references public.companies(company_id, workspace_id);
alter table public.bid_opportunities add constraint bids_contact_workspace_fk foreign key (contact_id, workspace_id) references public.contacts(contact_id, workspace_id);
alter table public.follow_ups add constraint followups_company_workspace_fk foreign key (company_id, workspace_id) references public.companies(company_id, workspace_id);
alter table public.follow_ups add constraint followups_contact_workspace_fk foreign key (contact_id, workspace_id) references public.contacts(contact_id, workspace_id);
alter table public.follow_ups add constraint followups_outreach_workspace_fk foreign key (related_outreach_id, workspace_id) references public.outreach_activities(outreach_id, workspace_id);
alter table public.company_tags add constraint company_tags_company_workspace_fk foreign key (company_id, workspace_id) references public.companies(company_id, workspace_id);
alter table public.company_tags add constraint company_tags_tag_workspace_fk foreign key (tag_id, workspace_id) references public.tags(tag_id, workspace_id);

-- High-frequency dashboard/filter paths and every non-leading foreign key.
create index companies_workspace_status_idx on public.companies (workspace_id, lead_status);
create index companies_workspace_score_idx on public.companies (workspace_id, lead_score desc);
create index companies_workspace_location_idx on public.companies (workspace_id, state, city);
create index companies_workspace_specialization_idx on public.companies (workspace_id, specialization);
create index companies_workspace_distance_idx on public.companies (workspace_id, distance_from_base_miles);
create index companies_created_at_idx on public.companies (workspace_id, created_at desc);
create index contacts_company_id_idx on public.contacts (company_id);
create index contacts_workspace_follow_up_idx on public.contacts (workspace_id, next_follow_up_at);
create index outreach_company_date_idx on public.outreach_activities (company_id, activity_date desc);
create index outreach_contact_id_idx on public.outreach_activities (contact_id);
create index outreach_workspace_date_idx on public.outreach_activities (workspace_id, activity_date desc);
create index bids_company_id_idx on public.bid_opportunities (company_id);
create index bids_contact_id_idx on public.bid_opportunities (contact_id);
create index bids_workspace_status_due_idx on public.bid_opportunities (workspace_id, bid_status, bid_due_date);
create index follow_ups_company_id_idx on public.follow_ups (company_id);
create index follow_ups_contact_id_idx on public.follow_ups (contact_id);
create index follow_ups_outreach_id_idx on public.follow_ups (related_outreach_id);
create index follow_ups_workspace_open_due_idx on public.follow_ups (workspace_id, due_date) where status = 'Open';
create index company_tags_workspace_idx on public.company_tags (workspace_id);
create index company_tags_tag_id_idx on public.company_tags (tag_id);
create index saved_views_workspace_idx on public.saved_views (workspace_id);
create index import_batches_workspace_idx on public.import_batches (workspace_id, imported_at desc);
create index workspace_members_user_id_idx on public.workspace_members (user_id, workspace_id);
create index pilot_sessions_workspace_idx on public.pilot_sessions (workspace_id, started_at desc);
create index pilot_feedback_workspace_idx on public.pilot_feedback (workspace_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger companies_set_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger contacts_set_updated_at before update on public.contacts for each row execute function public.set_updated_at();
create trigger bids_set_updated_at before update on public.bid_opportunities for each row execute function public.set_updated_at();

-- Deterministic, explainable scoring. Call after imports or material changes.
create or replace function public.calculate_lead_score(p_company_id uuid)
returns integer language sql stable security invoker set search_path = '' as $$
  select least(100, greatest(0,
    case when c.distance_from_base_miles <= 25 then 20 when c.distance_from_base_miles <= 50 then 15 when c.distance_from_base_miles <= 100 then 10 else 0 end +
    case when lower(coalesce(c.company_type,'')) ~ '(fabricat|weld|steel|contract)' then 15 else 0 end +
    case when c.specialization is not null then 15 else 0 end +
    case when c.public_email is not null and c.public_phone is not null then 10 when c.public_email is not null or c.public_phone is not null then 5 else 0 end +
    case when exists (select 1 from public.contacts x where x.company_id=c.company_id and x.decision_maker) then 10 else 0 end +
    case when exists (select 1 from public.outreach_activities o where o.company_id=c.company_id and o.activity_date >= now()-interval '30 days' and lower(coalesce(o.outcome,'')) !~ '(not interested|no response)') then 10 else 0 end +
    case when exists (select 1 from public.bid_opportunities b where b.company_id=c.company_id and b.bid_status in ('Open','Submitted')) then 10 else 0 end +
    case when c.employee_count_estimate between 10 and 250 then 5 else 0 end +
    case when lower(coalesce(c.notes,'')) ~ '(high potential|expanding|urgent|active project|good fit)' then 5 else 0 end
  ))::integer from public.companies c where c.company_id=p_company_id;
$$;

-- Security-invoker views honor underlying RLS.
create view public.dashboard_metrics with (security_invoker = true) as
select w.workspace_id,
 (select count(*) from public.companies c where c.workspace_id=w.workspace_id) total_companies,
 (select count(*) from public.contacts c where c.workspace_id=w.workspace_id) total_contacts,
 (select count(*) from public.companies c where c.workspace_id=w.workspace_id and c.created_at>=date_trunc('month',now())) new_leads_this_month,
 (select count(distinct o.company_id) from public.outreach_activities o where o.workspace_id=w.workspace_id and o.activity_date>=date_trunc('month',now())) contacted_leads_this_month,
 (select count(*) from public.companies c where c.workspace_id=w.workspace_id and c.lead_status='Qualified') qualified_leads,
 (select count(*) from public.bid_opportunities b where b.workspace_id=w.workspace_id and b.bid_status in ('Open','Submitted')) open_bid_opportunities,
 (select count(*) from public.bid_opportunities b where b.workspace_id=w.workspace_id and b.bid_status in ('Open','Submitted') and b.bid_due_date between current_date and current_date+6) bids_due_this_week,
 (select count(*) from public.follow_ups f where f.workspace_id=w.workspace_id and f.status='Open' and f.due_date<current_date) overdue_follow_ups,
 (select round(avg(c.lead_score),1) from public.companies c where c.workspace_id=w.workspace_id) average_lead_score
from public.workspaces w;

create view public.bid_win_rates with (security_invoker = true) as
select workspace_id, project_type,
 count(*) filter (where bid_status='Won') wins,
 count(*) filter (where bid_status='Lost') losses,
 round(100.0*count(*) filter (where bid_status='Won')/nullif(count(*) filter (where bid_status in ('Won','Lost')),0),1) win_rate_percent
from public.bid_opportunities group by workspace_id, project_type;

-- Data API privileges are explicit (required for new Supabase projects as of 2026).
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.dashboard_metrics, public.bid_win_rates to authenticated;
revoke all on all tables in schema public from anon;

-- Tenant isolation: membership determines access; no service-role key belongs in a browser.
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.outreach_activities enable row level security;
alter table public.bid_opportunities enable row level security;
alter table public.follow_ups enable row level security;
alter table public.tags enable row level security;
alter table public.company_tags enable row level security;
alter table public.saved_views enable row level security;
alter table public.import_batches enable row level security;
alter table public.pilot_sessions enable row level security;
alter table public.pilot_feedback enable row level security;

-- Private helpers avoid recursive workspace_members RLS. They always bind to auth.uid().
create or replace function private.has_workspace_role(p_workspace_id uuid, p_roles public.member_role[] default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id=p_workspace_id
      and wm.user_id=(select auth.uid())
      and (p_roles is null or wm.role=any(p_roles))
  );
$$;
revoke all on function private.has_workspace_role(uuid,public.member_role[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.has_workspace_role(uuid,public.member_role[]) to authenticated;

-- Workspace bootstrap is performed server-side: create workspace, then first owner membership.
create policy workspaces_select on public.workspaces for select to authenticated using ((select private.has_workspace_role(workspace_id)));
create policy workspaces_update on public.workspaces for update to authenticated using ((select private.has_workspace_role(workspace_id,array['owner','admin']::public.member_role[]))) with check ((select private.has_workspace_role(workspace_id,array['owner','admin']::public.member_role[])));
create policy members_select on public.workspace_members for select to authenticated using (user_id=(select auth.uid()) or (select private.has_workspace_role(workspace_id,array['owner','admin']::public.member_role[])));
create policy members_insert on public.workspace_members for insert to authenticated with check ((select private.has_workspace_role(workspace_id,array['owner','admin']::public.member_role[])));
create policy members_update on public.workspace_members for update to authenticated using ((select private.has_workspace_role(workspace_id,array['owner','admin']::public.member_role[]))) with check ((select private.has_workspace_role(workspace_id,array['owner','admin']::public.member_role[])));
create policy members_delete on public.workspace_members for delete to authenticated using ((select private.has_workspace_role(workspace_id,array['owner','admin']::public.member_role[])));

-- Same simple membership predicate across business tables; writes exclude viewers.
do $$ declare t text; begin
  foreach t in array array['companies','contacts','outreach_activities','bid_opportunities','follow_ups','tags','company_tags','saved_views','import_batches','pilot_sessions','pilot_feedback'] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select private.has_workspace_role(workspace_id)))',t||'_select',t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'']::public.member_role[])))',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'']::public.member_role[]))) with check ((select private.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'']::public.member_role[])))',t||'_update',t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.has_workspace_role(workspace_id,array[''owner'',''admin'']::public.member_role[])))',t||'_delete',t);
  end loop;
end $$;
