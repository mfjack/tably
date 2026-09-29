import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  OPERATOR_SESSION_SECRET: z.string().min(32),
});

export const serverEnv = serverEnvSchema.parse({
  OPERATOR_SESSION_SECRET: process.env.OPERATOR_SESSION_SECRET,
});
