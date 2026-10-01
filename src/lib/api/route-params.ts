import "server-only";

import { z } from "zod";

export const yearSchema = z.coerce.number().int().min(2000).max(2100);
