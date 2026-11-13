# API del back office

La API REST está en `/api/admin/v1/`. Sirve para que el back office lea y cargue datos sin escribir directo en la base. Si el back office escribe directo en Supabase con la service key, también funciona: en ese caso hay que avisarle a la tienda con `/revalidate` o con el webhook (ver [DEPLOY.md](DEPLOY.md)).

## Autenticación

```
Authorization: Bearer <BACKOFFICE_API_TOKEN>
```

- **Token:** `BACKOFFICE_API_TOKEN` se define en las variables de entorno y tiene que tener 32 caracteres o más. Se puede generar con `openssl rand -base64 36`.
- **Sesión del panel:** también se acepta la sesión de un admin logueado en `/admin`, útil para probar desde el navegador.
- **Respuestas:** siempre en JSON. Las exitosas devuelven `{ "data": … }` y los errores `{ "error": "…", "details": … }`.

| Código | Significado |
|---|---|
| 200 / 201 | OK / creado |
| 400 | Pedido mal formado |
| 401 | Falta el token o es incorrecto |
| 404 | No existe |
| 405 | Método no permitido para ese recurso |
| 422 | Datos inválidos (en `details` va el error de cada campo) |
| 500 | Error interno (queda en los logs) |

Cada escritura actualiza la tienda al instante, porque revalida la caché.

## Recursos

### Categorías
| | |
|---|---|
| `GET /categories` | Secciones y subsecciones (`id`, `parentId`, `name`, `slug`, `kind`, `order`, `active`). |

### Productos
| | |
|---|---|
| `GET /products` | Resumen de todos los productos (precio, oferta, stock total, foto, categorías). |
| `GET /products/:id` | Producto completo: colores con fotos y variantes (talle, SKU, stock). |
| `POST /products` | Crea un producto completo (mismo formato que `GET /products/:id`, sin `id`). |
| `PUT /products/:id` | Reemplaza el producto completo. Las variantes que no vengan se borran. |
| `PATCH /products/:id` | Cambios puntuales: `{ "active": false }` o `{ "offer": { "isOffer": true, "salePrice": 49900, "startsAt": "2026-12-01T00:00:00-03:00", "endsAt": null } }`. |
| `POST /products/import` | Importación masiva por CSV (ver más abajo). Con `?dryRun=1` solo valida y no guarda nada. |

Ejemplo de producto:

```json
{
  "name": "Zapatilla urbana Ruta",
  "slug": "zapatilla-urbana-ruta-hombre",
  "description": "Cómoda, liviana y lista para todos los días.",
  "specs": { "Material": "Sintético", "Suela": "Goma" },
  "line": "diario",
  "basePrice": 64900,
  "isNew": true,
  "isFeatured": false,
  "active": true,
  "weightG": 1000,
  "box": { "l": 33, "w": 20, "h": 12 },
  "categoryIds": ["<id sección hombre>", "<id subsección moda>"],
  "colors": [
    { "id": "c1", "name": "Negro", "hex": "#1f1f1f", "images": [{ "url": "https://<proyecto>.supabase.co/storage/v1/object/public/media/…", "alt": "Zapatilla negra" }] }
  ],
  "variants": [
    { "colorId": "c1", "size": "40", "sku": "ALB-1001-NEG-40", "stock": 3 }
  ]
}
```

Reglas de validación (las mismas que usa el panel):
- `name`, `basePrice` > 0, al menos una categoría, al menos un color y una variante.
- Los SKU no se pueden repetir.
- Las fotos tienen que ser rutas locales, del Storage de Supabase o de un host listado en `IMAGE_HOSTS`. Cualquier otra se rechaza, porque rompería la página.

### Stock
| | |
|---|---|
| `PATCH /stock` | Actualización masiva por SKU: `[{ "sku": "ALB-1001-NEG-40", "stock": 5 }, …]` (hasta 2000 por pedido). Responde `{ updated, notFound: [skus] }`. |

### Home
| | |
|---|---|
| `GET /banners` · `POST /banners` · `PUT /banners/:id` · `DELETE /banners/:id` | `{ title, alt, imageDesktop, imageMobile, videoUrl, link, startsAt, endsAt, active }` |
| `GET /videos` · `POST /videos` · `PUT /videos/:id` · `DELETE /videos/:id` | `{ source: "upload" \| "instagram", mediaUrl, instagramUrl, thumbnail, caption, productId, active }` |
| `GET /promos` · `POST /promos` · `PUT /promos/:id` · `DELETE /promos/:id` | `{ provider, label, installments, interestFree, minAmount, logoUrl, paywayPlanId, showInTopbar, startsAt, endsAt, active }` |

### Envíos
| | |
|---|---|
| `GET /shipping/config` · `PUT /shipping/config` | `{ originCp: "5730", defaultBox: { weightG, l, w, h }, cacheHours }` |
| `GET /shipping/rates` · `PUT /shipping/rates` | Reemplaza todas las tarifas de respaldo: `[{ zone, cpFrom, cpTo, service: "domicilio" \| "sucursal", price, etaDays }]` |

### Pedidos
| | |
|---|---|
| `GET /orders?status=pagado` | Lista (hasta 200, los más nuevos primero). Estados: `pendiente`, `pagado`, `enviado`, `entregado`, `cancelado`. |
| `GET /orders/:number` | Detalle: cliente, envío elegido, productos, pago y seguimiento. |
| `PATCH /orders/:number` | `{ "status": "enviado", "trackingCode": "AND000123" }`. Para pasar a `enviado` el `trackingCode` es obligatorio. |

### Newsletter
| | |
|---|---|
| `GET /newsletter` | Suscriptores. Para Excel está la descarga `/api/admin/newsletter.csv`, desde el panel. |

### Revalidar
| | |
|---|---|
| `POST /revalidate` | `{ "tables": ["products"] }` o `{ "tags": ["home"] }`. Sin body revalida todo. Usalo si el back office escribió directo en la base. |

## Importación por CSV

`POST /products/import` con el CSV como cuerpo (`Content-Type: text/csv`). Hay **una fila por variante** (color + talle). El separador puede ser `;` o `,`, y la primera fila tiene los encabezados:

```
nombre;slug;descripcion;seccion;subseccion;linea;precio;precio_oferta;color;hex;talle;sku;stock;peso_g;foto_url
Ojota Playa;ojota-playa;Liviana;mujer;verano;diario;12.900;;Negro;#111111;36;OJ-NEG-36;3;300;/uploads/ojota.webp
Ojota Playa;ojota-playa;Liviana;mujer;verano;diario;12.900;;Negro;#111111;37;OJ-NEG-37;5;300;
```

- **Columnas obligatorias:** `nombre`, `precio`, `seccion` y `talle`. Las demás son opcionales.
- **Agrupado:** las filas con el mismo `slug` (o nombre) forman un producto, y las del mismo `color` agrupan talles y fotos.
- **Secciones:** `seccion` y `subseccion` son los slugs de la tienda (`hombre`, `mujer`, `ninos`, `alpargatas` / `moda`, `verano`, `colegial`, …).
- **Productos existentes:** si el slug ya existe, se actualiza y se reemplazan colores, talles y fotos con lo que trae el archivo.
- **Límite:** hasta 5000 filas por archivo.
- **Respuesta:** `{ created, updated, failed, products: [{ slug, action, variants, errors }], rowErrors }`. Conviene correr primero con `?dryRun=1`.

## Ejemplos

```bash
TOKEN=…
curl -H "Authorization: Bearer $TOKEN" https://<dominio>/api/admin/v1/orders?status=pagado
curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '[{"sku":"ALB-1001-NEG-40","stock":0}]' https://<dominio>/api/admin/v1/stock
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: text/csv" \
  --data-binary @productos.csv "https://<dominio>/api/admin/v1/products/import?dryRun=1"
```
