-- NovaMine production hardening: config + task wall
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  label text not null,
  reward bigint not null default 0 check (reward >= 0),
  action text not null default 'Open',
  url text,
  category text not null default 'TG TASKS',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_active_category_idx on public.tasks(active, category);

alter table public.app_config enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "tasks_public_read" on public.tasks;
create policy "tasks_public_read" on public.tasks for select using (active = true);

-- app_config is intentionally server-managed; clients never read it directly.
revoke all on table public.app_config from anon, authenticated;

-- Production defaults. Replace the AdsGram block id from the admin panel once created.
insert into public.app_config(key,value)
values
  ('ads_enabled','false'::jsonb),
  ('ad_triggers','{"start_mining":true,"collect_mining":true,"spin_slot":false,"dice_roll":false}'::jsonb),
  ('adsgram_block_id','""'::jsonb),
  ('welcome_ton','1.5'::jsonb),
  ('referral_ton','0.05'::jsonb),
  ('min_withdraw_ton','2'::jsonb)
on conflict (key) do nothing;

insert into public.tasks(id,label,reward,action,url,category,active)
values
  ('tg_join_channel','Join Telegram Channel',500,'Open',null,'TG TASKS',true),
  ('tg_follow_news','Follow NovaMine News',750,'Open',null,'TG TASKS',true),
  ('tg_open_bot','Open NovaMine Bot',1000,'Open',null,'TG TASKS',true)
on conflict (id) do nothing;

-- Keep updated_at fresh when config/tasks are edited.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_config_touch_updated_at on public.app_config;
create trigger app_config_touch_updated_at before update on public.app_config
for each row execute function public.touch_updated_at();

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at before update on public.tasks
for each row execute function public.touch_updated_at();
