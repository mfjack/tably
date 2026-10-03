import { useQuery } from "@tanstack/react-query";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import type { getPublicLoyaltyBalance } from "../public-actions";
import { LOYALTY_PHONE_PATTERN } from "../schemas";

export function getPublicLoyaltyBalanceQueryKey(
  menuSlug: string,
  phone: string,
) {
  return ["public-loyalty", menuSlug, phone] as const;
}

export function usePublicLoyaltyBalanceQuery(menuSlug: string, phone: string) {
  return useQuery({
    queryKey: getPublicLoyaltyBalanceQueryKey(menuSlug, phone),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof getPublicLoyaltyBalance>>(
        `/api/public/loyalty/${menuSlug}?${new URLSearchParams({ phone }).toString()}`,
      ),
    enabled: LOYALTY_PHONE_PATTERN.test(phone),
    staleTime: 0,
  });
}
