import { type ActionResult, unwrapActionResult } from "@/lib/action-result";

export type ActionData<
  TAction extends (...args: never[]) => Promise<ActionResult<unknown>>,
> = Extract<Awaited<ReturnType<TAction>>, { status: "success" }>["data"];

const REQUEST_FAILED_MESSAGE = "Não foi possível carregar os dados.";

export async function fetchActionResult<TData>(path: string): Promise<TData> {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(REQUEST_FAILED_MESSAGE);
  }

  const result: ActionResult<TData> = await response.json();
  return unwrapActionResult(result);
}
