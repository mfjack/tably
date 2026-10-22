export const PDF_MUTED_TEXT_COLOR: [number, number, number] = [94, 107, 102];

export async function createA4PdfDocument() {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const document = new jsPDF({ unit: "mm", format: "a4" });

  return {
    document,
    autoTable,
    pageWidth: document.internal.pageSize.getWidth(),
    pageHeight: document.internal.pageSize.getHeight(),
  };
}
