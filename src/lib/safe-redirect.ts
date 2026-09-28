const DEFAULT_REDIRECT_PATH = "/";

export function getSafeRedirectPath(
  path: unknown,
  fallbackPath = DEFAULT_REDIRECT_PATH,
): string {
  if (typeof path !== "string") return fallbackPath;

  const isInternalPath =
    path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");

  return isInternalPath ? path : fallbackPath;
}
