# Base de datos · Albertito Calzados

Hay un solo proyecto Supabase (Postgres), y es la fuente de verdad para la tienda, el panel `/admin` y el back office externo.

- **Migraciones:** `supabase/migrations/` (en orden por fecha).
- **Datos de ejemplo:** `supabase/seed.sql`. Se genera con `npm run seed:sql` a partir de `src/lib/demo/catalog.ts`.

## Convenciones

- Los precios son `integer` en **pesos**, sin centavos. Se muestran como `$ 59.000`.
- Todas las tablas tienen `created_at` y `updated_at`. `updated_at` lo mantiene un trigger.
- Los IDs son `uuid`. Los pedidos además tienen un `number` legible (`ALB-001000`).
- "Activo" o "vigente" significa `active = true` y, si la tabla tiene fechas, `starts_at <= now() < ends_at`. Una fecha en `null` no pone límite.

## Tablas

### Catálogo

| Tabla | Qué guarda | Claves |
|---|---|---|
| `categories` | Secciones (`kind = section`), subsecciones (`subsection`, con `parent_id`) y la sección Ofertas (`offers`). `size_range` alimenta "Buscá por talle". `menu_promo_*` es la promo del mega menú. | único `(parent_id, slug)` |
| `products` | Producto base. `line`: `diario` (De todos los días) o `seleccion` (Selección Albertito). Oferta: `is_offer` + `sale_price` + `sale_starts_at/ends_at`. `weight_g` y `box_dimensions` (`{"l","w","h"}` en cm) se usan para cotizar envíos; si faltan, se toma la caja estándar de `settings.shipping`. | `slug` único |
| `product_categories` | Relación N a N. Cada producto va en su sección **y** en su subsección. | PK `(product_id, category_id)` |
| `product_colors` | Colores del producto (`slug` para la URL `?color=negro`, `hex` para los puntitos). | único `(product_id, slug)` |
| `product_images` | Fotos y videos. `color_id` en `null` = sirve para todos los colores. | |
| `product_variants` | Color × talle con `sku` y `stock`. `size_sort` ordena los talles. | `sku` único |
| `search_synonyms` | Sinónimos del buscador (`zapas` → `{zapatilla}`). | `term` |

**Productos en Ofertas:** son los que tienen `is_offer = true` y la oferta vigente. La categoría `ofertas` no se asigna a mano.

### Contenido y promos

| Tabla | Qué guarda |
|---|---|
| `payment_promos` | Cuotas por medio de pago. `show_in_topbar` define si aparece en la barra azul. `min_amount` es el monto mínimo para la promo. `payway_plan_id` tiene que coincidir con el plan configurado en Payway. |
| `topbar_messages` | Otros avisos de la barra superior ("Envíos a todo el país…"). |
| `home_banners` | Hero del home: imagen desktop/mobile o video, link, orden y vigencia. |
| `home_videos` | "Mirá cómo quedan": video subido (`source = upload`) o reel de Instagram, vinculado a un `product_id`. |
| `settings` | Clave/valor JSON. Si `is_public = false`, solo lo lee el servidor. |

Claves de `settings`:

| key | value |
|---|---|
| `whatsapp` | `{ number: "549…", display: "2657 …" }` |
| `store` | `{ address, city, province, hours, hoursDetail, instagram, email }` |
| `newsletter_popup` | `{ title, text, delaySeconds, enabled }` |
| `tax` | `{ factor: 1.21, label }`: precio sin impuestos nacionales = precio / factor |
| `shipping` (privado) | `{ originCp, defaultBox: { weightG, l, w, h }, cacheHours }` |

### Clientes

| Tabla | Qué guarda |
|---|---|
| `profiles` | Un perfil por usuario de Auth (se crea solo al registrarse). `role`: `admin` o `customer`. Un cliente no puede cambiarse el rol. |
| `addresses`, `favorites` | Del cliente logueado. |
| `carts` | Carrito del cliente logueado: `items = [{ variant_id, qty }]` + último CP usado. |
| `newsletter_subscribers` | Mail (único sin importar mayúsculas), `preference` (`hombre`/`mujer`/`nino`/`familia`), `birth_date`, `source`. |

### Pedidos

| Tabla | Qué guarda |
|---|---|
| `orders` | Datos del cliente, envío (`shipping_method`, `provider`, `service`, `cost`, `eta_days`, dirección o sucursal, `tracking_code`), importes, cupón, `status` y `payment_status`. `access_token` permite que un invitado vea su pedido. |
| `order_items` | Copia del producto al momento de comprar: nombre, color, talle, SKU, precio y foto. |
| `payments` | Un registro por intento de pago (Payway, Mercado Pago, Go Cuotas o mock). |
| `order_events` | Historial: `created`, `payment_approved`, `payment_rechazado`, `shipped`… |
| `coupons` | Cupones `percent` o `fixed`, con mínimo, vigencia y tope de usos. |

Estados: `status` va de `pendiente` a `pagado`, `enviado` y `entregado`, o termina en `cancelado`. `payment_status` es `pendiente`, `aprobado` o `rechazado`.

### Arrepentimiento

| Tabla | Qué guarda |
|---|---|
| `withdrawal_requests` | Solicitudes del botón de arrepentimiento (Res. 424/2020): `code` (código de trámite), datos del cliente, `order_number`, `reason` y `status` (`recibida` / `en_proceso` / `resuelta`). Se crean desde el servidor y solo el admin las lee. |

### Envíos

| Tabla | Qué guarda |
|---|---|
| `shipping_quotes_cache` | Cotizaciones por CP + peso + proveedor + servicio, con vencimiento. Solo la usa el servidor. |
| `shipping_fallback_rates` | Tarifa de respaldo por rango de CP y servicio, para cuando fallan las APIs. |

## Funciones

| Función | Uso |
|---|---|
| `effective_price(products)` / `sale_is_active(products)` | Precio vigente según la oferta y sus fechas. |
| `v_product_cards` (vista) | Todo lo que necesita una tarjeta: precio vigente, % off, 2 fotos, colores, talles con stock y categorías. Respeta RLS. |
| `search_products(q, max)` | Búsqueda en español, sin acentos, con prefijos, sinónimos y tolerancia a errores de tipeo (`pg_trgm`). Devuelve `product_id` + `rank`. |
| `place_order(customer, items, shipping, coupon, user_id)` | Crea el pedido tomando los precios de la base, valida el stock con bloqueo de filas y aplica el cupón. Solo la puede llamar la service role. |
| `confirm_payment(order_id, provider, provider_payment_id, status, amount, …)` | Registra un intento de pago. Si se aprueba, descuenta stock, suma `sold_count`, usa el cupón y marca el pedido como pagado. Es idempotente. Solo la puede llamar la service role. |
| `is_admin()` | La usan las policies de RLS. |

## Seguridad (RLS)

- **Catálogo, promos, banners, videos y settings públicos:** cualquiera lee solo lo activo y vigente. Solo `is_admin()` escribe.
- **Datos del cliente:** cada uno ve y edita los suyos.
- **Pedidos y pagos:** el cliente lee los suyos. Los crea y actualiza solo el servidor (service role).
- **Newsletter:** cualquiera puede insertar. Solo el admin lee.
- **Storage:** bucket público `media`. Solo el admin sube archivos.
- **Back office externo:** usa la **service key**, que saltea RLS, o la API `/api/admin/*` (Fase 6).

## Revalidación

Cuando cambia una tabla, un Database Webhook de Supabase hace `POST /api/revalidate` con el header `x-revalidate-secret`. La tienda invalida los tags que correspondan (ver `src/lib/data/tags.ts`).

## Hacer admin a un usuario

```sql
update profiles set role = 'admin' where id = (select id from auth.users where email = 'dueño@ejemplo.com');
```
