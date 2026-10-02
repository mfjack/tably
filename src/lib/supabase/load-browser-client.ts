export async function loadBrowserClient() {
  const { createClient } = await import("./client");
  return createClient();
}
