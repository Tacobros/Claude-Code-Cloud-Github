-- Métodos de pago aceptados por tienda (opcional) y método elegido por pedido
alter table stores add column if not exists payment_methods text[] default '{}';
grant select (payment_methods) on stores to anon, authenticated;
alter table orders add column if not exists payment_method text;

-- El comprobante público incluye el método de pago
create or replace function get_order_public(p_token text)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'order', jsonb_build_object('id', o.id, 'items', o.items, 'total', o.total,
      'currency', o.currency, 'created_at', o.created_at, 'status', o.status,
      'payment_method', o.payment_method),
    'store', jsonb_build_object('name', s.name, 'slug', s.slug,
      'accent_color', s.accent_color, 'logo_url', s.logo_url, 'whatsapp', s.whatsapp)
  )
  from orders o join stores s on s.id = o.store_id
  where o.token = p_token and length(p_token) >= 20
  limit 1;
$$;
grant execute on function get_order_public(text) to anon, authenticated;
