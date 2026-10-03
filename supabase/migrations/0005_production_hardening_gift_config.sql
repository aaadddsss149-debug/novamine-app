-- Production hardening: persistent welcome-gift state and required app config.
alter table public.users
  add column if not exists gift_claimed boolean not null default true;

insert into public.app_config(key,value)
values
  ('ads_enabled','false'::jsonb),
  ('ad_triggers','{"start_mining":true,"collect_mining":true,"spin_slot":false,"dice_roll":false}'::jsonb),
  ('adsgram_block_id','""'::jsonb),
  ('welcome_ton','1.5'::jsonb),
  ('referral_ton','0.05'::jsonb),
  ('min_withdraw_ton','2'::jsonb)
on conflict (key) do nothing;
