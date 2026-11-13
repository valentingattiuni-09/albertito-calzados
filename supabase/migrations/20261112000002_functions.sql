-- Albertito Calzados · funciones, búsqueda y vistas

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- unaccent no es IMMUTABLE; este wrapper permite usarlo en índices y triggers.
create or replace function f_unaccent(text) returns text
language sql immutable parallel safe strict
set search_path = public, extensions as $$
  select unaccent('unaccent'::regdictionary, $1)
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

-- Precio vigente: precio de oferta si está activa y dentro de fechas; si no, precio base.
create or replace function sale_is_active(p products) returns boolean
language sql stable as $$
  select p.is_offer
     and p.sale_price is not null
     and p.sale_price < p.base_price
     and (p.sale_starts_at is null or p.sale_starts_at <= now())
     and (p.sale_ends_at is null or p.sale_ends_at > now())
$$;

create or replace function effective_price(p products) returns integer
language sql stable as $$
  select case when sale_is_active(p) then p.sale_price else p.base_price end
$$;

-- ---------------------------------------------------------------------------
-- Búsqueda: search_vector se recalcula al cambiar el producto o sus categorías
-- ---------------------------------------------------------------------------
create or replace function products_refresh_search(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  cats text;
begin
  select coalesce(string_agg(c.name, ' '), '') into cats
  from product_categories pc join categories c on c.id = pc.category_id
  where pc.product_id = p_id;

  update products p set
    search_text = lower(f_unaccent(p.name || ' ' || cats)),
    search_vector =
      setweight(to_tsvector('spanish', f_unaccent(coalesce(p.name, ''))), 'A') ||
      setweight(to_tsvector('spanish', f_unaccent(cats)), 'B') ||
      setweight(to_tsvector('spanish', f_unaccent(coalesce(p.description, ''))), 'C')
  where p.id = p_id;
end $$;

create or replace function products_search_trigger() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT'
     or new.name is distinct from old.name
     or new.description is distinct from old.description then
    perform products_refresh_search(new.id);
  end if;
  return null;
end $$;

create trigger products_search_after
  after insert or update of name, description on products
  for each row execute function products_search_trigger();

create or replace function product_categories_search_trigger() returns trigger
language plpgsql as $$
begin
  perform products_refresh_search(coalesce(new.product_id, old.product_id));
  return null;
end $$;

create trigger product_categories_search_after
  after insert or delete on product_categories
  for each row execute function product_categories_search_trigger();

create index products_search_text_trgm_idx on products using gin (search_text gin_trgm_ops);

-- Devuelve ids de productos activos que coinciden, ordenados por relevancia.
-- Expande sinónimos (zapas → zapatilla), usa prefijos para autocompletar y trigramas para errores de tipeo.
create or replace function search_products(q text, max_results int default 48)
returns table (product_id uuid, rank real)
language plpgsql stable set search_path = public as $$
declare
  norm text := lower(f_unaccent(trim(coalesce(q, ''))));
  tsq tsquery;
  qtext text;
begin
  if length(norm) < 2 then
    return;
  end if;

  select string_agg(grp, ' & ') into qtext
  from (
    select '(' || string_agg(quote_literal(term) || ':*', ' | ') || ')' as grp
    from (
      select tok, tok as term from regexp_split_to_table(norm, '[^a-z0-9ñ]+') tok where tok <> ''
      union
      select tok, lower(f_unaccent(e))
      from regexp_split_to_table(norm, '[^a-z0-9ñ]+') tok
      join search_synonyms s on lower(f_unaccent(s.term)) = tok
      cross join unnest(s.expands_to) e
      where tok <> ''
    ) terms
    group by tok
  ) groups;

  begin
    tsq := to_tsquery('spanish', qtext);
  exception when others then
    tsq := plainto_tsquery('spanish', norm);
  end;

  return query
  select p.id,
         (ts_rank(p.search_vector, tsq) + word_similarity(norm, p.search_text))::real as r
  from products p
  where p.active
    and (p.search_vector @@ tsq or word_similarity(norm, p.search_text) > 0.45)
  order by r desc, p.sold_count desc
  limit max_results;
end $$;

-- ---------------------------------------------------------------------------
-- Vista para tarjetas y listados (respeta RLS de las tablas base)
-- ---------------------------------------------------------------------------
create or replace view v_product_cards with (security_invoker = true) as
select
  p.id,
  p.name,
  p.slug,
  p.line,
  p.base_price,
  effective_price(p) as price,
  case when sale_is_active(p)
       then round(100.0 * (p.base_price - p.sale_price) / nullif(p.base_price, 0))::int
       else 0 end as discount_pct,
  sale_is_active(p) as on_sale,
  p.is_offer,
  p.is_new,
  p.is_featured,
  p.sold_count,
  p.created_at,
  coalesce((
    select jsonb_agg(i.url order by i."order")
    from (
      select pi.url, pi."order" from product_images pi
      where pi.product_id = p.id and pi.type = 'image'
      order by (pi.color_id is not null and pi.color_id <> (
        select pc.id from product_colors pc where pc.product_id = p.id order by pc."order" limit 1
      )), pi."order"
      limit 2
    ) i
  ), '[]'::jsonb) as images,
  coalesce((
    select jsonb_agg(jsonb_build_object('name', c.color_name, 'slug', c.slug, 'hex', c.hex) order by c."order")
    from product_colors c where c.product_id = p.id
  ), '[]'::jsonb) as colors,
  coalesce((
    select array_agg(distinct v.size) from product_variants v
    where v.product_id = p.id and v.active and v.stock > 0
  ), '{}') as sizes_in_stock,
  coalesce((
    select array_agg(distinct c.hex) from product_colors c
    join product_variants v on v.color_id = c.id and v.stock > 0 and v.active
    where c.product_id = p.id
  ), '{}') as colors_in_stock,
  coalesce((
    select array_agg(pc.category_id) from product_categories pc where pc.product_id = p.id
  ), '{}') as category_ids
from products p
where p.active;

-- ---------------------------------------------------------------------------
-- Pedidos: crear (valida stock y precios desde la base) y confirmar pago
-- ---------------------------------------------------------------------------
-- p_customer: {email, first_name, last_name, dni, phone}
-- p_items:    [{variant_id, qty}]
-- p_shipping: {method, provider, service, cost, eta_days, address, branch, postal_code}
create or replace function place_order(
  p_customer jsonb,
  p_items jsonb,
  p_shipping jsonb,
  p_coupon text default null,
  p_user_id uuid default null
) returns table (order_id uuid, order_number text, order_total integer, order_access_token text)
language plpgsql security definer set search_path = public as $$
declare
  v_order orders;
  v_item jsonb;
  v_variant record;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_coupon coupons;
  v_shipping_cost integer := coalesce((p_shipping->>'cost')::int, 0);
begin
  if jsonb_array_length(coalesce(p_items, '[]')) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- Validar stock con bloqueo de filas
  for v_item in select * from jsonb_array_elements(p_items) loop
    select v.*, effective_price(p) as unit_price, p.active as product_active
      into v_variant
      from product_variants v join products p on p.id = v.product_id
      where v.id = (v_item->>'variant_id')::uuid
      for update of v;
    if not found or not v_variant.active or not v_variant.product_active then
      raise exception 'VARIANT_UNAVAILABLE:%', v_item->>'variant_id';
    end if;
    if v_variant.stock < (v_item->>'qty')::int then
      raise exception 'OUT_OF_STOCK:%', v_item->>'variant_id';
    end if;
    v_subtotal := v_subtotal + v_variant.unit_price * (v_item->>'qty')::int;
  end loop;

  if p_coupon is not null and p_coupon <> '' then
    select * into v_coupon from coupons
      where upper(code) = upper(p_coupon) and active
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at > now())
        and (max_uses is null or used_count < max_uses)
        and min_amount <= v_subtotal;
    if not found then
      raise exception 'INVALID_COUPON';
    end if;
    v_discount := case when v_coupon.type = 'percent'
                       then round(v_subtotal * v_coupon.value / 100.0)::int
                       else least(v_coupon.value, v_subtotal) end;
  end if;

  insert into orders (
    user_id, email, first_name, last_name, dni, phone,
    shipping_method, shipping_provider, shipping_service, shipping_cost, shipping_eta_days,
    shipping_address, shipping_branch, postal_code,
    subtotal, discount, total, coupon_code
  ) values (
    p_user_id, p_customer->>'email', p_customer->>'first_name', p_customer->>'last_name',
    p_customer->>'dni', p_customer->>'phone',
    (p_shipping->>'method')::shipping_method, p_shipping->>'provider', p_shipping->>'service',
    v_shipping_cost, (p_shipping->>'eta_days')::int,
    p_shipping->'address', p_shipping->'branch', p_shipping->>'postal_code',
    v_subtotal, v_discount, v_subtotal - v_discount + v_shipping_cost, v_coupon.code
  ) returning * into v_order;

  insert into order_items (order_id, product_id, variant_id, product_name, color_name, size, sku, image_url, unit_price, qty)
  select v_order.id, p.id, v.id, p.name, c.color_name, v.size, v.sku,
         (select pi.url from product_images pi
           where pi.product_id = p.id and (pi.color_id = v.color_id or pi.color_id is null) and pi.type = 'image'
           order by pi."order" limit 1),
         effective_price(p), (i->>'qty')::int
  from jsonb_array_elements(p_items) i
  join product_variants v on v.id = (i->>'variant_id')::uuid
  join products p on p.id = v.product_id
  left join product_colors c on c.id = v.color_id;

  insert into order_events (order_id, type, data) values (v_order.id, 'created', '{}');

  return query select v_order.id, v_order.number, v_order.total, v_order.access_token;
end $$;

-- Registra el resultado de un intento de pago. Si se aprueba: descuenta stock,
-- suma sold_count, marca el cupón como usado y pasa el pedido a "pagado".
create or replace function confirm_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_status payment_status,
  p_amount integer,
  p_installments int default 1,
  p_interest_free boolean default false,
  p_card_brand text default null,
  p_raw jsonb default null
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_order orders;
  v_short boolean := false;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  insert into payments (order_id, provider, provider_payment_id, card_brand, installments, interest_free, amount, status, raw)
  values (p_order_id, p_provider, p_provider_payment_id, p_card_brand, p_installments, p_interest_free, p_amount, p_status, p_raw)
  on conflict (provider, provider_payment_id) where provider_payment_id is not null
  do update set status = excluded.status, raw = excluded.raw;

  -- Idempotente: si ya estaba aprobado no se descuenta dos veces
  if v_order.payment_status = 'aprobado' then
    return v_order;
  end if;

  if p_status = 'aprobado' then
    select exists (
      select 1 from order_items oi join product_variants v on v.id = oi.variant_id
      where oi.order_id = p_order_id and v.stock < oi.qty
    ) into v_short;

    update product_variants v set stock = greatest(v.stock - oi.qty, 0)
      from order_items oi where oi.order_id = p_order_id and oi.variant_id = v.id;

    update products p set sold_count = p.sold_count + s.qty
      from (select product_id, sum(qty)::int qty from order_items where order_id = p_order_id group by product_id) s
      where p.id = s.product_id;

    if v_order.coupon_code is not null then
      update coupons set used_count = used_count + 1 where code = v_order.coupon_code;
    end if;

    update orders set payment_status = 'aprobado', status = 'pagado' where id = p_order_id returning * into v_order;
    insert into order_events (order_id, type, data)
      values (p_order_id, 'payment_approved', jsonb_build_object('provider', p_provider, 'stock_conflict', v_short));
  else
    update orders set payment_status = p_status where id = p_order_id returning * into v_order;
    insert into order_events (order_id, type, data)
      values (p_order_id, 'payment_' || p_status::text, jsonb_build_object('provider', p_provider));
  end if;

  return v_order;
end $$;

revoke execute on function place_order(jsonb, jsonb, jsonb, text, uuid) from public, anon, authenticated;
revoke execute on function confirm_payment(uuid, text, text, payment_status, integer, int, boolean, text, jsonb) from public, anon, authenticated;
revoke execute on function products_refresh_search(uuid) from public, anon, authenticated;
