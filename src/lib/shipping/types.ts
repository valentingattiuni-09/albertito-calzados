/**
 * Contrato común para empresas de envío. La tienda solo habla con esta interfaz:
 * cambiar de proveedor (o pasar de mock a la API real) no toca la tienda.
 */
export type Package = {
  weightG: number;
  /** Medidas de la caja en cm */
  l: number;
  w: number;
  h: number;
};

export type ShippingService = "domicilio" | "sucursal" | "retiro";

export type Branch = { id: string; name: string; address: string };

export type ShippingOption = {
  /** Identificador estable para elegir la opción: "andreani:domicilio" */
  id: string;
  provider: "andreani" | "correo_argentino" | "local" | "fallback";
  providerName: string;
  service: ShippingService;
  label: string;
  price: number;
  etaDays: number | null;
  branches?: Branch[];
};

export type ShipmentRequest = {
  orderNumber: string;
  service: ShippingService;
  recipient: { name: string; dni: string; phone: string; email: string };
  address?: { street: string; number: string; floor?: string; city: string; province: string; cp: string };
  branchId?: string;
  packages: Package[];
  declaredValue: number;
};

export type Shipment = { trackingCode: string; labelUrl?: string };

export type TrackingEvent = { date: string; status: string; location?: string };

export interface ShippingProvider {
  readonly id: "andreani" | "correo_argentino";
  readonly name: string;
  /** Cotiza a domicilio y a sucursal para un código postal. */
  quote(cp: string, packages: Package[], originCp: string): Promise<ShippingOption[]>;
  /** Lo usa el back office después del pago. */
  createShipment(req: ShipmentRequest): Promise<Shipment>;
  track(trackingCode: string): Promise<TrackingEvent[]>;
}

/** CP argentino: acepta "5730" o CPA "D5730ABC"; devuelve los 4 dígitos. */
export function normalizeCp(input: string): string | null {
  const m = input.toUpperCase().replace(/\s/g, "").match(/^[A-Z]?(\d{4})[A-Z]{0,3}$/);
  return m ? m[1] : null;
}
