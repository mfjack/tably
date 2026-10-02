import "server-only";

import {
  type DehydratedState,
  dehydrate,
  QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { type ActionResult, unwrapActionResult } from "@/lib/action-result";

export type ActionQuery = {
  queryKey: QueryKey;
  action: () => Promise<ActionResult<unknown>>;
};

export async function prefetchActionQueries(
  queries: readonly ActionQuery[],
): Promise<DehydratedState> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await Promise.all(
    queries.map(({ queryKey, action }) =>
      queryClient.prefetchQuery({
        queryKey,
        queryFn: () => action().then(unwrapActionResult),
      }),
    ),
  );

  return dehydrate(queryClient);
}
