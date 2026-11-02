export const NETWORK_TIMEOUT_IN_MS = 10_000;

export class NetworkTimeoutError extends Error {
  constructor() {
    super("A internet está lenta ou fora do ar.");
    this.name = "NetworkTimeoutError";
  }
}

export function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    error instanceof NetworkTimeoutError ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  );
}

export function withNetworkTimeout<TResult>(
  request: Promise<TResult>,
  timeoutInMs = NETWORK_TIMEOUT_IN_MS,
): Promise<TResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new NetworkTimeoutError()),
      timeoutInMs,
    );
  });
  return Promise.race([request, timeout]).finally(() =>
    clearTimeout(timeoutId),
  );
}
