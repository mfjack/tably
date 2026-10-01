import { toast } from "sonner";

const PRINT_ROOT_ID = "tably-print-root";
const PRINT_STYLE_ID = "tably-print-style";
const AFTER_PRINT_CLEANUP_DELAY_IN_MS = 500;
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

function removePrintArtifacts() {
  document.getElementById(PRINT_ROOT_ID)?.remove();
  document.getElementById(PRINT_STYLE_ID)?.remove();
}

function buildPrintStyles(ticketStyles: string): string {
  return `
@media screen {
  #${PRINT_ROOT_ID} { display: none !important; }
}
@media print {
  body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
  html, body { background: #fff !important; height: auto !important; min-height: 0 !important; }
  ${ticketStyles}
}`;
}

export function printHtml(html: string): void {
  removePrintArtifacts();

  const ticketDocument = new DOMParser().parseFromString(html, "text/html");
  const ticketStyles = Array.from(ticketDocument.querySelectorAll("style"))
    .map((style) => style.textContent ?? "")
    .join("\n");

  const printStyle = document.createElement("style");
  printStyle.id = PRINT_STYLE_ID;
  printStyle.textContent = buildPrintStyles(ticketStyles);

  const printRoot = document.createElement("div");
  printRoot.id = PRINT_ROOT_ID;
  printRoot.setAttribute("aria-hidden", "true");
  printRoot.innerHTML = ticketDocument.body.innerHTML;

  document.head.appendChild(printStyle);
  document.body.appendChild(printRoot);

  let isCleanedUp = false;

  function cleanUp() {
    if (isCleanedUp) return;
    isCleanedUp = true;
    window.removeEventListener("afterprint", handleAfterPrint);
    removePrintArtifacts();
  }

  function handleAfterPrint() {
    setTimeout(cleanUp, AFTER_PRINT_CLEANUP_DELAY_IN_MS);
  }

  window.addEventListener("afterprint", handleAfterPrint);
  setTimeout(cleanUp, FALLBACK_CLEANUP_DELAY_IN_MS);

  try {
    window.print();
  } catch {
    cleanUp();
    toast.error(PRINT_FAILURE_MESSAGE);
  }
}
