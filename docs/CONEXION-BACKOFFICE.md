# Conexión con el back office

Esta web es **solo el front** (la vidriera). El back office de Albertito es la fuente de verdad de productos, precios, stock, categorías, fotos y pedidos. La web los muestra y vende.

> Versión visual de esta guía: `docs/conexion-backoffice.html` (abrir en el navegador).

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
