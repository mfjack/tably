import "server-only";

import * as z from "zod";

const ASAAS_SANDBOX_API_URL = "https://api-sandbox.asaas.com/v3";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  ASAAS_API_KEY: z.string().min(1).optional(),
  ASAAS_API_URL: z.url().default(ASAAS_SANDBOX_API_URL),
  ASAAS_WEBHOOK_TOKEN: z.string().min(1).optional(),
});

export const serverEnv = serverEnvSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
  ASAAS_API_KEY: process.env.ASAAS_API_KEY || undefined,
  ASAAS_API_URL: process.env.ASAAS_API_URL || undefined,
  ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN || undefined,
});

export function isAsaasConfigured(): boolean {
  return Boolean(
    serverEnv.ASAAS_API_KEY &&
      serverEnv.ASAAS_WEBHOOK_TOKEN &&
      serverEnv.SUPABASE_SECRET_KEY,
  );
}
