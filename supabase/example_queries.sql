-- Replace :workspace_id and other named values in your SQL client.

-- 1. Companies in a selected state
select * from public.companies where workspace_id=:workspace_id and state=:state order by company_name;

-- 2. Companies within 100 miles (uses stored distance; geocoding can be added later)
select * from public.companies where workspace_id=:workspace_id and distance_from_base_miles <= 100 order by distance_from_base_miles;

-- 3. Companies with overdue follow-ups
select distinct c.*, min(f.due_date) over (partition by c.company_id) oldest_due_date
from public.companies c join public.follow_ups f using (company_id)
where c.workspace_id=:workspace_id and f.status='Open' and f.due_date < current_date order by oldest_due_date;

-- 4. Companies with no outreach yet
select c.* from public.companies c where c.workspace_id=:workspace_id
and not exists (select 1 from public.outreach_activities o where o.company_id=c.company_id) order by c.created_at desc;

-- 5. Top 25 leads
select * from public.companies where workspace_id=:workspace_id order by lead_score desc, company_name limit 25;

-- 6. Open bids due in the next 7 days
select b.*,c.company_name from public.bid_opportunities b join public.companies c using(company_id)
where b.workspace_id=:workspace_id and b.bid_status in ('Open','Submitted') and b.bid_due_date between current_date and current_date+7 order by b.bid_due_date;

-- 7. Decision makers
select ct.*,c.company_name from public.contacts ct join public.companies c using(company_id)
where ct.workspace_id=:workspace_id and ct.decision_maker order by c.company_name,ct.last_name;

-- 8. Companies by specialization (case-insensitive partial match)
select * from public.companies where workspace_id=:workspace_id and specialization ilike '%'||:specialization||'%' order by lead_score desc;

-- 9. Win/loss rate by project type
select * from public.bid_win_rates where workspace_id=:workspace_id order by project_type;

-- 10. Leads imported from a specific source
select * from public.companies where workspace_id=:workspace_id and source=:source order by created_at desc;

-- Additional dashboard breakdowns
select state,count(*) company_count from public.companies where workspace_id=:workspace_id group by state order by company_count desc;
select specialization,count(*) company_count from public.companies where workspace_id=:workspace_id group by specialization order by company_count desc;
select * from public.dashboard_metrics where workspace_id=:workspace_id;
