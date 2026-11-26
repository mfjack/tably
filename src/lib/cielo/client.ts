import "server-only";

import { serverEnv } from "@/lib/server-env";
import type { CieloOrder, CreateCieloOrderInput } from "./types";

export class CieloError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CieloError";
  }
}

const DIACRITICS_PATTERN = /[̀-ͯ]/g;
const NON_PRINTABLE_ASCII_PATTERN = /[^ -~]/g;

export function toCieloText(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .replace(NON_PRINTABLE_ASCII_PATTERN, "")
    .trim();
}

type CieloErrorBody = { detail?: string; error?: string }[] | null;

type CieloRequestInit = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

async function cieloRequest<TResponse>(
  merchantId: string,
  path: string,
  init: CieloRequestInit = {},
): Promise<TResponse | null> {
  if (!serverEnv.CIELO_CLIENT_ID || !serverEnv.CIELO_ACCESS_TOKEN) {
    throw new CieloError("Cielo credentials are not configured.", 500);
  }
  const response = await fetch(`${serverEnv.CIELO_API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "client-id": serverEnv.CIELO_CLIENT_ID,
      "access-token": serverEnv.CIELO_ACCESS_TOKEN,
      "merchant-id": merchantId,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => null)) as CieloErrorBody;
    throw new CieloError(
      errorBody?.[0]?.detail ?? errorBody?.[0]?.error ?? response.statusText,
      response.status,
    );
  }
  const text = await response.text();
  return text ? (JSON.parse(text) as TResponse) : null;
}

export async function createCieloOrder(
  merchantId: string,
  { number, reference, amountInCents, paymentCode }: CreateCieloOrderInput,
): Promise<string> {
  const orderName = toCieloText(reference) || "Pedido";
  const createdOrder = await cieloRequest<{ id: string }>(
    merchantId,
    "/orders",
    {
      method: "POST",
      body: {
        number,
        reference: orderName,
        status: "DRAFT",
        payment_code: paymentCode,
        items: [
          {
            sku: "TABLY",
            name: orderName,
            unit_price: amountInCents,
            quantity: 1,
            unit_of_measure: "EACH",
          },
        ],
        price: amountInCents,
      },
    },
  );
  if (!createdOrder) throw new CieloError("Empty order response.", 502);
  await cieloRequest(
    merchantId,
    `/orders/${encodeURIComponent(createdOrder.id)}?operation=PLACE`,
    { method: "PUT" },
  );
  return createdOrder.id;
}

export async function getCieloOrder(
  merchantId: string,
  orderId: string,
): Promise<CieloOrder> {
  const order = await cieloRequest<CieloOrder>(
    merchantId,
    `/orders/${encodeURIComponent(orderId)}`,
  );
  if (!order) throw new CieloError("Empty order response.", 502);
  return order;
}

export async function closeCieloOrder(
  merchantId: string,
  orderId: string,
): Promise<void> {
  await cieloRequest(
    merchantId,
    `/orders/${encodeURIComponent(orderId)}?operation=CLOSE`,
    { method: "PUT" },
  );
}
