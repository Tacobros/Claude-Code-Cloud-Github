-- Datos del cliente final por pedido: nombre, teléfono y dirección de entrega
alter table orders add column if not exists customer_name text;
alter table orders add column if not exists customer_phone text;
alter table orders add column if not exists customer_address text;

-- Límite de tamaño: el insert es público, esto evita abusos
do $$ begin
  alter table orders add constraint orders_customer_len check (
    coalesce(length(customer_name), 0) <= 120 and
    coalesce(length(customer_phone), 0) <= 30 and
    coalesce(length(customer_address), 0) <= 300
  );
exception when duplicate_object then null; end $$;

-- El comprobante público incluye los datos de entrega
create or replace function get_order_public(p_token text)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'order', jsonb_build_object('id', o.id, 'items', o.items, 'total', o.total,
      'currency', o.currency, 'created_at', o.created_at, 'status', o.status,
      'payment_method', o.payment_method,
      'customer_name', o.customer_name, 'customer_phone', o.customer_phone,
      'customer_address', o.customer_address),
    'store', jsonb_build_object('name', s.name, 'slug', s.slug,
      'accent_color', s.accent_color, 'logo_url', s.logo_url, 'whatsapp', s.whatsapp)
  )
  from orders o join stores s on s.id = o.store_id
  where o.token = p_token and length(p_token) >= 20
  limit 1;
$$;
grant execute on function get_order_public(text) to anon, authenticated;
