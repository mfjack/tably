import { EMPLOYMENT_TYPE_LABELS } from "@/features/employees/labels";
import type { Employee, WorkSchedule } from "@/features/employees/types";
import {
  describeScheduleDay,
  getWeekdayShortLabel,
} from "@/features/employees/work-schedule-labels";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import { downloadFile } from "@/lib/download-file";
import { formatDateKey } from "@/lib/format";
import { formatCbo, formatCnpj, formatCpf, formatPis } from "@/lib/masks";
import { TIME_OFF_KIND_LABELS } from "./labels";
import {
  formatMinutes,
  formatMonthLabel,
  formatSignedMinutes,
  getZonedParts,
} from "./time-utils";
import type { Timesheet, TimesheetDay } from "./timesheet";

const PAGE_MARGIN_IN_MM = 12;
const PRIMARY_COLOR: [number, number, number] = [10, 10, 10];
const MUTED_TEXT_COLOR: [number, number, number] = [94, 107, 102];
const SIGNATURE_LINE_WIDTH_IN_MM = 80;
const SIGNATURE_BLOCK_HEIGHT_IN_MM = 40;

type DocumentWithLastTable = {
  lastAutoTable?: { finalY?: number };
};

export type TimesheetExportInput = {
  business: OrderTicketBusiness;
  employee: Employee;
  schedule: WorkSchedule | null;
  timesheet: Timesheet;
  monthKey: string;
  timeZone: string;
};

export function describeDayStatus(day: TimesheetDay): string {
  if (day.kind === "not_employed") return "Fora do contrato";
  if (day.kind === "time_off" && day.timeOffKind) {
    return TIME_OFF_KIND_LABELS[day.timeOffKind];
  }
  if (day.kind === "holiday") return day.holidayName ?? "Feriado";
  const notes = [
    day.isAbsence ? "Falta" : null,
    day.lateMinutes > 0 ? `Atraso ${formatMinutes(day.lateMinutes)}` : null,
    day.earlyLeaveMinutes > 0
      ? `Saída antecipada ${formatMinutes(day.earlyLeaveMinutes)}`
      : null,
    day.hasOddPunches ? "Marcação incompleta" : null,
    day.breakShortfallMinutes > 0
      ? `Intervalo menor ${formatMinutes(day.breakShortfallMinutes)}`
      : null,
    day.hasShortRest ? "Descanso < 11h" : null,
    day.kind === "rest_day" && day.workedMinutes > 0
      ? "Trabalho no descanso"
      : null,
    day.punches.some((punch) => punch.source === "manual") ? "Ajustado" : null,
  ].filter((note) => note !== null);
  if (notes.length > 0) return notes.join(" · ");
  return day.kind === "rest_day" ? "Descanso" : "";
}

function describePunches(day: TimesheetDay): string {
  return day.punches
    .filter((punch) => !punch.voiding)
    .map(
      (punch) =>
        `${punch.localTime}${punch.isNextDay ? "+1" : ""}${punch.source === "manual" ? "*" : ""}`,
    )
    .join("  ");
}

export async function exportTimesheetPdf({
  business,
  employee,
  schedule,
  timesheet,
  monthKey,
  timeZone,
}: TimesheetExportInput): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const document = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const { summary } = timesheet;

  document.setFont("helvetica", "bold");
  document.setFontSize(14);
  document.text(business.name, PAGE_MARGIN_IN_MM, 16);
  document.setFont("helvetica", "normal");
  document.setFontSize(8);
  document.setTextColor(...MUTED_TEXT_COLOR);
  if (business.taxId) {
    document.text(`CNPJ ${formatCnpj(business.taxId)}`, PAGE_MARGIN_IN_MM, 21);
  }
  document.setTextColor(0, 0, 0);
  document.setFont("helvetica", "bold");
  document.setFontSize(12);
  document.text(
    `Espelho de ponto · ${formatMonthLabel(monthKey)}`,
    pageWidth - PAGE_MARGIN_IN_MM,
    16,
    { align: "right" },
  );

  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  const employeeLines = [
    `Funcionário: ${employee.name}`,
    `CPF: ${formatCpf(employee.cpf)}${employee.pis ? `   PIS: ${formatPis(employee.pis)}` : ""}`,
    `Cargo: ${employee.jobTitle}${employee.cbo ? ` · CBO ${formatCbo(employee.cbo)}` : ""} (${EMPLOYMENT_TYPE_LABELS[employee.employmentType]})   Admissão: ${formatDateKey(employee.admissionDate)}`,
    `Jornada: ${
      schedule
        ? `${schedule.name} · ${schedule.days
            .map(
              (day) =>
                `${getWeekdayShortLabel(day.weekday)} ${describeScheduleDay(day)}`,
            )
            .join("; ")}`
        : "Sem jornada definida"
    }`,
  ];
  document.text(
    document.splitTextToSize(
      employeeLines.join("\n"),
      pageWidth - PAGE_MARGIN_IN_MM * 2,
    ),
    PAGE_MARGIN_IN_MM,
    29,
  );

  autoTable(document, {
    startY: 50,
    margin: { left: PAGE_MARGIN_IN_MM, right: PAGE_MARGIN_IN_MM },
    head: [
      ["Dia", "Marcações", "Previsto", "Trabalhado", "Saldo", "Ocorrências"],
    ],
    body: timesheet.days.map((day) => [
      `${formatDateKey(day.date).slice(0, 5)} ${getWeekdayShortLabel(day.weekday)}`,
      describePunches(day),
      day.expectedMinutes > 0 ? formatMinutes(day.expectedMinutes) : "",
      day.workedMinutes > 0 ? formatMinutes(day.workedMinutes) : "",
      day.balanceMinutes !== 0 ? formatSignedMinutes(day.balanceMinutes) : "",
      describeDayStatus(day),
    ]),
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 1.2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 48 },
      2: { cellWidth: 16, halign: "right" },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 16, halign: "right" },
    },
  });

  let cursorY =
    ((document as DocumentWithLastTable).lastAutoTable?.finalY ?? 50) + 4;

  autoTable(document, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN_IN_MM, right: PAGE_MARGIN_IN_MM },
    body: [
      [
        "Trabalhado",
        formatMinutes(summary.workedMinutes),
        "Horas extras",
        formatMinutes(summary.overtimeMinutes),
        "Descanso/feriado",
        formatMinutes(summary.restDayWorkedMinutes),
      ],
      [
        "Atrasos e saídas",
        formatMinutes(summary.shortfallMinutes),
        "Faltas",
        `${summary.absenceDays} ${summary.absenceDays === 1 ? "dia" : "dias"}`,
        "Adicional noturno",
        formatMinutes(summary.nightMinutes),
      ],
      [
        "Intervalo não cumprido",
        formatMinutes(summary.breakShortfallMinutes),
        "Saldo do mês",
        formatSignedMinutes(summary.balanceMinutes),
        "Dias com inconsistência",
        summary.inconsistentDays.toString(),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: "bold" },
      2: { fontStyle: "bold" },
      4: { fontStyle: "bold" },
    },
  });

  cursorY =
    ((document as DocumentWithLastTable).lastAutoTable?.finalY ?? cursorY) + 4;

  const adjustedPunches = timesheet.days.flatMap((day) =>
    day.punches
      .filter((punch) => punch.source === "manual" || punch.voiding)
      .map((punch) => [
        formatDateKey(day.date).slice(0, 5),
        `${punch.localTime}${punch.isNextDay ? "+1" : ""}`,
        punch.nsr.toString(),
        punch.voiding ? "Desconsiderada" : "Incluída",
        punch.voiding?.reason ?? punch.reason ?? "",
        (punch.voiding
          ? getZonedParts(punch.voiding.voidedAt, timeZone)
          : getZonedParts(punch.createdAt, timeZone)
        ).date
          .split("-")
          .reverse()
          .join("/"),
      ]),
  );

  if (adjustedPunches.length > 0) {
    autoTable(document, {
      startY: cursorY,
      margin: { left: PAGE_MARGIN_IN_MM, right: PAGE_MARGIN_IN_MM },
      head: [["Dia", "Horário", "NSR", "Ajuste", "Motivo", "Feito em"]],
      body: adjustedPunches,
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.2 },
      headStyles: { fillColor: [80, 80, 80], textColor: 255 },
    });
    cursorY =
      ((document as DocumentWithLastTable).lastAutoTable?.finalY ?? cursorY) +
      4;
  }

  if (cursorY > pageHeight - SIGNATURE_BLOCK_HEIGHT_IN_MM) {
    document.addPage();
    cursorY = 20;
  }

  document.setFontSize(8);
  document.setTextColor(...MUTED_TEXT_COLOR);
  document.text(
    "* marcação incluída por ajuste, com motivo registrado. +1 = horário do dia seguinte.",
    PAGE_MARGIN_IN_MM,
    cursorY + 2,
  );
  document.setTextColor(0, 0, 0);
  document.text(
    "Declaro que as marcações acima correspondem à minha jornada de trabalho no período.",
    PAGE_MARGIN_IN_MM,
    cursorY + 8,
  );

  const signatureY = cursorY + 28;
  document.line(
    PAGE_MARGIN_IN_MM,
    signatureY,
    PAGE_MARGIN_IN_MM + SIGNATURE_LINE_WIDTH_IN_MM,
    signatureY,
  );
  document.line(
    pageWidth - PAGE_MARGIN_IN_MM - SIGNATURE_LINE_WIDTH_IN_MM,
    signatureY,
    pageWidth - PAGE_MARGIN_IN_MM,
    signatureY,
  );
  document.text(employee.name, PAGE_MARGIN_IN_MM, signatureY + 4);
  document.text(
    business.name,
    pageWidth - PAGE_MARGIN_IN_MM - SIGNATURE_LINE_WIDTH_IN_MM,
    signatureY + 4,
  );

  const fileName = employee.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  downloadFile(
    document.output("blob"),
    `espelho-ponto-${fileName}-${monthKey}.pdf`,
  );
}

function toCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function exportPunchesCsv({
  employee,
  timesheet,
  monthKey,
  timeZone,
}: TimesheetExportInput): void {
  const header = [
    "NSR",
    "Data de trabalho",
    "Data",
    "Hora",
    "Origem",
    "Motivo",
    "Desconsiderada",
    "Motivo da desconsideração",
    "Código de verificação",
  ];
  const rows = timesheet.days.flatMap((day) =>
    day.punches.map((punch) => {
      const zoned = getZonedParts(punch.punchedAt, timeZone);
      return [
        punch.nsr.toString(),
        formatDateKey(day.date),
        formatDateKey(zoned.date),
        `${zoned.time}:${zoned.seconds}`,
        punch.source === "manual" ? "Ajuste" : "Relógio",
        punch.reason ?? "",
        punch.voiding ? "Sim" : "Não",
        punch.voiding?.reason ?? "",
        punch.hash,
      ];
    }),
  );
  const csv = [header, ...rows]
    .map((row) => row.map(toCsvCell).join(";"))
    .join("\r\n");
  downloadFile(
    new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }),
    `marcacoes-${employee.cpf}-${monthKey}.csv`,
  );
}
