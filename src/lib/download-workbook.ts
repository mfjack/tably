import type { Workbook } from "exceljs";
import { downloadFile } from "./download-file";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function downloadWorkbook(
  workbook: Workbook,
  fileName: string,
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(new Blob([buffer], { type: EXCEL_MIME_TYPE }), fileName);
}
