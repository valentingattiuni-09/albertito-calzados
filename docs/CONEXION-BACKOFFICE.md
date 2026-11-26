# Conexión con el back office

Esta web es **solo el front** (la vidriera). El back office de Albertito es la fuente de verdad de productos, precios, stock, categorías, fotos y pedidos. La web los muestra y vende.

> Versión visual de esta guía: `docs/conexion-backoffice.html` (abrir en el navegador).

## Modo back office (`DATA_SOURCE=backoffice`)

Ya está hecho el **adaptador de lectura** (fase A): con `DATA_SOURCE=backoffice` la web lee todo de la API de la tienda del back office (`/api/v1/store/*`, servidor a servidor, cabecera `X-Store-Key`). Los tipos de `src/lib/data/types.ts` **no cambiaron**: los componentes son los mismos. El modo demo (`DATA_SOURCE` vacío o `demo`) sigue exactamente igual.

### Variables

| Variable | Para qué |
|---|---|
| `DATA_SOURCE` | `demo` (por defecto) o `backoffice`. Otro valor corta el arranque con un mensaje claro. |
| `BACKOFFICE_API_URL` | URL base de la API, ej. `http://api:3000/api/v1` (red interna de Docker) o `http://localhost:3002/api/v1` (local). |
| `STORE_API_KEY` | Clave de la API de la tienda. **Solo servidor**: la usa `src/lib/backoffice/client.ts` (con `server-only`); nunca llega al navegador. |
| `BACKOFFICE_TIMEOUT_MS` | Tiempo máximo por pedido (4000 por defecto). |
| `IMAGE_HOSTS` | El host de las fotos del back office (ej. `media.albertitocalzados.com.ar`). En desarrollo acepta `http://localhost:PUERTO`. |
| `NEXT_PUBLIC_STORE_WHATSAPP` | WhatsApp del local para la página «Estamos actualizando la tienda». |
| `ALLOW_LOCAL_MEDIA` | Solo para probar un build de producción en tu compu con fotos por `http://localhost`. Nunca en producción. |

### Cómo funciona

- **Código:** `src/lib/backoffice/` — `source.ts` (el modo), `client.ts` + `http.ts` (cliente con timeout, reintentos solo en lecturas y respaldo), `map.ts` (mapeo a `types.ts`: centavos → pesos, color sin hex → gris, línea vacía → «diario», texto de búsqueda), `store.ts` (lecturas), `guard.ts` (compras apagadas), `build.ts` (build sin la API).
- **Caché:** la misma de siempre (`"use cache"` + `cacheTag`/`cacheLife` + `POST /api/revalidate`). La búsqueda y los sinónimos se resuelven en memoria, como en el modo demo.
- **Si la API se cae:** se sigue mostrando la última copia (lo que Next tiene cacheado y, además, una copia en memoria de cada lectura). Si no hay ninguna copia (por ejemplo, la web recién arrancó), se ve una página amable «Estamos actualizando la tienda. Volvé en unos minutos.» con el WhatsApp del local; apenas la API responde, la tienda vuelve sola.
- **Build:** no necesita la API. Si no la alcanza (por ejemplo, al construir la imagen de Docker), compila con datos vacíos y la tienda se completa sola al arrancar.
- **Supabase:** con `backoffice` no se usa en ningún lado (`hasSupabase` es siempre `false` y los clientes cortan antes de conectarse).

### Qué queda apagado en la fase A (solo lectura)

| Qué | Cómo se ve |
|---|---|
| Comprar | «Iniciar compra» deshabilitado en el carrito, con el aviso; `/checkout` muestra el aviso y el botón de WhatsApp. |
| `POST /api/checkout`, `/api/checkout/pay`, `/api/coupon`, `/api/shipping/quote` | 503 `CHECKOUT_CLOSED` con el mensaje. |
| Cotizador de envío (ficha y carrito) | No se muestra (en la ficha, el aviso). |
| `/checkout/confirmacion/*` y «Seguí tu pedido» | 404 / mensaje (todavía no hay pedidos online). |
| Panel `/admin` y `/api/admin/*` | 404 (el catálogo se administra en el back office). |
| Webhook de Payway (`/api/webhooks/payway`) | 404 (los pagos los confirma el back office). |
| Banners y videos del home, promos de cuotas, barra superior | Vacíos (llegan en la fase C). |
| Newsletter | Mensaje «se habilita muy pronto» (fase C). |
| Botón de arrepentimiento | Deriva al mail y al WhatsApp del local (pasa al back office en la fase B). |

### Lo que viene

- **Fase B (compra):** pedidos de invitado en el back office, cobro con Payway (formulario alojado si Payway lo ofrece) y Mercado Pago, confirmación solo por webhook, cotización real de Andreani y Correo Argentino (con respaldo por zona y retiro en el local), arrepentimiento y seguimiento en el back office, mails del pedido.
- **Fase C:** banners, videos, promos de cuotas, barra superior, newsletter y cupones desde el back office; alta y seguimiento de envíos; el back office avisa a `/api/revalidate` cuando cambia algo.

## Las 3 conexiones

| # | Dirección | Qué pasa |
|---|---|---|
| 1 | Web → back office | La web **lee** productos, categorías, banners y promos desde la API del back office, desde el servidor (nunca desde el navegador), y guarda una copia por unos minutos. |
| 2 | Back office → web | Al guardar un cambio, el back office **avisa** a la web para que se vea al instante: `POST /api/revalidate` (ya está hecho). |
| 3 | Web → back office | La web verifica **stock** antes de cobrar y, después del pago, **envía el pedido** al back office. “Seguí tu pedido” consulta el estado al back office. |

### Aviso de cambios (ya implementado)

```
POST https://<dominio-de-la-web>/api/revalidate
x-revalidate-secret: <REVALIDATE_SECRET>
Content-Type: application/json

{ "table": "products", "record": { "slug": "zapatilla-urbana-negra" } }
```

Valores de `table`: `products`, `categories`, `home_banners`, `payment_promos`, `topbar_messages`, `settings` (ver `src/lib/data/tags.ts`). Sin el aviso, la web igual se actualiza sola cada pocos minutos.

## Lo que la web necesita del back office (propuesta)

Si la API del back office ya existe con otro formato, no hace falta cambiarla: se escribe un adaptador en la web.

| Endpoint | Uso |
|---|---|
| `GET /productos` | Catálogo, filtros, buscador, inicio (paginado, filtro por categoría) |
| `GET /productos/:slug` | Ficha: fotos por color, talles con stock, descripción |
| `GET /categorias` | Menú (secciones y subsecciones, con su numeración) |
| `GET /banners` | Carrusel del inicio |
| `GET /promos` | Cuotas sin interés y mensajes de la barra azul |
| `POST /stock/verificar` | Antes de cobrar |
| `POST /pedidos` | Crear el pedido después del pago |
| `GET /pedidos/:numero` | Estado y seguimiento |

Ejemplo de producto:

```json
{
  "id": "123",
  "slug": "zapatilla-urbana-negra",
  "nombre": "Zapatilla Urbana",
  "descripcion": "Capellada de cuero, suela de goma.",
  "linea": "seleccion",
  "categorias": ["mujer", "zapatillas"],
  "precio": 59000,
  "precio_oferta": 47200,
  "nuevo": true,
  "destacado": false,
  "peso_g": 900,
  "colores": [
    {
      "nombre": "Negro", "hex": "#1f1f1f",
      "fotos": ["https://fotos.su-dominio.com/123-negro-1.jpg"],
      "talles": [{ "talle": "36", "sku": "ZU-NEG-36", "stock": 3 }]
    }
  ]
}
```

Ejemplo de pedido que envía la web:

```json
{
  "numero": "ALB-001234",
  "cliente": { "nombre": "Ana", "apellido": "Pérez", "email": "…", "telefono": "…", "dni": "…" },
  "entrega": { "tipo": "domicilio", "empresa": "andreani", "direccion": "…", "cp": "5730", "costo": 6500 },
  "items": [{ "sku": "ZU-NEG-36", "cantidad": 1, "precio": 47200 }],
  "pago": { "medio": "visa", "cuotas": 3, "estado": "aprobado", "id_transaccion": "…" },
  "total": 53700
}
```

`pago.medio` puede ser `efectivo` (Pago Fácil / Rapipago): en ese caso `estado` es `pendiente` y lleva el código del cupón.

## Dónde tocar en la web

| Qué | Dónde |
|---|---|
| Lecturas del catálogo (hoy: Supabase o demo) | `src/lib/data/` (`catalog.ts`, `home.ts`, `layout.ts`) — tipos en `types.ts` |
| Creación de pedidos y stock | `src/lib/orders/orders.ts`, `src/app/api/checkout/route.ts` |
| Pagos (tarjeta y efectivo) | `src/lib/payments/`, `src/lib/orders/pay.ts` |
| Caché y aviso de cambios | `src/lib/data/tags.ts`, `src/app/api/revalidate/route.ts` |
| Imágenes de otro dominio | variable `IMAGE_HOSTS` (ver `docs/DEPLOY.md`) |

## Alternativa ya hecha

Si el back office no puede exponer una API, puede **empujar** los cambios a la API de la web: `/api/admin/v1` con token (`BACKOFFICE_API_TOKEN`). Documentada en `docs/API.md`. Funciona, pero hay dos copias de los datos.

## Seguridad

- HTTPS y servidor a servidor. Las claves van en variables de entorno, nunca en el código ni en el navegador.
- Una clave por sentido: la que usa la web para llamar al back office y `REVALIDATE_SECRET` para el aviso.

## Preguntas abiertas

1. ¿En qué está hecho el back office y qué API tiene?
2. ¿Dónde se guardan las fotos (dominio)?
3. ¿Banners y promos se cargan en el back office o en el panel `/admin` de la web?
4. ¿Quién cobra (Payway en la web, o el back office)? ¿Y quién emite los cupones de Pago Fácil / Rapipago?
5. ¿Quién cotiza y genera los envíos con Andreani y Correo Argentino?
6. ¿Cómo se identifica cada talle y color (SKU)?
