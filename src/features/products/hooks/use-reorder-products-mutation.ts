import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { reorderProducts } from "../actions";
import type { Product, ProductId } from "../types";
import { getProductsQueryKey } from "./use-products-query";

export function getReorderProductsMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "products", "reorder"] as const;
}

function applyProductOrder(
  products: Product[] | undefined,
  productIds: readonly ProductId[],
) {
  if (!products) return products;
  const positions = new Map(
    productIds.map((productId, index) => [productId, index]),
  );
  const reorderedProducts = productIds.flatMap((productId) =>
    products.filter((product) => product.id === productId),
  );
  let reorderedIndex = 0;
  return products.map((product) =>
    positions.has(product.id)
      ? (reorderedProducts[reorderedIndex++] ?? product)
      : product,
  );
}

export function useReorderProductsMutation(organizationId: OrganizationId) {
  const queryClient = useQueryClient();
  const queryKey = getProductsQueryKey(organizationId);

  return useMutation({
    mutationKey: getReorderProductsMutationKey(organizationId),
    mutationFn: async (productIds: readonly ProductId[]) =>
      unwrapActionResult(await reorderProducts(organizationId, productIds)),
    onMutate: async (productIds) => {
      await queryClient.cancelQueries({ queryKey });
      const previousProducts = queryClient.getQueryData<Product[]>(queryKey);
      queryClient.setQueryData<Product[]>(queryKey, (products) =>
        applyProductOrder(products, productIds),
      );
      return { previousProducts };
    },
    onError: (_error, _productIds, context) =>
      queryClient.setQueryData(queryKey, context?.previousProducts),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
