# Albertito Calzados · tienda online

Next.js (App Router) + TypeScript + Tailwind + Supabase. Pisá fuerte. Caminá feliz.

## Para el programador: conectar el back office

Empezá por **[docs/CONEXION-BACKOFFICE.md](docs/CONEXION-BACKOFFICE.md)**: qué hace esta web, qué necesita del back office y dónde se toca el código. La API que ya trae la web está en [docs/API.md](docs/API.md).

Demo publicada: https://albertito-calzados.vercel.app (pagos y envíos simulados).

## Correr en local

```bash
npm install
npm run dev
```

Abrí http://localhost:3000. Requiere Node 20 o más nuevo.

Si no hay variables de Supabase, la tienda arranca en **modo demo** y usa el catálogo de `src/lib/demo/catalog.ts`. Así se puede probar todo sin base de datos.

### Dos modos: `DATA_SOURCE`

| Modo | Cómo | De dónde salen los datos |
|---|---|---|
| **Demo** (por defecto) | `DATA_SOURCE` vacío o `demo` | Como siempre: datos de demostración, o Supabase si está configurado. Sirve para diseñar. |
| **Back office** | `DATA_SOURCE=backoffice` + `BACKOFFICE_API_URL` + `STORE_API_KEY` + `IMAGE_HOSTS` | La API del back office de Albertito (catálogo, precios, stock, categorías, configuración). Supabase no se usa. **Fase A: solo lectura**, las compras están apagadas. |

```bash
# Modo back office contra la API local del back office (puerto 3002, fotos por http):
DATA_SOURCE=backoffice BACKOFFICE_API_URL=http://localhost:3002/api/v1 STORE_API_KEY=<clave> \
IMAGE_HOSTS=http://localhost:3002 NEXT_PUBLIC_STORE_WHATSAPP=5492657000000 npm run dev
```

Detalle, variables y qué queda apagado en cada fase: [docs/CONEXION-BACKOFFICE.md](docs/CONEXION-BACKOFFICE.md#modo-back-office-data_sourcebackoffice).

Tests de la lógica: `npm test` (corre `tests/*.test.mts` con `node --test`).

## Conectar Supabase

1. Creá un proyecto en supabase.com.
2. Copiá `.env.example` a `.env.local` y completá `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
3. Aplicá las migraciones y cargá los datos de ejemplo:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push
   npm run seed:sql
   ```

   Después pegá `supabase/seed.sql` en el SQL Editor de Supabase, o corré `psql "$DATABASE_URL" -f supabase/seed.sql`.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `src/app/(tienda)` | Páginas públicas (home, secciones, ficha, checkout, cuenta). |
| `src/app/admin` | Panel del propietario (Fase 5). |
| `src/app/api` | Revalidación, cotizador, checkout, webhooks y API del back office. |
| `src/components` | Layout (header, footer), producto, catálogo, carrito y home. |
| `src/lib/data` | Lecturas cacheadas por tag, desde Supabase o en modo demo. |
| `src/lib/demo/catalog.ts` | Datos de ejemplo. También generan `supabase/seed.sql`. |
| `supabase/migrations` | Esquema, funciones y RLS. |
| `docs/` | `DATABASE.md`, `API.md`, integraciones y deploy. |

## Marca

- Los tokens están en `tailwind.config.ts`: `rojo`, `blanco`, `azul` y `gris-tinta`.
- Tipografías: Poppins en todo el sitio y Archivo Black solo en campañas.
- Logos en `public/brand/`. **Son provisorios:** se sacaron del manual de marca en PNG. Reemplazalos por los originales (SVG o PNG en alta) con el mismo nombre de archivo.

## Probar una compra (modo prueba)

Pagos y envíos funcionan con proveedores de prueba hasta tener las credenciales (`PAYMENT_PROVIDER=mock`, `SHIPPING_PROVIDERS=mock`).

- **Tarjeta:** cualquier número sirve. El final define el resultado:

  | Termina en | Resultado |
  |---|---|
  | `0002` | Rechazada (se puede reintentar sobre el mismo pedido) |
  | `0003` | Pendiente (queda esperando la notificación) |
  | Cualquier otro | Aprobada |

  El número completo nunca llega al servidor: el navegador arma un token.
- **Código postal:** cualquiera cotiza Andreani y Correo Argentino de prueba.
  - `9998`: Andreani "no responde" (se muestra solo Correo, con un aviso).
  - `9999`: no responde ninguna (se usa la tarifa de respaldo por zona).
- **Cupón de prueba:** `BIENVENIDA10` (10% off).
- **Sin Supabase:** los pedidos y el stock vendido se guardan en memoria y se pierden al reiniciar. Los mails de confirmación se escriben en la consola del servidor.
