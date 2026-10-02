import * as z from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_PRODUCTION_URL: z.url().optional(),
});

const vercelProductionUrl =
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

export const env = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (vercelProductionUrl ? `https://${vercelProductionUrl}` : undefined),
  NEXT_PUBLIC_PRODUCTION_URL:
    process.env.NEXT_PUBLIC_PRODUCTION_URL ??
    (vercelProductionUrl ? `https://${vercelProductionUrl}` : undefined),
});

export const productionSiteUrl =
  env.NEXT_PUBLIC_PRODUCTION_URL ?? env.NEXT_PUBLIC_SITE_URL;
