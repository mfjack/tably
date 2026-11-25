import "server-only";

import * as z from "zod";

const ASAAS_SANDBOX_API_URL = "https://api-sandbox.asaas.com/v3";
const CIELO_PRODUCTION_API_URL = "https://api.cielo.com.br/order-management/v1";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  ASAAS_API_KEY: z.string().min(1).optional(),
  ASAAS_API_URL: z.url().default(ASAAS_SANDBOX_API_URL),
  ASAAS_WEBHOOK_TOKEN: z.string().min(1).optional(),
  CIELO_CLIENT_ID: z.string().min(1).optional(),
  CIELO_ACCESS_TOKEN: z.string().min(1).optional(),
  CIELO_MERCHANT_ID: z.string().min(1).optional(),
  CIELO_API_URL: z.url().default(CIELO_PRODUCTION_API_URL),
});

export const serverEnv = serverEnvSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
  ASAAS_API_KEY: process.env.ASAAS_API_KEY || undefined,
  ASAAS_API_URL: process.env.ASAAS_API_URL || undefined,
  ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN || undefined,
  CIELO_CLIENT_ID: process.env.CIELO_CLIENT_ID || undefined,
  CIELO_ACCESS_TOKEN: process.env.CIELO_ACCESS_TOKEN || undefined,
  CIELO_MERCHANT_ID: process.env.CIELO_MERCHANT_ID || undefined,
  CIELO_API_URL: process.env.CIELO_API_URL || undefined,
});

export function isAsaasConfigured(): boolean {
  return Boolean(
    serverEnv.ASAAS_API_KEY &&
      serverEnv.ASAAS_WEBHOOK_TOKEN &&
      serverEnv.SUPABASE_SECRET_KEY,
  );
}

export function resolveCieloMerchantId(
  organizationMerchantId: string | null,
): string | null {
  if (!serverEnv.CIELO_CLIENT_ID || !serverEnv.CIELO_ACCESS_TOKEN) return null;
  return serverEnv.CIELO_MERCHANT_ID ?? organizationMerchantId;
}
