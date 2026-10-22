-- Configuración por tienda de los datos que se piden al cliente final.
-- Cada campo (name, phone, address) puede ser: required | optional | off.
alter table stores add column if not exists customer_fields jsonb
  default '{"name":"required","phone":"optional","address":"optional"}'::jsonb;
grant select (customer_fields) on stores to anon, authenticated;
