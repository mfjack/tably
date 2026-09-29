const PRINT_CLEANUP_DELAY_IN_MS = 1000;

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

export function printHtml(html: string): void {
  const printFrame = document.createElement("iframe");
  printFrame.setAttribute("aria-hidden", "true");
  printFrame.style.position = "fixed";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  document.body.appendChild(printFrame);

  const frameWindow = printFrame.contentWindow;
  if (!frameWindow) {
    printFrame.remove();
    return;
  }

  frameWindow.document.open();
  frameWindow.document.write(html);
  frameWindow.document.close();
  frameWindow.focus();
  frameWindow.print();

  setTimeout(() => printFrame.remove(), PRINT_CLEANUP_DELAY_IN_MS);
}
