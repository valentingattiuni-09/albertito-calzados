import type { Package, Shipment, ShipmentRequest, ShippingOption, ShippingProvider, TrackingEvent } from "./types";

/**
 * Andreani (API oficial). Se completa en la Fase 6 con las credenciales del contrato.
 * Variables: ANDREANI_USER, ANDREANI_PASSWORD, ANDREANI_CONTRACT_DOMICILIO, ANDREANI_CONTRACT_SUCURSAL, ANDREANI_CLIENT.
 *
 * TODO(Fase 6): confirmar endpoints y campos con la documentación vigente de Andreani
 * (login → token; cotización por CP destino, contrato y bultos con kilos/volumen;
 * alta de envío; trazabilidad). No usar en producción sin validarlo en su sandbox.
 */
export const andreaniProvider: ShippingProvider = {
  id: "andreani",
  name: "Andreani",
  async quote(_cp: string, _packages: Package[], _originCp: string): Promise<ShippingOption[]> {
    void _cp;
    void _packages;
    void _originCp;
    throw new Error("Andreani: integración pendiente (Fase 6). Usá SHIPPING_PROVIDERS=mock.");
  },
  async createShipment(_req: ShipmentRequest): Promise<Shipment> {
    void _req;
    throw new Error("Andreani: integración pendiente (Fase 6).");
  },
  async track(_code: string): Promise<TrackingEvent[]> {
    void _code;
    throw new Error("Andreani: integración pendiente (Fase 6).");
  },
};
