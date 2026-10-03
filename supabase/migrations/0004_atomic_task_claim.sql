-- Atomic task claiming: one completion and one reward per user/task.
create or replace function public.claim_task(p_user_id uuid, p_task_id text)
returns table(task_id text, reward bigint, nova bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward bigint;
  v_nova bigint;
begin
  select t.reward into v_reward
  from public.tasks t
  where t.id = p_task_id and t.active = true
  for update;

  if v_reward is null then
    raise exception 'TASK_NOT_FOUND';
  end if;

  insert into public.tasks_completed(user_id, task_id)
  values (p_user_id, p_task_id)
  on conflict (user_id, task_id) do nothing;

  if not found then
    raise exception 'TASK_ALREADY_CLAIMED';
  end if;

  update public.users
  set nova = nova + v_reward
  where id = p_user_id
  returning nova into v_nova;

  if v_nova is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  return query select p_task_id, v_reward, v_nova;
end;
$$;

revoke all on function public.claim_task(uuid, text) from public;
grant execute on function public.claim_task(uuid, text) to service_role;
