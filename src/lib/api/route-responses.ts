import "server-only";

import { type ActionResult, actionFailure } from "@/lib/action-result";

export function jsonActionResult<TData>(result: ActionResult<TData>) {
  return Response.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function invalidRequestResponse() {
  return Response.json(actionFailure("Requisição inválida."), {
    status: 400,
  });
}
