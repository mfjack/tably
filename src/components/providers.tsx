"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import {
  onlineManager,
  type Query,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { experimental_createQueryPersister } from "@tanstack/react-query-persist-client";
import { type ReactNode, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OFFLINE_QUERY_STORAGE_PREFIX } from "@/lib/offline-cache";

const ONE_MINUTE_IN_MS = 60 * 1000;
const ONE_WEEK_IN_MS = 7 * 24 * 60 * ONE_MINUTE_IN_MS;
const QUERY_CACHE_VERSION = "2";
const OFFLINE_QUERY_RESOURCES: readonly unknown[] = [
  "products",
  "categories",
  "ingredients",
  "customer-accounts",
] as const;

function isOfflineQuery(query: Query) {
  const [scope, , resource] = query.queryKey;
  return (
    scope === "organizations" &&
    query.queryKey.length === 3 &&
    OFFLINE_QUERY_RESOURCES.includes(resource)
  );
}

function createQueryClient() {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser) onlineManager.setOnline(window.navigator.onLine);

  const queryPersister = experimental_createQueryPersister({
    storage: isBrowser ? window.localStorage : undefined,
    prefix: OFFLINE_QUERY_STORAGE_PREFIX,
    buster: QUERY_CACHE_VERSION,
    maxAge: ONE_WEEK_IN_MS,
    filters: { predicate: isOfflineQuery },
  });

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: ONE_MINUTE_IN_MS,
        refetchOnWindowFocus: false,
        networkMode: "offlineFirst",
        persister: queryPersister.persisterFn,
      },
    },
  });
}

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline={false}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
          <Toaster theme="light" richColors position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </SerwistProvider>
  );
}
