import { useMemo } from "react";
import type { SelectOption } from "@/components/form/select-field";
import type { OrganizationId } from "@/features/organizations/types";
import { NO_SUPPLIER_VALUE } from "../supplier-options";
import { useSupplierSummariesQuery } from "./use-supplier-summaries-query";

export function useSupplierOptions(
  organizationId: OrganizationId,
  isEnabled: boolean,
) {
  const suppliersQuery = useSupplierSummariesQuery(organizationId, isEnabled);

  const supplierOptions = useMemo<SelectOption[]>(
    () => [
      { value: NO_SUPPLIER_VALUE, label: "Sem fornecedor" },
      ...(suppliersQuery.data ?? []).map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
    ],
    [suppliersQuery.data],
  );

  return {
    supplierOptions,
    hasSuppliers: (suppliersQuery.data?.length ?? 0) > 0,
  };
}
