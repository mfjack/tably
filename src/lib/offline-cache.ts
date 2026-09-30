export const OFFLINE_QUERY_CACHE_KEY = "tably-query-cache";

const PRECACHE_NAME_PREFIX = "serwist-precache";

export async function clearOfflineCaches() {
  window.localStorage.removeItem(OFFLINE_QUERY_CACHE_KEY);

  if (!("caches" in window)) return;

  const cacheNames = await window.caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => !cacheName.startsWith(PRECACHE_NAME_PREFIX))
      .map((cacheName) => window.caches.delete(cacheName)),
  );
}
