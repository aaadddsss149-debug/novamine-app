-- EarnX: remove legacy games after the product switched to missions, referrals and verified rewards.
drop table if exists public.slot_spins cascade;
drop table if exists public.dice_rolls cascade;
