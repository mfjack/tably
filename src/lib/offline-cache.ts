export const OFFLINE_QUERY_STORAGE_PREFIX = "tably-query";

const PRECACHE_NAME_PREFIX = "serwist-precache";

function removeStoredQueries() {
  const storedKeys = Array.from(
    { length: window.localStorage.length },
    (_, index) => window.localStorage.key(index),
  );

  for (const storedKey of storedKeys) {
    if (storedKey?.startsWith(OFFLINE_QUERY_STORAGE_PREFIX)) {
      window.localStorage.removeItem(storedKey);
    }
  }
}

export async function clearOfflineCaches() {
  removeStoredQueries();

  if (!("caches" in window)) return;

  const cacheNames = await window.caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => !cacheName.startsWith(PRECACHE_NAME_PREFIX))
      .map((cacheName) => window.caches.delete(cacheName)),
  );
}
