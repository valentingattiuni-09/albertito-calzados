# Deploy (Supabase + Vercel)

## 1. Supabase

1. Creá un proyecto en supabase.com, en la región São Paulo, que es la más cercana.
2. Aplicá las migraciones:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
3. Datos de ejemplo (opcional, para probar): `npm run seed:sql` y pegá `supabase/seed.sql` en el SQL Editor. **En producción no cargues el seed**: los productos reales se cargan con el panel o con la importación CSV.
4. **Usuario admin:** creá el usuario en Authentication → Users (con email y contraseña). Después, en el SQL Editor:
   ```sql
   update profiles set role = 'admin' where id = (select id from auth.users where email = 'dueño@…');
   ```
5. **Storage:** la migración crea el bucket público `media`. Revisá que exista.
6. **Webhook de revalidación** (Database → Webhooks): uno por tabla (`products`, `product_variants`, `product_images`, `product_colors`, `product_categories`, `categories`, `payment_promos`, `topbar_messages`, `home_banners`, `home_videos`, `settings`).
   - Método `POST` a `https://<dominio>/api/revalidate`.
   - Header `x-revalidate-secret: <REVALIDATE_SECRET>`.
   - Eventos: insert, update y delete.

   Así, lo que el back office escriba directo en la base se ve enseguida en la tienda.

## 2. Vercel

1. Subí el código a un repositorio de GitHub. **La carpeta `tienda/` es la raíz del proyecto**: en Vercel, "Root Directory = tienda".
2. Importá el repo en Vercel. El framework es Next.js y no hace falta configurar nada más.
3. Variables de entorno (Production y Preview), sobre la base de `.env.example`:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://albertitocalzados.com.ar` (o el dominio final) |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Del proyecto Supabase |
   | `REVALIDATE_SECRET`, `BACKOFFICE_API_TOKEN` | Secretos largos al azar (`openssl rand -base64 36`) |
   | `PAYMENT_PROVIDER`, `NEXT_PUBLIC_PAYMENT_PROVIDER`, `PAYWAY_*` | Ver [INTEGRACIONES.md](INTEGRACIONES.md) |
   | `SHIPPING_PROVIDERS`, `ANDREANI_*`, `CORREO_ARGENTINO_*` | Ver [INTEGRACIONES.md](INTEGRACIONES.md) |
   | `RESEND_API_KEY`, `EMAIL_FROM` | Mails |
   | `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | Analítica |
   | `IMAGE_HOSTS` | Solo si usás fotos de otro host además de Supabase |

   **No definas** `ADMIN_DEMO_*` en producción: el modo demo existe solo sin Supabase.
4. **Dominio:** en Vercel → Domains agregá el dominio y configurá los DNS que indica Vercel en el registrador (NIC Argentina para `.com.ar`).

## 3. Antes de abrir

- [ ] Textos legales revisados por un abogado o contador: razón social, CUIT y domicilio en `src/lib/content/pages.ts`.
- [ ] Payway en producción y probado con una compra real de bajo monto (y su anulación).
- [ ] Andreani y Correo Argentino cotizando con datos reales y el CP de origen correcto (panel → Envíos).
- [ ] Logos originales en `public/brand/` y favicon.
- [ ] Fotos reales de productos (cuadradas, fondo blanco) y banners (1600×600 y 800×800).
- [ ] WhatsApp real, datos del local e Instagram en el panel → Configuración.
- [ ] Mails probados (pedido y arrepentimiento) desde el dominio.
- [ ] Botón de arrepentimiento visible en el footer (Res. 424/2020) y link a Defensa del Consumidor.
- [ ] Google Search Console: enviar `https://<dominio>/sitemap.xml`.
- [ ] Lighthouse en mobile sobre home, sección y ficha (objetivo 90+).

## 4. Comandos útiles

```bash
npm run dev          # desarrollo
npm run build        # build de producción
npm run lint         # lint
npm run typecheck    # tipos
npm test             # tests de lógica (precios, filtros, búsqueda, CSV)
npm run seed:sql     # regenerar supabase/seed.sql y las imágenes demo
```
