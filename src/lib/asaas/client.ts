import "server-only";

import { serverEnv } from "@/lib/server-env";

export class AsaasError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AsaasError";
  }
}

type AsaasErrorBody = { errors?: { description?: string }[] };

export async function asaasRequest<TResponse>(
  path: string,
  init: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {},
): Promise<TResponse> {
  if (!serverEnv.ASAAS_API_KEY) {
    throw new AsaasError("ASAAS_API_KEY is not configured.", 500);
  }
  const response = await fetch(`${serverEnv.ASAAS_API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Tably",
      access_token: serverEnv.ASAAS_API_KEY,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => null)) as AsaasErrorBody | null;
    throw new AsaasError(
      errorBody?.errors?.[0]?.description ?? response.statusText,
      response.status,
    );
  }
  return (await response.json()) as TResponse;
}
