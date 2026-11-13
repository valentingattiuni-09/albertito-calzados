-- Botón de arrepentimiento (Res. 424/2020): solicitudes de revocación de compras online.
create table withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                    -- código de trámite que se le da al cliente
  order_number text,
  first_name text not null,
  last_name text not null,
  dni text not null,
  email text not null,
  phone text,
  reason text,
  status text not null default 'recibida' check (status in ('recibida', 'en_proceso', 'resuelta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger withdrawal_requests_updated_at before update on withdrawal_requests
  for each row execute function set_updated_at();

alter table withdrawal_requests enable row level security;
-- Se crea solo desde el servidor (service role). El admin las lee y actualiza.
create policy "admin read" on withdrawal_requests for select using (is_admin());
create policy "admin update" on withdrawal_requests for update using (is_admin()) with check (is_admin());
