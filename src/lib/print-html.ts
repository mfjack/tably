import { toast } from "sonner";

const AFTER_PRINT_CLEANUP_DELAY_IN_MS = 1000;
const FALLBACK_CLEANUP_DELAY_IN_MS = 60_000;
const PRINT_FAILURE_MESSAGE =
  "Não foi possível abrir a impressão. Confira a impressora e tente de novo.";

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

function createPrintFrame(): HTMLIFrameElement {
  const printFrame = document.createElement("iframe");
  printFrame.setAttribute("aria-hidden", "true");
  printFrame.tabIndex = -1;
  printFrame.style.position = "fixed";
  printFrame.style.top = "0";
  printFrame.style.left = "-10000px";
  printFrame.style.width = "80mm";
  printFrame.style.height = "100vh";
  printFrame.style.border = "0";
  return printFrame;
}

export function printHtml(html: string): void {
  const printFrame = createPrintFrame();
  let isRemoved = false;

  function removeFrame() {
    if (isRemoved) return;
    isRemoved = true;
    printFrame.remove();
  }

  function failPrint() {
    removeFrame();
    toast.error(PRINT_FAILURE_MESSAGE);
  }

  printFrame.addEventListener(
    "load",
    () => {
      const frameWindow = printFrame.contentWindow;
      if (!frameWindow) {
        failPrint();
        return;
      }

      frameWindow.addEventListener("afterprint", () =>
        setTimeout(removeFrame, AFTER_PRINT_CLEANUP_DELAY_IN_MS),
      );
      setTimeout(removeFrame, FALLBACK_CLEANUP_DELAY_IN_MS);

      try {
        frameWindow.focus();
        frameWindow.print();
      } catch {
        failPrint();
      }
    },
    { once: true },
  );

  printFrame.srcdoc = html;
  document.body.appendChild(printFrame);
}
