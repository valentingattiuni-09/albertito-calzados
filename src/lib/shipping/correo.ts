import type { Package, Shipment, ShipmentRequest, ShippingOption, ShippingProvider, TrackingEvent } from "./types";

/**
 * Correo Argentino (API MiCorreo). Se completa en la Fase 6 con las credenciales.
 * Variables: CORREO_ARGENTINO_USER, CORREO_ARGENTINO_PASSWORD, CORREO_ARGENTINO_CUSTOMER_ID.
 *
 * TODO(Fase 6): confirmar endpoints y campos con la documentación vigente de MiCorreo
 * (token; cotización con CP origen/destino, tipo de entrega domicilio/sucursal y medidas;
 * listado de sucursales por provincia; alta de envío; seguimiento).
 */
export const correoProvider: ShippingProvider = {
  id: "correo_argentino",
  name: "Correo Argentino",
  async quote(_cp: string, _packages: Package[], _originCp: string): Promise<ShippingOption[]> {
    void _cp;
    void _packages;
    void _originCp;
    throw new Error("Correo Argentino: integración pendiente (Fase 6). Usá SHIPPING_PROVIDERS=mock.");
  },
  async createShipment(_req: ShipmentRequest): Promise<Shipment> {
    void _req;
    throw new Error("Correo Argentino: integración pendiente (Fase 6).");
  },
  async track(_code: string): Promise<TrackingEvent[]> {
    void _code;
    throw new Error("Correo Argentino: integración pendiente (Fase 6).");
  },
};
