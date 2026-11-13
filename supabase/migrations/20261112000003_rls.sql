-- Albertito Calzados · Row Level Security
-- Regla general: lectura pública solo de lo activo/vigente; escritura solo admin.
-- El back office externo usa la service key, que saltea RLS.

alter table categories enable row level security;
alter table products enable row level security;
alter table product_categories enable row level security;
alter table product_colors enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table search_synonyms enable row level security;
alter table payment_promos enable row level security;
alter table topbar_messages enable row level security;
alter table home_banners enable row level security;
alter table home_videos enable row level security;
alter table settings enable row level security;
alter table profiles enable row level security;
alter table addresses enable row level security;
alter table favorites enable row level security;
alter table carts enable row level security;
alter table newsletter_subscribers enable row level security;
alter table coupons enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table order_events enable row level security;
alter table shipping_quotes_cache enable row level security;
alter table shipping_fallback_rates enable row level security;

-- ---------------------------------------------------------------------------
-- Catálogo y contenido público
-- ---------------------------------------------------------------------------
create policy "public read active" on categories for select using (active or is_admin());
create policy "public read active" on products for select using (active or is_admin());
create policy "public read" on product_categories for select using (
  exists (select 1 from products p where p.id = product_id and (p.active or is_admin())));
create policy "public read" on product_colors for select using (
  exists (select 1 from products p where p.id = product_id and (p.active or is_admin())));
create policy "public read" on product_images for select using (
  exists (select 1 from products p where p.id = product_id and (p.active or is_admin())));
create policy "public read" on product_variants for select using (
  (active and exists (select 1 from products p where p.id = product_id and p.active)) or is_admin());
create policy "public read" on search_synonyms for select using (true);

create policy "public read current" on payment_promos for select using (
  (active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or is_admin());
create policy "public read active" on topbar_messages for select using (active or is_admin());
create policy "public read current" on home_banners for select using (
  (active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or is_admin());
create policy "public read active" on home_videos for select using (active or is_admin());
create policy "public read public keys" on settings for select using (is_public or is_admin());

-- Escritura admin en todas las tablas de catálogo/contenido
do $$
declare t text;
begin
  foreach t in array array[
    'categories','products','product_categories','product_colors','product_images','product_variants',
    'search_synonyms','payment_promos','topbar_messages','home_banners','home_videos','settings',
    'coupons','shipping_fallback_rates'
  ] loop
    execute format('create policy "admin insert" on %I for insert with check (is_admin())', t);
    execute format('create policy "admin update" on %I for update using (is_admin()) with check (is_admin())', t);
    execute format('create policy "admin delete" on %I for delete using (is_admin())', t);
  end loop;
end $$;

create policy "admin read" on coupons for select using (is_admin());
create policy "admin read" on shipping_fallback_rates for select using (is_admin());

-- ---------------------------------------------------------------------------
-- Datos del cliente
-- ---------------------------------------------------------------------------
create policy "own or admin read" on profiles for select using (id = auth.uid() or is_admin());
create policy "own update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admin update" on profiles for update using (is_admin()) with check (is_admin());

-- El cliente edita sus datos pero no puede cambiarse el rol (solo admin o service role)
create or replace function profiles_protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role'
     and not is_admin() then
    raise exception 'ROLE_CHANGE_NOT_ALLOWED';
  end if;
  return new;
end $$;

create trigger profiles_protect_role_trg before update on profiles
  for each row execute function profiles_protect_role();

create policy "own all" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin read" on addresses for select using (is_admin());

create policy "own all" on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own all" on carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Newsletter: cualquiera se suscribe, solo admin lee/borra
create policy "public subscribe" on newsletter_subscribers for insert with check (true);
create policy "admin read" on newsletter_subscribers for select using (is_admin());
create policy "admin delete" on newsletter_subscribers for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- Pedidos: se crean y actualizan solo desde el servidor (service role / RPC)
-- ---------------------------------------------------------------------------
create policy "own or admin read" on orders for select using (user_id = auth.uid() or is_admin());
create policy "admin update" on orders for update using (is_admin()) with check (is_admin());
create policy "own or admin read" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "own or admin read" on order_events for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "admin read" on payments for select using (is_admin());

-- shipping_quotes_cache: sin policies → solo service role.

-- ---------------------------------------------------------------------------
-- Storage: bucket público "media" (fotos, videos, banners); escribe solo admin
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do nothing;

create policy "media public read" on storage.objects for select using (bucket_id = 'media');
create policy "media admin insert" on storage.objects for insert with check (bucket_id = 'media' and is_admin());
create policy "media admin update" on storage.objects for update using (bucket_id = 'media' and is_admin());
create policy "media admin delete" on storage.objects for delete using (bucket_id = 'media' and is_admin());
