-- Bid reporting upgrades: richer bid history fields and Canceled status.

alter type public.bid_status add value if not exists 'Canceled';

alter table public.bid_opportunities add column if not exists final_submitted_value numeric;
alter table public.bid_opportunities add column if not exists result_date date;

create index if not exists bid_opportunities_workspace_due_idx on public.bid_opportunities (workspace_id, bid_due_date) where deleted_at is null;
create index if not exists bid_opportunities_workspace_submitted_idx on public.bid_opportunities (workspace_id, submitted_date) where deleted_at is null;
create index if not exists bid_opportunities_workspace_result_date_idx on public.bid_opportunities (workspace_id, result_date) where deleted_at is null;
create index if not exists bid_opportunities_workspace_status_idx on public.bid_opportunities (workspace_id, bid_status) where deleted_at is null;
