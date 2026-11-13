import type { Branch, Package, Shipment, ShipmentRequest, ShippingOption, ShippingProvider, TrackingEvent } from "./types";

/**
 * Proveedores de prueba: precios determinísticos según distancia (por CP) y peso.
 * Se usan hasta tener credenciales (SHIPPING_PROVIDERS=mock).
 */
function distanceFactor(cp: string, originCp: string): number {
  const d = Math.abs(Number(cp) - Number(originCp));
  if (d < 100) return 1; // misma zona
  if (d < 800) return 1.35; // región
  if (d < 2500) return 1.7;
  return 2.1; // lejos (Patagonia, norte)
}

function weightFactor(packages: Package[]): number {
  const kg = packages.reduce((n, p) => n + Math.max(p.weightG, (p.l * p.w * p.h) / 4), 0) / 1000;
  return 1 + Math.max(0, kg - 1) * 0.18;
}

const round = (n: number) => Math.round(n / 100) * 100;

function branchesFor(cp: string, provider: string): Branch[] {
  return [
    { id: `${provider}-${cp}-1`, name: `Sucursal ${cp} Centro`, address: "Av. Principal 123" },
    { id: `${provider}-${cp}-2`, name: `Sucursal ${cp} Norte`, address: "Belgrano 456" },
  ];
}

function makeMock(id: "andreani" | "correo_argentino", name: string, base: number, eta: number): ShippingProvider {
  return {
    id,
    name,
    async quote(cp, packages, originCp) {
      // CP 9999 simula que la API de este proveedor no responde (para probar el aviso y el respaldo)
      if (cp === "9999" || (cp === "9998" && id === "andreani")) throw new Error(`${name} no respondió`);
      const f = distanceFactor(cp, originCp) * weightFactor(packages);
      const extraDays = f > 1.6 ? 3 : f > 1.2 ? 1 : 0;
      const opts: ShippingOption[] = [
        {
          id: `${id}:domicilio`,
          provider: id,
          providerName: name,
          service: "domicilio",
          label: `${name} a domicilio`,
          price: round(base * f),
          etaDays: eta + extraDays,
        },
        {
          id: `${id}:sucursal`,
          provider: id,
          providerName: name,
          service: "sucursal",
          label: `${name} a sucursal`,
          price: round(base * 0.72 * f),
          etaDays: eta + extraDays + 1,
          branches: branchesFor(cp, id),
        },
      ];
      return opts;
    },
    async createShipment(req: ShipmentRequest): Promise<Shipment> {
      return { trackingCode: `${id === "andreani" ? "AND" : "CA"}${req.orderNumber.replace(/\D/g, "")}${Date.now() % 10000}` };
    },
    async track(code: string): Promise<TrackingEvent[]> {
      return [{ date: new Date().toISOString(), status: `En camino (${code})`, location: "Centro de distribución" }];
    },
  };
}

export const mockAndreani = makeMock("andreani", "Andreani", 7400, 3);
export const mockCorreo = makeMock("correo_argentino", "Correo Argentino", 6900, 4);
