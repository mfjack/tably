export function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  );
}
