-- Bitácora de eventos de pago (Recurrente) y lookup de usuario por email
-- para que el webhook aplique upgrades de plan.
create table if not exists payment_events (
  id bigserial primary key,
  provider text not null default 'recurrente',
  event_type text,
  email text,
  plan text,
  result text,
  payload jsonb,
  created_at timestamptz default now()
);
-- RLS sin políticas: solo el service_role (Edge Functions) lee y escribe
alter table payment_events enable row level security;

create or replace function get_user_id_by_email(p_email text) returns uuid
language sql security definer set search_path = public, auth stable as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke execute on function get_user_id_by_email(text) from anon, authenticated, public;
