import { toast } from "sonner";

const STALE_SERVER_ACTION_PATTERN = /Server Action .+ was not found/;
const RELOAD_DELAY_IN_MS = 1500;

export function isStaleDeploymentError(error: unknown): boolean {
  return (
    error instanceof Error && STALE_SERVER_ACTION_PATTERN.test(error.message)
  );
}

function reloadPage() {
  window.location.reload();
}

export function reloadForNewDeployment() {
  toast.info("O Tably foi atualizado. Recarregando a página…");
  window.setTimeout(reloadPage, RELOAD_DELAY_IN_MS);
}
