-- FabLead Tracker internal CRM upgrade
-- Adds shop profile, user profiles, documents/templates, outreach workflow,
-- richer statuses, workspace bootstrap, and owner reporting.

do $$ begin
  create type public.document_template_type as enum ('Capability Statement','Intro Email','Bid List Request','Other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.outreach_log_type as enum ('Call','Email','Meeting','Portal Registration','Note');
exception when duplicate_object then null;
end $$;

alter type public.lead_status add value if not exists 'Registered';
alter type public.lead_status add value if not exists 'Bid Invite Received';
alter type public.lead_status add value if not exists 'Not Fit';

alter type public.bid_status add value if not exists 'Found';
alter type public.bid_status add value if not exists 'Reviewing';
alter type public.bid_status add value if not exists 'Bidding';
alter type public.bid_status add value if not exists 'No-Bid';

create table if not exists public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  default_workspace_id uuid references public.workspaces(workspace_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_profile (
  shop_profile_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade unique,
  shop_name text not null default 'Shawnee Steel & Welding',
  service_radius text not null default '100 miles',
  target_cities_states text,
  trade_scopes text[] not null default array['structural steel','miscellaneous metals','stairs','rails','welding','fabrication','field installation'],
  ideal_project_types text,
  minimum_project_size numeric(14,2),
  maximum_project_size numeric(14,2),
  insurance_certification_notes text,
  primary_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (minimum_project_size is null or minimum_project_size >= 0),
  check (maximum_project_size is null or maximum_project_size >= 0),
  check (minimum_project_size is null or maximum_project_size is null or maximum_project_size >= minimum_project_size)
);

create table if not exists public.documents_templates (
  document_template_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  template_type public.document_template_type not null default 'Other',
  template_name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outreach_logs (
  outreach_log_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(workspace_id) on delete cascade,
  company_id uuid not null references public.companies(company_id) on delete cascade,
  contact_id uuid references public.contacts(contact_id) on delete set null,
  outreach_type public.outreach_log_type not null,
  outreach_date timestamptz not null default now(),
  result text,
  notes text,
  next_follow_up_date date,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.companies add column if not exists estimating_email text;
alter table public.companies add column if not exists next_action text;
alter table public.companies add column if not exists last_contacted_date date;
alter table public.bid_opportunities add column if not exists source_link text;
alter table public.bid_opportunities add column if not exists scope text;

create unique index if not exists users_email_idx on public.users (lower(email));
create index if not exists shop_profile_workspace_idx on public.shop_profile (workspace_id);
create index if not exists documents_templates_workspace_idx on public.documents_templates (workspace_id, template_type);
create index if not exists outreach_logs_workspace_date_idx on public.outreach_logs (workspace_id, outreach_date desc);
create index if not exists outreach_logs_company_idx on public.outreach_logs (company_id, outreach_date desc);

drop trigger if exists users_set_updated_at on public.users;
drop trigger if exists shop_profile_set_updated_at on public.shop_profile;
drop trigger if exists documents_templates_set_updated_at on public.documents_templates;
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger shop_profile_set_updated_at before update on public.shop_profile for each row execute function public.set_updated_at();
create trigger documents_templates_set_updated_at before update on public.documents_templates for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.shop_profile enable row level security;
alter table public.documents_templates enable row level security;
alter table public.outreach_logs enable row level security;

grant select, insert, update, delete on public.users, public.shop_profile, public.documents_templates, public.outreach_logs to authenticated;

create policy users_select_self on public.users for select to authenticated using (user_id = (select auth.uid()));
create policy users_insert_self on public.users for insert to authenticated with check (user_id = (select auth.uid()));
create policy users_update_self on public.users for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy shop_profile_select on public.shop_profile for select to authenticated using ((select private.has_workspace_role(workspace_id)));
create policy shop_profile_insert on public.shop_profile for insert to authenticated with check ((select private.has_workspace_role(workspace_id,array['owner','admin','member']::public.member_role[])));
create policy shop_profile_update on public.shop_profile for update to authenticated using ((select private.has_workspace_role(workspace_id,array['owner','admin','member']::public.member_role[]))) with check ((select private.has_workspace_role(workspace_id,array['owner','admin','member']::public.member_role[])));
create policy shop_profile_delete on public.shop_profile for delete to authenticated using ((select private.has_workspace_role(workspace_id,array['owner','admin']::public.member_role[])));

create policy documents_templates_select on public.documents_templates for select to authenticated using ((select private.has_workspace_role(workspace_id)));
create policy documents_templates_insert on public.documents_templates for insert to authenticated with check ((select private.has_workspace_role(workspace_id,array['owner','admin','member']::public.member_role[])));
create policy documents_templates_update on public.documents_templates for update to authenticated using ((select private.has_workspace_role(workspace_id,array['owner','admin','member']::public.member_role[]))) with check ((select private.has_workspace_role(workspace_id,array['owner','admin','member']::public.member_role[])));
create policy documents_templates_delete on public.documents_templates for delete to authenticated using ((select private.has_workspace_role(workspace_id,array['owner','admin']::public.member_role[])));

create policy outreach_logs_select on public.outreach_logs for select to authenticated using ((select private.has_workspace_role(workspace_id)));
create policy outreach_logs_insert on public.outreach_logs for insert to authenticated with check ((select private.has_workspace_role(workspace_id,array['owner','admin','member']::public.member_role[])));
create policy outreach_logs_update on public.outreach_logs for update to authenticated using ((select private.has_workspace_role(workspace_id,array['owner','admin','member']::public.member_role[]))) with check ((select private.has_workspace_role(workspace_id,array['owner','admin','member']::public.member_role[])));
create policy outreach_logs_delete on public.outreach_logs for delete to authenticated using ((select private.has_workspace_role(workspace_id,array['owner','admin']::public.member_role[])));

create or replace function public.bootstrap_shawnee_workspace()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_workspace_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  insert into public.users(user_id, email, full_name)
  values (v_user_id, v_email, split_part(coalesce(v_email,''),'@',1))
  on conflict (user_id) do update set email = excluded.email
  returning default_workspace_id into v_workspace_id;

  select wm.workspace_id into v_workspace_id
  from public.workspace_members wm
  where wm.user_id = v_user_id
  order by wm.created_at
  limit 1;

  if v_workspace_id is null then
    insert into public.workspaces(workspace_name, company_name, default_state, scoring_preferences)
    values ('Shawnee Steel & Welding', 'Shawnee Steel & Welding', 'KS',
      '{"distance":20,"buyer_type":15,"project_market":15,"bid_list_path":15,"contact_info":12,"shop_fit":13,"source_quality":10}'::jsonb)
    returning workspace_id into v_workspace_id;

    insert into public.workspace_members(workspace_id, user_id, role)
    values (v_workspace_id, v_user_id, 'owner');

    insert into public.shop_profile(workspace_id, shop_name, service_radius, target_cities_states, ideal_project_types, minimum_project_size, maximum_project_size, insurance_certification_notes, primary_contact)
    values (
      v_workspace_id,
      'Shawnee Steel & Welding',
      '100 miles',
      'Kansas City Metro, Shawnee KS, Overland Park KS, Olathe KS, Kansas City MO, Independence MO, Lee''s Summit MO',
      'Commercial buildings, public works, schools, industrial repairs, stairs, rails, structural steel, miscellaneous metals',
      5000,
      250000,
      'Add insurance, W-9, safety, bonding, certifications, and welding procedure notes here.',
      coalesce(v_email, 'Owner')
    );
  end if;

  update public.users set default_workspace_id = v_workspace_id where user_id = v_user_id;
  return v_workspace_id;
end;
$$;

revoke all on function public.bootstrap_shawnee_workspace() from public, anon;
grant execute on function public.bootstrap_shawnee_workspace() to authenticated;

create or replace function public.create_follow_up_from_outreach_log()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.next_follow_up_date is not null then
    insert into public.follow_ups(workspace_id, company_id, contact_id, due_date, priority, task_type, description)
    values (new.workspace_id, new.company_id, new.contact_id, new.next_follow_up_date, 'Medium', 'Outreach', coalesce(new.result, 'Follow up from outreach'));
  end if;
  return new;
end;
$$;

drop trigger if exists outreach_logs_create_follow_up on public.outreach_logs;
create trigger outreach_logs_create_follow_up after insert on public.outreach_logs for each row execute function public.create_follow_up_from_outreach_log();

create or replace view public.weekly_owner_report with (security_invoker = true) as
select w.workspace_id,
  count(distinct c.company_id) filter (where c.created_at >= date_trunc('week', now())) as buyers_added_this_week,
  count(distinct ol.outreach_log_id) filter (where ol.outreach_date >= date_trunc('week', now())) as outreach_completed,
  count(distinct f.follow_up_id) filter (where f.status = 'Open' and f.due_date < current_date) as follow_ups_overdue,
  count(distinct ol.outreach_log_id) filter (where ol.outreach_type = 'Portal Registration' and ol.outreach_date >= date_trunc('week', now())) as portals_registered,
  count(distinct b.bid_id) filter (where b.created_at >= date_trunc('week', now())) as bid_opportunities_found,
  count(distinct c.company_id) filter (where c.lead_status::text = 'Bid Invite Received') as bid_invites_received,
  count(distinct b.bid_id) filter (where b.bid_status = 'Submitted' and b.submitted_date >= date_trunc('week', now())::date) as bids_submitted,
  count(distinct b.bid_id) filter (where b.bid_status = 'Won') as won_bids,
  count(distinct b.bid_id) filter (where b.bid_status = 'Lost') as lost_bids,
  count(distinct b.bid_id) filter (where b.bid_status::text in ('No Bid','No-Bid')) as no_bid_results
from public.workspaces w
left join public.companies c on c.workspace_id = w.workspace_id
left join public.outreach_logs ol on ol.workspace_id = w.workspace_id
left join public.follow_ups f on f.workspace_id = w.workspace_id
left join public.bid_opportunities b on b.workspace_id = w.workspace_id
group by w.workspace_id;

grant select on public.weekly_owner_report to authenticated;
