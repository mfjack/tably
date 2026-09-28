"use server";

import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import type { SupplierId, SupplierSummary } from "./types";

export async function listSupplierSummaries(
  organizationId: OrganizationId,
): Promise<ActionResult<SupplierSummary[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) return actionFailure("Não foi possível carregar os fornecedores.");

  return actionSuccess(
    data.map((supplier) => ({
      id: supplier.id as SupplierId,
      name: supplier.name,
    })),
  );
}
