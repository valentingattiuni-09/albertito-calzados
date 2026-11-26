# Integraciones

Pagos y envíos funcionan detrás de interfaces (`PaymentProvider` en `src/lib/payments`, `ShippingProvider` en `src/lib/shipping`). Hoy corren con proveedores de prueba (`mock`). Para pasar a los reales se cambian las variables de entorno. La tienda no se toca.

**Estado:** las integraciones reales **no están probadas contra los proveedores**: faltan las credenciales y su documentación vigente. Antes de salir a producción, completá y probá cada punto de esta lista en el sandbox de cada proveedor.

## 1. Payway (Banco Nación)

Archivos: `src/lib/payments/payway.ts` (servidor) y `src/lib/payments/client.ts` (tokenización en el navegador).

| Variable | Dónde |
|---|---|
| `PAYMENT_PROVIDER=payway` y `NEXT_PUBLIC_PAYMENT_PROVIDER=payway` | Activan Payway (tienen que coincidir). |
| `NEXT_PUBLIC_PAYWAY_PUBLIC_KEY` | Clave pública, se usa en el navegador para tokenizar. |
| `PAYWAY_PRIVATE_KEY` | Clave privada, solo en el servidor. |
| `PAYWAY_SITE_ID` | Comercio. |
| `PAYWAY_ENV=sandbox` / `production` | Ambiente. `PAYWAY_API_URL` lo pisa si hace falta. |

Checklist:
- [ ] Pedirle a Payway las credenciales de sandbox y la documentación vigente de la API de pagos y del SDK JS de tokenización.
- [ ] **Tokenización en el navegador** (`tokenizeCard` en `client.ts`, rama `payway`): cargar el SDK y generar el token con la clave pública. Hoy tira "Payway todavía no está conectado".
- [ ] Confirmar la URL base y el header de autenticación (`payway.ts` usa `apikey` y la API v2 de Decidir).
- [ ] Confirmar los **IDs de medio de pago** (`PAYMENT_METHOD_IDS`): Visa, Mastercard, Naranja, débitos.
- [ ] Configurar en la cuenta los planes de cuotas S/I y cargar el `paywayPlanId` de cada promo en el panel. Si el plan requiere otro campo en el pago (`installments` o `establishment_name`), agregarlo en `createPayment`.
- [ ] Confirmar el formato del importe (hoy se manda en centavos).
- [ ] **Webhook**: configurar la URL `https://<dominio>/api/webhooks/payway` y validar la firma u origen según Payway en `parseNotification` (hoy siempre reconsulta el estado antes de registrar).
- [ ] Probar en sandbox: aprobado, rechazado, pendiente, reintento sobre el mismo pedido y webhook.

Para sumar **Mercado Pago** o **Go Cuotas** hay esqueletos en `src/lib/payments/others.ts`. Hay que implementar `createPayment`, `getStatus` y `parseNotification`, y agregar la opción en el checkout. Go Cuotas se muestra solo cuando su promo está activa en el panel.

## 2. Andreani

Archivo: `src/lib/shipping/andreani.ts`. Variables: `SHIPPING_PROVIDERS=andreani,correo`, `ANDREANI_USER`, `ANDREANI_PASSWORD`, `ANDREANI_CONTRACT_DOMICILIO`, `ANDREANI_CONTRACT_SUCURSAL`, `ANDREANI_CLIENT`.

- [ ] Credenciales y contratos (uno a domicilio y otro a sucursal).
- [ ] `quote(cp, paquetes, cpOrigen)`: login, cotización por CP destino, contrato y bultos (kilos y volumen). Devolver dos opciones, `andreani:domicilio` y `andreani:sucursal`, con sus `branches`.
- [ ] `createShipment`: alta del envío después del pago. La usa el back office; con el número de seguimiento hay que hacer `PATCH /orders/:number`.
- [ ] `track(codigo)`: seguimiento.

## 3. Correo Argentino (MiCorreo)

Archivo: `src/lib/shipping/correo.ts`. Variables: `CORREO_ARGENTINO_USER`, `CORREO_ARGENTINO_PASSWORD`, `CORREO_ARGENTINO_CUSTOMER_ID`.

- [ ] Alta en MiCorreo API y credenciales.
- [ ] `quote`: cotización con CP de origen y destino, tipo de entrega (domicilio o sucursal) y medidas. Sucursales por provincia o CP para `branches`.
- [ ] `createShipment` y `track`.

### Cómo se comporta el cotizador
- Consulta las dos empresas en paralelo y ordena las opciones por precio. Siempre suma "Retiro gratis en el local".
- Guarda las cotizaciones por CP + peso (`settings.shipping.cacheHours`) en memoria y en `shipping_quotes_cache`.
- Si una empresa falla, muestra la otra con un aviso. Si fallan las dos, usa la tarifa de respaldo por zona (panel → Envíos).
- En el checkout **se vuelve a cotizar en el servidor**: nunca se cobra el precio que manda el navegador.

## 4. Mails (Resend)

`RESEND_API_KEY` y `EMAIL_FROM` (con un dominio verificado en Resend). Sin estas variables, los mails (confirmación de pedido y arrepentimiento) se escriben en el log del servidor.

- [ ] Pendiente: mail al cliente cuando el pedido pasa a "enviado", con el seguimiento. Se puede disparar desde `updateOrder`.

## 5. Instagram

`INSTAGRAM_ACCESS_TOKEN`: token de larga duración de la cuenta profesional, que se obtiene con la app de Meta. Con el token, el panel de Videos muestra los últimos posts para elegir. El token vence a los 60 días y hay que renovarlo.

## 6. Analítica

`NEXT_PUBLIC_GA4_ID` (G-XXXX) y `NEXT_PUBLIC_META_PIXEL_ID`. Eventos que se registran:

| Evento GA4 | Evento Meta |
|---|---|
| `view_item` | `ViewContent` |
| `add_to_cart` | `AddToCart` |
| `begin_checkout` | `InitiateCheckout` |
| `purchase` | `Purchase` (se manda una sola vez por pedido) |
| `sign_up` | `Lead` (newsletter) |
