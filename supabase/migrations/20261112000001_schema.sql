-- Albertito Calzados · esquema base
-- Precios en pesos enteros (sin centavos). Todas las tablas con created_at / updated_at.

create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type product_line as enum ('diario', 'seleccion');
create type category_kind as enum ('section', 'subsection', 'offers');
create type image_type as enum ('image', 'video');
create type user_role as enum ('admin', 'customer');
create type video_source as enum ('upload', 'instagram');
create type order_status as enum ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado');
create type payment_status as enum ('pendiente', 'aprobado', 'rechazado');
create type shipping_method as enum ('domicilio', 'sucursal', 'retiro');
create type coupon_type as enum ('percent', 'fixed');

-- updated_at automático
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete cascade,
  name text not null,
  slug text not null,
  kind category_kind not null default 'subsection',
  "order" int not null default 0,
  banner_url text,
  banner_mobile_url text,
  menu_promo_image text,
  menu_promo_title text,
  menu_promo_link text,
  size_range text[] not null default '{}',      -- talles para "Buscá por talle" del mega menú
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_parent_slug_uq on categories (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
create index categories_parent_idx on categories (parent_id);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sku_base text,
  description text not null default '',
  specs jsonb not null default '{}',
  line product_line not null default 'diario',
  base_price integer not null check (base_price >= 0),
  sale_price integer check (sale_price >= 0),
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  is_offer boolean not null default false,
  is_new boolean not null default false,
  is_featured boolean not null default false,
  active boolean not null default true,
  weight_g integer,
  box_dimensions jsonb,                          -- {"l": 33, "w": 20, "h": 12} en cm
  sold_count integer not null default 0,
  search_text text not null default '',          -- nombre + categorías + sinónimos (lo mantiene un trigger)
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_active_idx on products (active);
create index products_offer_idx on products (is_offer) where is_offer;
create index products_search_idx on products using gin (search_vector);
create index products_name_trgm_idx on products using gin (name gin_trgm_ops);

create table product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index product_categories_category_idx on product_categories (category_id);

create table product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  color_name text not null,
  slug text not null,
  hex text not null default '#000000',
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, slug)
);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  color_id uuid references product_colors(id) on delete cascade,
  url text not null,
  alt text not null default '',
  "order" int not null default 0,
  type image_type not null default 'image',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_images_product_idx on product_images (product_id, color_id, "order");

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  color_id uuid references product_colors(id) on delete cascade,
  size text not null,
  size_sort numeric not null default 0,
  sku text not null unique,
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on product_variants (product_id);
create index product_variants_size_idx on product_variants (size) where stock > 0;

create table search_synonyms (
  term text primary key,                          -- "zapas"
  expands_to text[] not null,                      -- {"zapatilla","zapatillas"}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Promos, home y contenido
-- ---------------------------------------------------------------------------
create table payment_promos (
  id uuid primary key default gen_random_uuid(),
  provider text not null,                          -- visa, master, tarjeta_verde, naranja, go_cuotas…
  label text not null,                             -- "Visa", "Mastercard", "Tarjeta Verde"
  installments int not null check (installments >= 1),
  interest_free boolean not null default true,
  min_amount integer not null default 0,
  logo_url text,
  payway_plan_id text,                             -- plan configurado en la cuenta de Payway
  show_in_topbar boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table topbar_messages (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  link text,
  "order" int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table home_banners (
  id uuid primary key default gen_random_uuid(),
  image_desktop text,
  image_mobile text,
  video_url text,
  title text not null default '',
  alt text not null default '',
  link text,
  "order" int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table home_videos (
  id uuid primary key default gen_random_uuid(),
  source video_source not null default 'upload',
  media_url text,
  instagram_url text,
  instagram_media_id text,
  thumbnail text,
  caption text,
  product_id uuid references products(id) on delete set null,
  "order" int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,         -- false = solo servidor/admin
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  first_name text,
  last_name text,
  dni text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  street text not null,
  number text not null,
  floor text,
  city text not null,
  province text not null,
  cp text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  items jsonb not null default '[]',               -- [{"variant_id": "...", "qty": 1}]
  postal_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  preference text check (preference in ('hombre', 'mujer', 'nino', 'familia')),
  birth_date date,
  accepted_terms_at timestamptz not null default now(),
  source text not null default 'popup',            -- popup / footer / home
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index newsletter_email_uq on newsletter_subscribers (lower(email));

-- ---------------------------------------------------------------------------
-- Pedidos y pagos
-- ---------------------------------------------------------------------------
create sequence order_number_seq start 1000;

create table coupons (
  code text primary key,
  type coupon_type not null,
  value integer not null check (value > 0),
  min_amount integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  used_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('ALB-' || lpad(nextval('order_number_seq')::text, 6, '0')),
  user_id uuid references auth.users(id) on delete set null,
  access_token text not null default encode(gen_random_bytes(24), 'hex'),
  email text not null,
  first_name text not null,
  last_name text not null,
  dni text not null,
  phone text not null,
  shipping_method shipping_method not null,
  shipping_provider text,                          -- andreani / correo_argentino / local
  shipping_service text,                           -- domicilio / sucursal / retiro
  shipping_cost integer not null default 0,
  shipping_eta_days int,
  shipping_address jsonb,
  shipping_branch jsonb,
  postal_code text,
  tracking_code text,
  subtotal integer not null,
  discount integer not null default 0,
  total integer not null,
  coupon_code text references coupons(code),
  status order_status not null default 'pendiente',
  payment_status payment_status not null default 'pendiente',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on orders (user_id);
create index orders_status_idx on orders (status, created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  product_name text not null,
  color_name text,
  size text not null,
  sku text not null,
  image_url text,
  unit_price integer not null,
  qty integer not null check (qty > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index order_items_order_idx on order_items (order_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null,                          -- payway / mercadopago / gocuotas / mock
  provider_payment_id text,
  card_brand text,
  installments int not null default 1,
  interest_free boolean not null default false,
  amount integer not null,
  status payment_status not null default 'pendiente',
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on payments (order_id);
create unique index payments_provider_id_uq on payments (provider, provider_payment_id) where provider_payment_id is not null;

create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  type text not null,                              -- created / payment_approved / shipped / …
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index order_events_order_idx on order_events (order_id, created_at);

-- ---------------------------------------------------------------------------
-- Envíos
-- ---------------------------------------------------------------------------
create table shipping_quotes_cache (
  cp text not null,
  weight_g integer not null,
  provider text not null,
  service text not null,
  price integer not null,
  eta_days int,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (cp, weight_g, provider, service)
);

create table shipping_fallback_rates (
  id uuid primary key default gen_random_uuid(),
  zone text not null,
  cp_from int not null,
  cp_to int not null,
  service text not null check (service in ('domicilio', 'sucursal')),
  price integer not null,
  eta_days int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'categories','products','product_colors','product_images','product_variants','search_synonyms',
    'payment_promos','topbar_messages','home_banners','home_videos','settings','profiles','addresses',
    'carts','newsletter_subscribers','coupons','orders','order_items','payments','shipping_fallback_rates'
  ] loop
    execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- Perfil automático al registrarse
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, first_name, last_name)
  values (new.id, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
