-- FabLead Tracker production foundation
-- Additive migration only: does not delete existing user-entered data.

do $$ begin
  create type public.app_role as enum ('Admin','Estimator','Business Development','Read Only');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.company_type_option as enum (
    'General Contractor','Steel Fabricator','Steel Erector','Manufacturer','Industrial Facility',
    'Municipality','School District','Property Manager','Facility Manager','Developer','Engineer',
    'EPC Firm','Public Buyer','Vendor','Partner','Competitor','Other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.customer_status_option as enum ('Current Customer','Former Customer','Prospect','Partner','Vendor','Competitor','Not a Fit');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.bid_stage_option as enum (
    'Invite Received','Reviewing','Go/No-Go','Estimating','Waiting on Quotes','Ready for Review',
    'Submitted','Clarification','Award Pending','Won','Lost','No Bid','Cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.activity_type_option as enum (
    'Call','Email','Meeting','Site Visit','Note','Bid Invitation','Bid Submitted','Registration Update',
    'Follow-Up Completed','Status Change','File Uploaded','Customer Reply','Other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_status_option as enum ('Open','In Progress','Waiting','Completed','Cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.registration_status_option as enum (
    'Not Started','Started','Missing Information','Submitted','Approved','Rejected','Expiring Soon','Expired','Renewal Submitted'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_category_option as enum (
    'Drawing','Specification','Addendum','Scope Sheet','Supplier Quote','Subcontractor Quote','Proposal',
    'Capability Statement','W-9','Insurance Certificate','Safety Document','Welding Certification',
    'Prequalification Document','Contract','Purchase Order','Email Attachment','Other'
  );
exception when duplicate_object then null;
end $$;

alter type public.bid_status add value if not exists 'Canceled';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  role public.app_role not null default 'Read Only',
  job_title text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies add column if not exists customer_status text not null default 'Prospect';
alter table public.companies add column if not exists relationship_status text;
alter table public.companies add column if not exists address_line_1 text;
alter table public.companies add column if not exists address_line_2 text;
alter table public.companies add column if not exists service_area text;
alter table public.companies add column if not exists distance_from_shawnee numeric(8,2);
alter table public.companies add column if not exists buyer_score integer check (buyer_score is null or buyer_score between 0 and 100);
alter table public.companies add column if not exists fit_score integer check (fit_score is null or fit_score between 0 and 100);
alter table public.companies add column if not exists relationship_strength text;
alter table public.companies add column if not exists priority text not null default 'Medium';
alter table public.companies add column if not exists assigned_owner_id uuid references auth.users(id) on delete set null;
alter table public.companies add column if not exists backup_owner_id uuid references auth.users(id) on delete set null;
alter table public.companies add column if not exists last_verified_at timestamptz;
alter table public.companies add column if not exists next_action_due_at timestamptz;
alter table public.companies add column if not exists active boolean not null default true;
alter table public.companies add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.companies add column if not exists updated_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.companies add column if not exists deleted_at timestamptz;
alter table public.companies add constraint companies_customer_status_valid check (customer_status in ('Current Customer','Former Customer','Prospect','Partner','Vendor','Competitor','Not a Fit')) not valid;
alter table public.companies add constraint companies_priority_valid check (priority in ('Low','Medium','High','Urgent')) not valid;

alter table public.contacts add column if not exists job_title text;
alter table public.contacts add column if not exists department text;
alter table public.contacts add column if not exists direct_phone text;
alter table public.contacts add column if not exists mobile_phone text;
alter table public.contacts add column if not exists contact_role text;
alter table public.contacts add column if not exists relationship_strength text;
alter table public.contacts add column if not exists source_url text;
alter table public.contacts add column if not exists last_verified_at timestamptz;
alter table public.contacts add column if not exists do_not_contact boolean not null default false;
alter table public.contacts add column if not exists primary_contact boolean not null default false;
alter table public.contacts add column if not exists active boolean not null default true;
alter table public.contacts add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.contacts add column if not exists updated_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.contacts add column if not exists deleted_at timestamptz;
alter table public.contacts add constraint contacts_role_valid check (contact_role is null or contact_role in ('Decision Maker','Estimator','Project Manager','Purchasing','Preconstruction','Gatekeeper','Accounts Payable','Vendor Registration','Owner','Executive','Other')) not valid;

create table if not exists public.company_contact_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  company_id uuid not null references public.companies(company_id) on delete cascade,
  contact_id uuid not null references public.contacts(contact_id) on delete cascade,
  relationship_label text,
  primary_for_company boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, company_id, contact_id)
);

alter table public.bid_opportunities add column if not exists bid_number text;
alter table public.bid_opportunities add column if not exists primary_contact_id uuid references public.contacts(contact_id) on delete set null;
alter table public.bid_opportunities add column if not exists assigned_estimator_id uuid references auth.users(id) on delete set null;
alter table public.bid_opportunities add column if not exists assigned_sales_owner_id uuid references auth.users(id) on delete set null;
alter table public.bid_opportunities add column if not exists project_location text;
alter table public.bid_opportunities add column if not exists invitation_received_at timestamptz;
alter table public.bid_opportunities add column if not exists bid_due_at timestamptz;
alter table public.bid_opportunities add column if not exists submitted_at timestamptz;
alter table public.bid_opportunities add column if not exists decision_expected_at timestamptz;
alter table public.bid_opportunities add column if not exists stage text not null default 'Invite Received';
alter table public.bid_opportunities add column if not exists scope_types text[] not null default '{}';
alter table public.bid_opportunities add column if not exists estimated_tonnage numeric(12,2);
alter table public.bid_opportunities add column if not exists estimated_contract_value numeric(14,2);
alter table public.bid_opportunities add column if not exists submitted_price numeric(14,2);
alter table public.bid_opportunities add column if not exists awarded_value numeric(14,2);
alter table public.bid_opportunities add column if not exists estimated_margin_percent numeric(5,2);
alter table public.bid_opportunities add column if not exists expected_margin_amount numeric(14,2);
alter table public.bid_opportunities add column if not exists win_probability numeric(5,2) check (win_probability is null or win_probability between 0 and 100);
alter table public.bid_opportunities add column if not exists weighted_pipeline_value numeric(14,2);
alter table public.bid_opportunities add column if not exists fabrication_required boolean not null default true;
alter table public.bid_opportunities add column if not exists erection_required boolean not null default false;
alter table public.bid_opportunities add column if not exists prevailing_wage boolean not null default false;
alter table public.bid_opportunities add column if not exists union_requirement boolean not null default false;
alter table public.bid_opportunities add column if not exists bonding_required boolean not null default false;
alter table public.bid_opportunities add column if not exists schedule_requirements text;
alter table public.bid_opportunities add column if not exists required_completion_date date;
alter table public.bid_opportunities add column if not exists drawing_link text;
alter table public.bid_opportunities add column if not exists specification_link text;
alter table public.bid_opportunities add column if not exists addenda_count integer not null default 0 check (addenda_count >= 0);
alter table public.bid_opportunities add column if not exists latest_addendum_date date;
alter table public.bid_opportunities add column if not exists alternates_requested text;
alter table public.bid_opportunities add column if not exists competitors text;
alter table public.bid_opportunities add column if not exists go_no_go_decision text;
alter table public.bid_opportunities add column if not exists go_no_go_reason text;
alter table public.bid_opportunities add column if not exists lost_to text;
alter table public.bid_opportunities add column if not exists loss_reason text;
alter table public.bid_opportunities add column if not exists no_bid_reason text;
alter table public.bid_opportunities add column if not exists result_date date;
alter table public.bid_opportunities add column if not exists final_submitted_value numeric(14,2);
alter table public.bid_opportunities add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.bid_opportunities add column if not exists updated_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.bid_opportunities add column if not exists deleted_at timestamptz;
alter table public.bid_opportunities add constraint bids_stage_valid check (stage in ('Invite Received','Reviewing','Go/No-Go','Estimating','Waiting on Quotes','Ready for Review','Submitted','Clarification','Award Pending','Won','Lost','No Bid','Cancelled')) not valid;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  company_id uuid references public.companies(company_id) on delete cascade,
  contact_id uuid references public.contacts(contact_id) on delete set null,
  bid_id uuid references public.bid_opportunities(bid_id) on delete set null,
  activity_type public.activity_type_option not null default 'Note',
  activity_date timestamptz not null default now(),
  subject text,
  description text,
  outcome text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  title text not null,
  description text,
  company_id uuid references public.companies(company_id) on delete cascade,
  contact_id uuid references public.contacts(contact_id) on delete set null,
  bid_id uuid references public.bid_opportunities(bid_id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  due_at timestamptz,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Urgent')),
  status public.task_status_option not null default 'Open',
  completed_at timestamptz,
  snoozed_until timestamptz,
  recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  company_id uuid not null references public.companies(company_id) on delete cascade,
  portal_name text not null,
  portal_url text,
  username_owner uuid references auth.users(id) on delete set null,
  vendor_number text,
  registration_status public.registration_status_option not null default 'Not Started',
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  expiration_at timestamptz,
  renewal_due_at timestamptz,
  approved_trade_codes text,
  required_documents text,
  missing_documents text,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  company_id uuid references public.companies(company_id) on delete cascade,
  contact_id uuid references public.contacts(contact_id) on delete set null,
  bid_id uuid references public.bid_opportunities(bid_id) on delete set null,
  registration_id uuid references public.registrations(id) on delete set null,
  file_name text not null,
  file_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  storage_path text not null,
  document_category public.document_category_option not null default 'Other',
  version_label text,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  uploaded_at timestamptz not null default now(),
  archived boolean not null default false,
  notes text
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(workspace_id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  overdue_tasks boolean not null default true,
  bids_due_soon boolean not null default true,
  registration_expiration boolean not null default true,
  record_assignments boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists profiles_role_active_idx on public.profiles (role, active);
create index if not exists companies_owner_idx on public.companies (workspace_id, assigned_owner_id);
create index if not exists companies_next_action_due_idx on public.companies (workspace_id, next_action_due_at) where deleted_at is null;
create index if not exists contacts_duplicate_email_idx on public.contacts (workspace_id, lower(email)) where email is not null and deleted_at is null;
create index if not exists contacts_duplicate_phone_idx on public.contacts (workspace_id, phone) where phone is not null and deleted_at is null;
create index if not exists bid_opportunities_stage_due_idx on public.bid_opportunities (workspace_id, stage, bid_due_at);
create index if not exists activities_workspace_date_idx on public.activities (workspace_id, activity_date desc);
create index if not exists activities_company_date_idx on public.activities (company_id, activity_date desc);
create index if not exists tasks_workspace_due_idx on public.tasks (workspace_id, status, due_at);
create index if not exists tasks_assigned_due_idx on public.tasks (assigned_to, status, due_at);
create index if not exists registrations_workspace_expiration_idx on public.registrations (workspace_id, expiration_at) where deleted_at is null;
create index if not exists attachments_workspace_entity_idx on public.attachments (workspace_id, company_id, bid_id, registration_id);
create index if not exists audit_logs_workspace_created_idx on public.audit_logs (workspace_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
drop trigger if exists activities_set_updated_at on public.activities;
drop trigger if exists tasks_set_updated_at on public.tasks;
drop trigger if exists registrations_set_updated_at on public.registrations;
drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger activities_set_updated_at before update on public.activities for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger registrations_set_updated_at before update on public.registrations for each row execute function public.set_updated_at();
create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email,''),'@',1)))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists auth_users_sync_profile on auth.users;
create trigger auth_users_sync_profile after insert or update on auth.users for each row execute function public.sync_profile_from_auth_user();

create or replace function private.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  );
$$;

create or replace function private.is_any_workspace_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  );
$$;

revoke all on function private.is_workspace_admin(uuid) from public, anon;
revoke all on function private.is_any_workspace_admin() from public, anon;
grant execute on function private.is_workspace_admin(uuid) to authenticated;
grant execute on function private.is_any_workspace_admin() to authenticated;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_entity_id uuid;
  v_old jsonb;
  v_new jsonb;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
  else
    v_old := to_jsonb(old);
  end if;

  v_workspace_id := coalesce((v_new->>'workspace_id')::uuid, (v_old->>'workspace_id')::uuid);
  v_entity_id := coalesce(
    (v_new->>'id')::uuid,
    (v_new->>'contact_id')::uuid,
    (v_new->>'bid_id')::uuid,
    (v_new->>'follow_up_id')::uuid,
    (v_new->>'outreach_log_id')::uuid,
    (v_new->>'company_id')::uuid,
    (v_old->>'id')::uuid,
    (v_old->>'contact_id')::uuid,
    (v_old->>'bid_id')::uuid,
    (v_old->>'follow_up_id')::uuid,
    (v_old->>'outreach_log_id')::uuid,
    (v_old->>'company_id')::uuid
  );

  insert into public.audit_logs(workspace_id, user_id, action, entity_type, entity_id, previous_values, new_values)
  values (
    v_workspace_id,
    auth.uid(),
    tg_op,
    tg_table_name,
    v_entity_id,
    v_old,
    v_new
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['companies','contacts','bid_opportunities','follow_ups','outreach_logs','activities','tasks','registrations','attachments'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit_row_change', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t || '_audit_row_change', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.company_contact_relationships enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
alter table public.registrations enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notification_preferences enable row level security;

grant select, insert, update, delete on public.profiles, public.company_contact_relationships, public.activities, public.tasks, public.registrations, public.attachments, public.audit_logs, public.notification_preferences to authenticated;

create policy profiles_select_active_members on public.profiles for select to authenticated using (
  id = (select auth.uid()) or (select private.is_any_workspace_admin())
);
create policy profiles_update_admin_only on public.profiles for update to authenticated using ((select private.is_any_workspace_admin())) with check ((select private.is_any_workspace_admin()));

do $$ declare t text; begin
  foreach t in array array['company_contact_relationships','activities','tasks','registrations','attachments','notification_preferences'] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select private.has_workspace_role(workspace_id)))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'']::public.member_role[])))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'']::public.member_role[]))) with check ((select private.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'']::public.member_role[])))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.has_workspace_role(workspace_id,array[''owner'',''admin'']::public.member_role[])))', t || '_delete', t);
  end loop;
end $$;

create policy audit_logs_select_admin on public.audit_logs for select to authenticated using ((select private.is_workspace_admin(workspace_id)));
create policy audit_logs_insert_members on public.audit_logs for insert to authenticated with check ((select private.has_workspace_role(workspace_id)));

insert into storage.buckets (id, name, public)
values ('fablead-documents', 'fablead-documents', false)
on conflict (id) do nothing;

create policy fablead_documents_select on storage.objects for select to authenticated using (
  bucket_id = 'fablead-documents'
  and exists (
    select 1 from public.workspace_members wm
    where wm.user_id = (select auth.uid())
      and (storage.foldername(name))[1] = wm.workspace_id::text
  )
);

create policy fablead_documents_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'fablead-documents'
  and exists (
    select 1 from public.workspace_members wm
    where wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin','member')
      and (storage.foldername(name))[1] = wm.workspace_id::text
  )
);

create policy fablead_documents_update on storage.objects for update to authenticated using (
  bucket_id = 'fablead-documents'
  and exists (
    select 1 from public.workspace_members wm
    where wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin','member')
      and (storage.foldername(name))[1] = wm.workspace_id::text
  )
) with check (
  bucket_id = 'fablead-documents'
  and exists (
    select 1 from public.workspace_members wm
    where wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin','member')
      and (storage.foldername(name))[1] = wm.workspace_id::text
  )
);

create policy fablead_documents_delete on storage.objects for delete to authenticated using (
  bucket_id = 'fablead-documents'
  and exists (
    select 1 from public.workspace_members wm
    where wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
      and (storage.foldername(name))[1] = wm.workspace_id::text
  )
);
