-- Inventario opcional por producto (null = sin control de stock)
alter table products add column if not exists stock integer;
do $$ begin
  alter table products add constraint products_stock_nonneg check (stock is null or stock >= 0);
exception when duplicate_object then null; end $$;

-- Estado de los pedidos: el dueño confirma (descuenta inventario) o descarta
alter table orders add column if not exists status text not null default 'pending';
do $$ begin
  alter table orders add constraint orders_status_valid check (status in ('pending','confirmed','dismissed'));
exception when duplicate_object then null; end $$;

-- El dueño puede actualizar el estado de sus pedidos
drop policy if exists "orders: owner update" on orders;
create policy "orders: owner update"
  on orders for update
  using (store_id in (select id from stores where user_id = auth.uid()))
  with check (store_id in (select id from stores where user_id = auth.uid()));
