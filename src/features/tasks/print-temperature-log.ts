import { format, parseISO } from "date-fns";
import { escapeHtml, printHtml } from "@/lib/print-html";
import {
  describeTemperatureRange,
  formatTemperature,
  isTemperatureOutOfRange,
} from "./task-temperature";
import type { TemperatureRecord } from "./types";

const TEMPERATURE_LOG_STYLES = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 11px; }
  h1 { font-size: 16px; margin-bottom: 2px; }
  p { margin-bottom: 10px; color: #333; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; }
  th { background: #eee; }
  .out { font-weight: bold; }
  .signature { margin-top: 32px; }
`;

export function printTemperatureLog(
  businessName: string,
  records: readonly TemperatureRecord[],
): void {
  const rows = [...records]
    .reverse()
    .map((record) => {
      const isOut = isTemperatureOutOfRange(record.temperature, record);
      return `<tr${isOut ? ' class="out"' : ""}>
<td>${format(parseISO(record.completedOn), "dd/MM/yyyy")}</td>
<td>${format(new Date(record.completedAt), "HH:mm")}</td>
<td>${escapeHtml(record.taskTitle)}</td>
<td>${escapeHtml(describeTemperatureRange(record))}</td>
<td>${formatTemperature(record.temperature)}${isOut ? " (fora)" : ""}</td>
<td>${escapeHtml(record.operatorName ?? "")}</td>
</tr>`;
    })
    .join("");

  printHtml(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Planilha de temperaturas</title>
<style>${TEMPERATURE_LOG_STYLES}</style>
</head>
<body>
<h1>Planilha de controle de temperatura</h1>
<p>${escapeHtml(businessName)} · impresso em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
<table>
<thead><tr><th>Data</th><th>Hora</th><th>Equipamento</th><th>Limite</th><th>Medida</th><th>Responsável</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<p class="signature">Responsável técnico: ______________________________________</p>
</body>
</html>`);
}
