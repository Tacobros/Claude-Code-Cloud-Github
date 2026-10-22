-- Ciclo de vida de la suscripción:
-- * plan_paid_until: hasta cuándo está pagado el plan. NULL = plan manual
--   (betas, demo) que nunca vence. Cada cobro exitoso lo extiende 35 días
--   (margen para los reintentos de Recurrente).
-- * expire_overdue_plans(): baja a Free las tiendas con el período vencido;
--   corre a diario vía pg_cron.
alter table stores add column if not exists plan_paid_until timestamptz;
grant select (plan_paid_until) on stores to authenticated;

create or replace function expire_overdue_plans() returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  -- El trigger protect_store_fields exige claims de service_role
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  update stores set plan = 'free'
   where plan <> 'free'
     and plan_paid_until is not null
     and plan_paid_until < now();
  get diagnostics v_count = row_count;
  return v_count;
end; $$;
revoke execute on function expire_overdue_plans() from anon, authenticated, public;

create extension if not exists pg_cron;
select cron.schedule('expire-plans-daily', '17 6 * * *', $$select expire_overdue_plans()$$);
