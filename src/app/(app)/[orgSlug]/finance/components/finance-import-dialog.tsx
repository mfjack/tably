"use client";

import { Download, FileUp } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadFinanceImportTemplate } from "@/features/finance/export-finance-excel";
import { useImportFinanceEntriesMutation } from "@/features/finance/hooks/use-import-finance-entries-mutation";
import { usePreviewFinanceImportMutation } from "@/features/finance/hooks/use-preview-finance-import-mutation";
import type { FinanceImportPreviewRow } from "@/features/finance/import/actions";
import {
  type ParsedFinanceRow,
  parseFinanceExcel,
} from "@/features/finance/import/parse-finance-excel";
import type { FinanceImportRow } from "@/features/finance/import/schemas";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency, formatDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";

const EXCEL_ACCEPT =
  ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type ImportPreview = {
  fileName: string;
  rows: ParsedFinanceRow[];
  checks: ReadonlyMap<number, FinanceImportPreviewRow>;
};

type FinanceImportDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  onClose: () => void;
};

function getValidInputs(rows: readonly ParsedFinanceRow[]): FinanceImportRow[] {
  return rows.flatMap((row) => (row.status === "valid" ? [row.input] : []));
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function describeWarnings(check: FinanceImportPreviewRow | undefined): string {
  if (!check) return "";
  return [
    check.hasUnknownCategory && "categoria não encontrada",
    check.hasUnknownSupplier && "fornecedor não encontrado",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function FinanceImportDialog({
  organizationId,
  isOpen,
  onClose,
}: FinanceImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewMutation = usePreviewFinanceImportMutation(organizationId);
  const importMutation = useImportFinanceEntriesMutation(organizationId);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const validInputs = preview ? getValidInputs(preview.rows) : [];
  const duplicateCount = preview
    ? [...preview.checks.values()].filter((check) => check.isDuplicate).length
    : 0;
  const invalidCount = preview
    ? preview.rows.filter((row) => row.status === "invalid").length
    : 0;
  const newCount = validInputs.length - duplicateCount;

  function closeDialog() {
    setPreview(null);
    setErrorMessage(null);
    onClose();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsReading(true);
    setErrorMessage(null);
    setPreview(null);
    const sheet = await parseFinanceExcel(file);
    if (sheet.error) {
      setIsReading(false);
      setErrorMessage(sheet.error);
      return;
    }

    const validRowNumbers = sheet.rows.flatMap((row) =>
      row.status === "valid" ? [row.rowNumber] : [],
    );
    const inputs = getValidInputs(sheet.rows);
    if (inputs.length === 0) {
      setIsReading(false);
      setPreview({ fileName: file.name, rows: sheet.rows, checks: new Map() });
      return;
    }
    previewMutation.mutate(inputs, {
      onSuccess: (checks) =>
        setPreview({
          fileName: file.name,
          rows: sheet.rows,
          checks: new Map(
            checks.map((check, index) => [validRowNumbers[index], check]),
          ),
        }),
      onError: (error) => setErrorMessage(error.message),
      onSettled: () => setIsReading(false),
    });
  }

  function importEntries() {
    importMutation.mutate(validInputs, {
      onSuccess: ({ importedCount, duplicateCount: skippedCount }) => {
        toast.success(
          `${pluralize(importedCount, "lançamento importado", "lançamentos importados")}.`,
          skippedCount > 0
            ? {
                description: `${pluralize(skippedCount, "já existia e foi ignorado", "já existiam e foram ignorados")}.`,
              }
            : undefined,
        );
        closeDialog();
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && closeDialog()}
      title="Importar do Excel"
      size="large"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            onClick={closeDialog}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            disabled={newCount <= 0}
            isLoading={importMutation.isPending}
            onClick={importEntries}
          >
            {newCount > 0
              ? `Importar ${pluralize(newCount, "lançamento", "lançamentos")}`
              : "Importar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Use o modelo ou um Excel baixado do Financeiro. Cada linha vira uma
          conta com vencimento, valor e tipo (Despesa ou Receita). Preencha
          "Pago em" para lançar como paga. Lançamentos que já existem são
          ignorados.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={EXCEL_ACCEPT}
          className="sr-only"
          aria-label="Planilha do Excel"
          onChange={(event) => void handleFileChange(event)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            isLoading={isReading}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp aria-hidden />
            {preview ? "Escolher outra planilha" : "Escolher planilha"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void downloadFinanceImportTemplate()}
          >
            <Download aria-hidden />
            Baixar modelo
          </Button>
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {preview && (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              <span className="font-medium">{preview.fileName}</span>
              <span className="text-muted-foreground">
                {" "}
                · {pluralize(newCount, "novo", "novos")}
                {duplicateCount > 0 && ` · ${duplicateCount} já existem`}
                {invalidCount > 0 &&
                  ` · ${pluralize(invalidCount, "com erro", "com erro")}`}
              </span>
            </p>
            <ul className="flex max-h-80 flex-col divide-y overflow-y-auto rounded-xl border">
              {preview.rows.map((row) => {
                const check = preview.checks.get(row.rowNumber);
                const warnings = describeWarnings(check);
                return (
                  <li
                    key={row.rowNumber}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-2.5",
                      (row.status === "invalid" || check?.isDuplicate) &&
                        "opacity-60",
                    )}
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">
                        {row.status === "valid"
                          ? row.input.description
                          : row.description}
                      </span>
                      <span
                        className={cn(
                          "truncate text-xs",
                          row.status === "invalid"
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        Linha {row.rowNumber}
                        {row.status === "invalid"
                          ? ` · ${row.error}`
                          : ` · vence ${formatDateKey(row.input.dueDate)}${row.input.paidAt ? " · paga" : ""}${warnings ? ` · ${warnings}` : ""}`}
                      </span>
                    </div>
                    {row.status === "valid" && (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-medium text-sm tabular-nums">
                          {row.input.kind === "income" ? "+ " : "− "}
                          {formatCurrency(row.input.amount)}
                        </span>
                        {check?.isDuplicate && (
                          <Badge variant="outline">Já existe</Badge>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </DetailsDialog>
  );
}
