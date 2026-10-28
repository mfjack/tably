"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type Control,
  type DefaultValues,
  type UseFormSetValue,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { AutocompleteField } from "@/components/form/autocomplete-field";
import { DateField } from "@/components/form/date-field";
import { FilePickerField } from "@/components/form/file-picker-field";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { MAX_FINANCIAL_DOCUMENT_SIZE_IN_MEGABYTES } from "@/features/finance/documents";
import { useAddFinancialEntryAttachmentsMutation } from "@/features/finance/hooks/use-add-financial-entry-attachments-mutation";
import type { FinancialEntryId } from "@/features/finance/types";
import { useCreateIngredientsMutation } from "@/features/ingredients/hooks/use-create-ingredients-mutation";
import {
  getUnitSymbol,
  MEASURE_UNIT_OPTIONS,
  toSelectableMeasureUnit,
} from "@/features/ingredients/measure-units";
import {
  type IngredientsCreateFormInput,
  ingredientsCreateFormSchema,
} from "@/features/ingredients/schemas";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useSupplierOptions } from "@/features/suppliers/hooks/use-supplier-options";
import { formatCurrency } from "@/lib/format";
import { toSelectFieldValue } from "@/lib/optional-select-value";
import { LastPurchaseNote } from "./last-purchase-note";
import { StockEntryProjectionSummary } from "./stock-entry-projection-summary";

type NewIngredientInput = IngredientsCreateFormInput["ingredients"][number];

const EMPTY_INGREDIENT = {
  name: "",
  expiresAt: "",
} as NewIngredientInput;

function buildDefaultValues(
  initialIngredient: Ingredient | null,
): DefaultValues<IngredientsCreateFormInput> {
  return {
    supplierId: toSelectFieldValue(initialIngredient?.supplierId ?? null),
    paymentDueDate: "",
    ingredients: [{ ...EMPTY_INGREDIENT, name: initialIngredient?.name ?? "" }],
  };
}

function toAmount(value: number | undefined): number {
  return Number.isFinite(value) ? (value ?? 0) : 0;
}

function normalizeIngredientName(name: string): string {
  return name.trim().toLocaleLowerCase("pt-BR");
}

type NewIngredientFieldsProps = {
  control: Control<IngredientsCreateFormInput>;
  setValue: UseFormSetValue<IngredientsCreateFormInput>;
  index: number;
  ingredientNames: readonly string[];
  ingredientsByName: ReadonlyMap<string, Ingredient>;
  isOnlyIngredient: boolean;
  onRemove: () => void;
};

function NewIngredientFields({
  control,
  setValue,
  index,
  ingredientNames,
  ingredientsByName,
  isOnlyIngredient,
  onRemove,
}: NewIngredientFieldsProps) {
  const [name, unit, quantity, totalCost] = useWatch({
    control,
    name: [
      `ingredients.${index}.name`,
      `ingredients.${index}.unit`,
      `ingredients.${index}.quantity`,
      `ingredients.${index}.totalCost`,
    ],
  });
  const existingIngredient = ingredientsByName.get(
    normalizeIngredientName(name ?? ""),
  );
  const unitSymbol = existingIngredient
    ? getUnitSymbol(existingIngredient.unit)
    : unit
      ? getUnitSymbol(unit)
      : undefined;
  const ingredientNumber = index + 1;

  useEffect(() => {
    setValue(`ingredients.${index}.ingredientId`, existingIngredient?.id);
    if (existingIngredient) {
      setValue(
        `ingredients.${index}.unit`,
        toSelectableMeasureUnit(existingIngredient.unit) ?? "unit",
      );
    }
  }, [existingIngredient, index, setValue]);

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <AutocompleteField
            control={control}
            name={`ingredients.${index}.name`}
            label={`Insumo ${ingredientNumber}`}
            isLabelHidden
            placeholder="Nome do insumo. Ex.: Leite integral"
            suggestions={ingredientNames}
            description={
              existingIngredient
                ? "Já cadastrado: a compra entra no estoque dele."
                : undefined
            }
          />
        </div>
        <Button
          type="button"
          variant="destructive"
          size="icon-lg"
          className="mt-1"
          aria-label={`Remover insumo ${ingredientNumber}`}
          disabled={isOnlyIngredient}
          onClick={onRemove}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <NumberField
          control={control}
          name={`ingredients.${index}.quantity`}
          label="Quantidade"
          format="quantity"
          suffix={unitSymbol}
          placeholder="Ex.: 12"
        />
        <SelectField
          control={control}
          name={`ingredients.${index}.unit`}
          label="Unidade"
          placeholder="Selecione"
          options={MEASURE_UNIT_OPTIONS}
          isDisabled={Boolean(existingIngredient)}
        />
        <NumberField
          control={control}
          name={`ingredients.${index}.totalCost`}
          label="Valor pago"
          format="currency"
          placeholder="Ex.: $ 60,00"
        />
        {!existingIngredient && (
          <NumberField
            control={control}
            name={`ingredients.${index}.minimumStock`}
            label="Estoque mínimo (opcional)"
            format="quantity"
            suffix={unitSymbol}
            placeholder="Ex.: 4"
          />
        )}
        <DateField
          control={control}
          name={`ingredients.${index}.expiresAt`}
          label="Validade (opcional)"
          placeholder="Escolha a data"
        />
      </div>
      {existingIngredient?.lastPurchase && (
        <LastPurchaseNote
          lastPurchase={existingIngredient.lastPurchase}
          unit={existingIngredient.unit}
          quantity={toAmount(quantity)}
          totalCost={toAmount(totalCost)}
        />
      )}
      {existingIngredient && (
        <StockEntryProjectionSummary
          ingredient={existingIngredient}
          quantity={toAmount(quantity)}
          totalCost={toAmount(totalCost)}
        />
      )}
    </li>
  );
}

type PurchaseDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  ingredients: readonly Ingredient[];
  initialIngredient?: Ingredient | null;
  onClose: () => void;
};

export function PurchaseDialog({
  organizationId,
  isOpen,
  ingredients: registeredIngredients,
  initialIngredient = null,
  onClose,
}: PurchaseDialogProps) {
  const createIngredientsMutation =
    useCreateIngredientsMutation(organizationId);
  const { supplierOptions, hasSuppliers } = useSupplierOptions(
    organizationId,
    isOpen,
  );
  const uploadMutation =
    useAddFinancialEntryAttachmentsMutation(organizationId);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const form = useForm<IngredientsCreateFormInput>({
    resolver: zodResolver(ingredientsCreateFormSchema),
    defaultValues: buildDefaultValues(null),
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });
  const ingredients = useWatch({ control: form.control, name: "ingredients" });
  const hasManyIngredients = fields.length > 1;
  const purchasableIngredients = useMemo(
    () => registeredIngredients.filter((ingredient) => !ingredient.isPrepared),
    [registeredIngredients],
  );
  const ingredientsByName = useMemo(
    () =>
      new Map(
        purchasableIngredients.map((ingredient) => [
          normalizeIngredientName(ingredient.name),
          ingredient,
        ]),
      ),
    [purchasableIngredients],
  );
  const ingredientNames = useMemo(
    () =>
      purchasableIngredients
        .map((ingredient) => ingredient.name)
        .sort((first, second) => first.localeCompare(second, "pt-BR")),
    [purchasableIngredients],
  );
  const total = (ingredients ?? []).reduce(
    (sum, ingredient) => sum + toAmount(ingredient?.totalCost),
    0,
  );

  useEffect(() => {
    if (!isOpen) return;
    form.reset(buildDefaultValues(initialIngredient));
    setFiles([]);
    setFileError(null);
    createIngredientsMutation.reset();
    uploadMutation.reset();
  }, [
    isOpen,
    initialIngredient,
    form,
    createIngredientsMutation.reset,
    uploadMutation.reset,
  ]);

  const handleSubmit = form.handleSubmit((values) => {
    const successMessage = values.ingredients.some(
      (ingredient) => !ingredient.ingredientId,
    )
      ? "Compra registrada e insumos cadastrados."
      : "Compra registrada.";
    createIngredientsMutation.mutate(values, {
      onSuccess: (entryId) =>
        attachFiles(entryId, () => {
          toast.success(successMessage);
          onClose();
        }),
      onError: (error) => toast.error(error.message),
    });
  });

  function attachFiles(entryId: FinancialEntryId, onDone: () => void) {
    if (files.length === 0) {
      onDone();
      return;
    }
    uploadMutation.mutate(
      { entryId, files },
      {
        onSuccess: onDone,
        onError: (error) => {
          toast.error(
            `Compra registrada, mas o boleto não foi enviado: ${error.message} Anexe pelo menu da conta no Financeiro.`,
          );
          onClose();
        },
      },
    );
  }

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={initialIngredient ? "Registrar compra" : "Novo insumo"}
      description="Informe o que você comprou. Se o insumo já existir, a compra entra no estoque dele. O custo é calculado automaticamente, e tudo vai para o Financeiro numa conta só."
      submitLabel={initialIngredient ? "Registrar" : "Cadastrar"}
      isSubmitting={
        createIngredientsMutation.isPending || uploadMutation.isPending
      }
      onSubmit={handleSubmit}
      size="extraLarge"
    >
      <FieldGroup>
        <div className="grid items-start gap-5 sm:grid-cols-2 md:grid-cols-3">
          <SelectField
            control={form.control}
            name="supplierId"
            label="Fornecedor"
            options={supplierOptions}
            description={
              hasSuppliers
                ? undefined
                : "Cadastre fornecedores no módulo Fornecedores para vinculá-los."
            }
          />
          <DateField
            control={form.control}
            name="paymentDueDate"
            label="Data de pagamento"
            placeholder="Escolha a data"
          />
          <FilePickerField
            label="Boleto, nota ou comprovante (opcional)"
            files={files}
            error={fileError}
            maxSizeInMegabytes={MAX_FINANCIAL_DOCUMENT_SIZE_IN_MEGABYTES}
            isLabelVisible
            isMultiple
            isCompact
            onFilesChange={(selectedFiles, error) => {
              setFiles(selectedFiles);
              setFileError(error);
            }}
          />
        </div>
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y rounded-xl border">
            {fields.map((field, index) => (
              <NewIngredientFields
                key={field.id}
                control={form.control}
                setValue={form.setValue}
                index={index}
                ingredientNames={ingredientNames}
                ingredientsByName={ingredientsByName}
                isOnlyIngredient={!hasManyIngredients}
                onRemove={() => remove(index)}
              />
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            className="h-10 self-start"
            onClick={() => append(EMPTY_INGREDIENT)}
          >
            <Plus aria-hidden />
            Adicionar insumo
          </Button>
        </div>
        <div className="flex items-baseline justify-between rounded-xl bg-muted/50 px-4 py-3">
          <span className="text-muted-foreground text-sm">Total da compra</span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
      </FieldGroup>
    </FormDialog>
  );
}
