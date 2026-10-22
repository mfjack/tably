import { toast } from "sonner";

export async function copyToClipboard(
  text: string,
  successMessage: string,
  errorMessage = "Não foi possível copiar.",
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error(errorMessage);
  }
}
