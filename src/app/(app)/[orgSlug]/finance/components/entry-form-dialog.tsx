"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { DateField } from "@/components/form/date-field";
import { MaskedField } from "@/components/form/masked-field";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { parseBoleto } from "@/features/finance/boleto";
import { useCreateFinancialEntryMutation } from "@/features/finance/hooks/use-create-financial-entry-mutation";
import { useUpdateFinancialEntryMutation } from "@/features/finance/hooks/use-update-financial-entry-mutation";
import {
  ENTRY_KIND_LABELS,
  RECURRENCE_FREQUENCY_LABELS,
} from "@/features/finance/labels";
import {
  ENTRY_EDIT_SCOPES,
  type EntryEditScope,
  type EntryInput,
  entrySchema,
} from "@/features/finance/schemas";
import type {
  FinancialCategory,
  FinancialEntry,
  FinancialEntryKind,
} from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useSupplierOptions } from "@/features/suppliers/hooks/use-supplier-options";
import { formatCurrency, formatDateKey } from "@/lib/format";
import {
  NONE_SELECT_VALUE,
  toSelectFieldValue,
} from "@/lib/optional-select-value";

const REPEAT_OPTIONS = [
  { value: "none", label: "Não repete" },
  { value: "installments", label: "Parcelado" },
  { value: "recurring", label: "Repete" },
] as const;

const FREQUENCY_OPTIONS = Object.entries(RECURRENCE_FREQUENCY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const BOLETO_LENGTHS = new Set([47, 48]);

export type EntryFormState =
  | { mode: "closed" }
  | { mode: "create"; kind: FinancialEntryKind }
  | { mode: "edit"; entry: FinancialEntry };

type EntryFormDialogProps = {
  organizationId: OrganizationId;
  state: EntryFormState;
  today: string;
  categories: readonly FinancialCategory[];
  onClose: () => void;
};

function getEmptyValues(
  kind: FinancialEntryKind,
  today: string,
): DefaultValues<EntryInput> {
  return {
    kind,
    description: "",
    amount: undefined,
    dueDate: kind === "income" ? today : "",
    categoryId: NONE_SELECT_VALUE,
    supplierId: NONE_SELECT_VALUE,
    digitableLine: "",
    notes: "",
    repeat: "none",
    installmentCount: undefined,
    frequency: undefined,
    endDate: "",
    isPaid: kind === "income",
    paidAt: today,
  };
}

function toFormValues(entry: FinancialEntry): DefaultValues<EntryInput> {
  return {
    kind: entry.kind,
    description: entry.description,
    amount: entry.amount,
    dueDate: entry.dueDate,
    categoryId: toSelectFieldValue(entry.categoryId),
    supplierId: toSelectFieldValue(entry.supplierId),
    digitableLine: entry.digitableLine ?? "",
    notes: entry.notes ?? "",
    repeat: "none",
    installmentCount: entry.installmentCount ?? undefined,
    frequency: entry.recurrenceFrequency ?? undefined,
    endDate: entry.recurrenceEndDate ?? "",
    isPaid: false,
    paidAt: "",
  };
}

export function EntryFormDialog({
  organizationId,
  state,
  today,
  categories,
  onClose,
}: EntryFormDialogProps) {
  const isOpen = state.mode !== "closed";
  const kind =
    state.mode === "create"
      ? state.kind
      : state.mode === "edit"
        ? state.entry.kind
        : "expense";
  const editingEntry = state.mode === "edit" ? state.entry : null;
  const scopeId = useId();
  const [scope, setScope] = useState<EntryEditScope>("single");
  const createMutation = useCreateFinancialEntryMutation(organizationId);
  const updateMutation = useUpdateFinancialEntryMutation(organizationId);
  const { supplierOptions, hasSuppliers } = useSupplierOptions(
    organizationId,
    isOpen && kind === "expense",
  );
  const form = useForm<EntryInput>({
    resolver: zodResolver(entrySchema),
    defaultValues: getEmptyValues("expense", today),
  });
  const [repeat, isPaid, digitableLine, amount, installmentCount] = useWatch({
    control: form.control,
    name: ["repeat", "isPaid", "digitableLine", "amount", "installmentCount"],
  });
  const lastParsedLineRef = useRef("");

  const categoryOptions = useMemo(
    () => [
      { value: NONE_SELECT_VALUE, label: "Sem categoria" },
      ...categories
        .filter(
          (category) =>
            category.kind === kind &&
            (!category.isArchived || category.id === editingEntry?.categoryId),
        )
        .map((category) => ({ value: category.id, label: category.name })),
    ],
    [categories, kind, editingEntry?.categoryId],
  );

  useEffect(() => {
    if (state.mode === "closed") return;
    form.reset(
      state.mode === "edit"
        ? toFormValues(state.entry)
        : getEmptyValues(state.kind, today),
    );
    lastParsedLineRef.current =
      state.mode === "edit" ? (state.entry.digitableLine ?? "") : "";
    setScope("single");
    createMutation.reset();
    updateMutation.reset();
  }, [state, today, form, createMutation.reset, updateMutation.reset]);

  useEffect(() => {
    if (!digitableLine || !BOLETO_LENGTHS.has(digitableLine.length)) return;
    if (digitableLine === lastParsedLineRef.current) return;
    lastParsedLineRef.current = digitableLine;

    const result = parseBoleto(digitableLine, today);
    if (result.status === "invalid") {
      form.setError("digitableLine", { message: result.message });
      return;
    }
    form.clearErrors("digitableLine");
    const { amount: boletoAmount, dueDate } = result.boleto;
    if (boletoAmount !== null) {
      form.setValue("amount", boletoAmount, { shouldValidate: true });
    }
    if (dueDate !== null) {
      form.setValue("dueDate", dueDate, { shouldValidate: true });
    }
    const filled = [
      boletoAmount !== null ? formatCurrency(boletoAmount) : null,
      dueDate !== null ? `vencimento ${formatDateKey(dueDate)}` : null,
    ].filter((detail) => detail !== null);
    if (filled.length > 0) {
      toast.success(`Lido do código: ${filled.join(", ")}.`);
    }
  }, [digitableLine, today, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const kindLabel = ENTRY_KIND_LABELS[kind].toLowerCase();

  const handleSubmit = form.handleSubmit((values) => {
    const callbacks = {
      onSuccess: () => {
        toast.success(
          editingEntry
            ? "Lançamento atualizado."
            : values.repeat === "installments"
              ? `${values.installmentCount} parcelas criadas.`
              : "Lançamento criado.",
        );
        onClose();
      },
      onError: (error: Error) => toast.error(error.message),
    };
    if (editingEntry) {
      updateMutation.mutate(
        { entryId: editingEntry.id, input: values, scope },
        callbacks,
      );
      return;
    }
    createMutation.mutate(
      kind === "income"
        ? { ...values, repeat: "none", isPaid: true, paidAt: values.dueDate }
        : values,
      callbacks,
    );
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={editingEntry ? `Editar ${kindLabel}` : `Nova ${kindLabel}`}
      description={
        kind === "expense"
          ? "Conta a pagar. Cole o código do boleto para preencher valor e vencimento."
          : "Dinheiro que entrou. Fica registrado como recebido nessa data e nessa conta."
      }
      submitLabel={editingEntry ? "Salvar" : "Criar"}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        {kind === "expense" && (
          <MaskedField
            control={form.control}
            name="digitableLine"
            label="Código do boleto (opcional)"
            description="Linha digitável do boleto ou da conta de consumo."
            mask="boleto"
            placeholder="Cole ou digite os números"
            autoComplete="off"
          />
        )}
        <TextField
          control={form.control}
          name="description"
          label="Descrição"
          placeholder={
            kind === "expense"
              ? "Ex.: Aluguel da loja"
              : "Ex.: Evento particular"
          }
          autoComplete="off"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberField
            control={form.control}
            name="amount"
            label={
              repeat === "installments" ? "Valor de cada parcela" : "Valor"
            }
            format="currency"
            placeholder="Ex.: $ 150,00"
          />
          <DateField
            control={form.control}
            name="dueDate"
            label={
              kind === "income"
                ? "Data do recebimento"
                : repeat === "none" || editingEntry
                  ? "Vencimento"
                  : "Primeiro vencimento"
            }
          />
          <SelectField
            control={form.control}
            name="categoryId"
            label="Categoria"
            options={categoryOptions}
          />
          {kind === "expense" && hasSuppliers && (
            <SelectField
              control={form.control}
              name="supplierId"
              label="Fornecedor"
              options={supplierOptions}
            />
          )}
        </div>

        {!editingEntry && kind === "expense" && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                control={form.control}
                name="repeat"
                label="Repetição"
                options={REPEAT_OPTIONS}
              />
              {repeat === "installments" && (
                <NumberField
                  control={form.control}
                  name="installmentCount"
                  label="Número de parcelas"
                  format="integer"
                  placeholder="Ex.: 10"
                />
              )}
              {repeat === "recurring" && (
                <SelectField
                  control={form.control}
                  name="frequency"
                  label="Frequência"
                  options={FREQUENCY_OPTIONS}
                />
              )}
              {repeat === "recurring" && (
                <DateField
                  control={form.control}
                  name="endDate"
                  label="Até (opcional)"
                  description="Vazio: repete sem data para acabar."
                />
              )}
            </div>
            {repeat === "installments" && amount && installmentCount ? (
              <p className="text-muted-foreground text-sm">
                Total: {formatCurrency(amount * installmentCount)}
              </p>
            ) : null}
            <SwitchField
              control={form.control}
              name="isPaid"
              label={kind === "expense" ? "Já foi paga" : "Já foi recebida"}
              description={
                repeat === "none"
                  ? undefined
                  : "Marca só o primeiro vencimento."
              }
            />
            {isPaid && (
              <DateField
                control={form.control}
                name="paidAt"
                label={
                  kind === "expense"
                    ? "Data do pagamento"
                    : "Data do recebimento"
                }
              />
            )}
          </>
        )}

        {editingEntry?.installmentGroupId && (
          <NumberField
            control={form.control}
            name="installmentCount"
            label="Número de parcelas"
            description="Aumentar cria novas parcelas no fim. Diminuir apaga as últimas em aberto."
            format="integer"
            placeholder="Ex.: 10"
          />
        )}

        {(editingEntry?.recurrenceId || editingEntry?.installmentGroupId) && (
          <RadioGroup
            value={scope}
            onValueChange={(value) => {
              const nextScope = ENTRY_EDIT_SCOPES.find(
                (editScope) => editScope === value,
              );
              if (nextScope) setScope(nextScope);
            }}
            className="gap-3 rounded-lg border p-4"
          >
            <p className="font-medium text-sm">
              {editingEntry.recurrenceId
                ? "Essa conta se repete. Aplicar as mudanças em:"
                : "Essa conta é parcelada. Aplicar as mudanças em:"}
            </p>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="single" id={`${scopeId}-single`} />
              <Label htmlFor={`${scopeId}-single`}>
                {editingEntry.recurrenceId
                  ? "Só neste vencimento"
                  : "Só nesta parcela"}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="following" id={`${scopeId}-following`} />
              <Label htmlFor={`${scopeId}-following`}>
                {editingEntry.recurrenceId
                  ? "Neste e nos próximos"
                  : "Nesta e nas próximas"}
              </Label>
            </div>
            <p className="text-muted-foreground text-xs">
              {editingEntry.recurrenceId
                ? "Nos próximos, muda também o dia do vencimento, a frequência e a data de fim."
                : "Nas próximas, muda também o vencimento, mantendo uma por mês."}
            </p>
          </RadioGroup>
        )}

        {editingEntry?.recurrenceId && scope === "following" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              control={form.control}
              name="frequency"
              label="Frequência"
              options={FREQUENCY_OPTIONS}
            />
            <DateField
              control={form.control}
              name="endDate"
              label="Até (opcional)"
              description="Vazio: repete sem data para acabar."
            />
          </div>
        )}

        <TextareaField
          control={form.control}
          name="notes"
          label="Observações"
          placeholder="Ex.: Pagar pelo app do banco"
        />
      </FieldGroup>
    </FormDialog>
  );
}
