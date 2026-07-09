import "server-only";

/**
 * Weldon Tire wholesale ordering — provider interface (mirrors PartsTech pattern).
 *
 * Weldon does not publish a direct public API. Shops typically order through the
 * Mavis/Weldon B2B portal (weldontire.net). Third-party aggregators such as
 * Tireweb Connections / Tirewire Connections Center can expose Weldon as a
 * supplier feed once the shop has a commercial account.
 *
 * Until live credentials exist, ManualWeldonProvider logs the payload and returns
 * instructions to place the order in the Weldon portal.
 */

export type TireSupplierOrderPayload = {
  tireOrderId: string;
  tireOrderNumber: number;
  shopId: string;
  customer: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  vehicle: {
    year?: number | null;
    make?: string | null;
    model?: string | null;
    vin?: string | null;
  };
  tires: {
    sizeFront?: string | null;
    sizeRear?: string | null;
    brand?: string | null;
    quantity: number;
    type?: string | null;
  };
  estimatedRetailCents?: number | null;
  supplierQuoteCents?: number | null;
  depositCents: number;
};

export type TireSupplierOrderResult = {
  mode: "live" | "manual";
  orderRef?: string;
  message: string;
};

export interface WeldonTireProvider {
  readonly mode: "live" | "manual";
  submitOrder(payload: TireSupplierOrderPayload): Promise<TireSupplierOrderResult>;
}

class ManualWeldonProvider implements WeldonTireProvider {
  readonly mode = "manual" as const;

  async submitOrder(payload: TireSupplierOrderPayload): Promise<TireSupplierOrderResult> {
    // eslint-disable-next-line no-console -- intentional audit trail until live API
    console.info("[WeldonTire/manual] Supplier order payload:", JSON.stringify(payload, null, 2));

    return {
      mode: "manual",
      message:
        "No Weldon API configured. Place this order manually in the Weldon wholesale portal " +
        "(weldontire.net) using the tire specs above. Set WELDON_API_KEY or connect via " +
        "Tireweb/Tirewire when your commercial account supports programmatic ordering.",
    };
  }
}

/** Placeholder for a future live provider (Tirewire Connections Center, EDI, etc.). */
class LiveWeldonProvider implements WeldonTireProvider {
  readonly mode = "live" as const;

  constructor(private cfg: { apiKey: string; baseUrl: string }) {}

  async submitOrder(payload: TireSupplierOrderPayload): Promise<TireSupplierOrderResult> {
    // Real integration TBD — partner onboarding required.
    const res = await fetch(`${this.cfg.baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Weldon order failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { orderRef?: string; orderId?: string };
    return {
      mode: "live",
      orderRef: json.orderRef ?? json.orderId,
      message: "Order submitted to Weldon.",
    };
  }
}

let cached: WeldonTireProvider | null = null;

/** Resolve Weldon provider: live when WELDON_API_KEY is set, else manual stub. */
export function getWeldonTire(): WeldonTireProvider {
  if (cached) return cached;

  const apiKey = process.env.WELDON_API_KEY?.trim();
  const baseUrl = process.env.WELDON_API_BASE_URL?.trim() || "https://api.example-weldon-placeholder.com";

  if (apiKey) {
    cached = new LiveWeldonProvider({ apiKey, baseUrl });
  } else {
    cached = new ManualWeldonProvider();
  }
  return cached;
}
