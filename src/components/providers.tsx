"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { onlineManager, type Query, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { type ReactNode, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OFFLINE_QUERY_CACHE_KEY } from "@/lib/offline-cache";

const ONE_MINUTE_IN_MS = 60 * 1000;
const ONE_WEEK_IN_MS = 7 * 24 * 60 * ONE_MINUTE_IN_MS;
const QUERY_CACHE_VERSION = "1";
const OFFLINE_QUERY_RESOURCES: readonly unknown[] = [
  "products",
  "categories",
  "ingredients",
  "customer-accounts",
] as const;

function createQueryClient() {
  if (typeof window !== "undefined") {
    onlineManager.setOnline(window.navigator.onLine);
  }

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: ONE_MINUTE_IN_MS,
        gcTime: ONE_WEEK_IN_MS,
        refetchOnWindowFocus: false,
      },
    },
  });
}

function createQueryPersister() {
  return createSyncStoragePersister({
    key: OFFLINE_QUERY_CACHE_KEY,
    storage: typeof window === "undefined" ? undefined : window.localStorage,
  });
}

function shouldPersistQuery(query: Query) {
  const [scope, , resource] = query.queryKey;
  return (
    query.state.status === "success" &&
    scope === "organizations" &&
    query.queryKey.length === 3 &&
    OFFLINE_QUERY_RESOURCES.includes(resource)
  );
}

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(createQueryClient);
  const [queryPersister] = useState(createQueryPersister);

  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline={false}
    >
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: ONE_WEEK_IN_MS,
          buster: QUERY_CACHE_VERSION,
          dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
        }}
      >
        <TooltipProvider>
          {children}
          <Toaster theme="light" richColors position="top-right" />
        </TooltipProvider>
      </PersistQueryClientProvider>
    </SerwistProvider>
  );
}
