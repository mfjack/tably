"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useState } from "react";
import { type Control, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldGroup } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { normalizeText } from "@/features/purchase-invoices/item-suggestions";
import { useApplyStockCountMutation } from "@/features/stock-counts/hooks/use-apply-stock-count-mutation";
import {
  type StockCountFormInput,
  stockCountFormSchema,
} from "@/features/stock-counts/schemas";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

type StockCountDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  ingredients: readonly Ingredient[];
  onClose: () => void;
};

type StockCountRowProps = {
  control: Control<StockCountFormInput>;
  index: number;
  ingredient: Ingredient;
};

function formatSignedQuantity(value: number, unitSymbol: string): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatQuantity(value)} ${unitSymbol}`;
}

function formatSignedCurrency(value: number): string {
  return value < 0
    ? `- ${formatCurrency(Math.abs(value))}`
    : `+ ${formatCurrency(value)}`;
}

function StockCountRow({ control, index, ingredient }: StockCountRowProps) {
  const countedQuantity = useWatch({
    control,
    name: `counts.${index}.countedQuantity`,
  });
  const unitSymbol = getUnitSymbol(ingredient.unit);
  const difference =
    countedQuantity === undefined
      ? null
      : countedQuantity - ingredient.currentStock;

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-sm">{ingredient.name}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          No sistema: {formatQuantity(ingredient.currentStock)} {unitSymbol}
        </span>
        {difference !== null && (
          <span
            className={cn(
              "font-medium text-xs tabular-nums",
              difference === 0 && "text-muted-foreground",
              difference < 0 && "text-destructive",
              difference > 0 && "text-foreground",
            )}
          >
            {difference === 0
              ? "Confere"
              : `${formatSignedQuantity(difference, unitSymbol)} · ${formatSignedCurrency(difference * ingredient.unitCost)}`}
          </span>
        )}
      </div>
      <NumberField
        control={control}
        name={`counts.${index}.countedQuantity`}
        label={`Quantidade contada de ${ingredient.name}`}
        isLabelHidden
        format="quantity"
        suffix={unitSymbol}
        placeholder="Contado"
        size="compact"
      />
    </li>
  );
}

function StockCountSummary({
  control,
  ingredients,
}: {
  control: Control<StockCountFormInput>;
  ingredients: readonly Ingredient[];
}) {
  const counts = useWatch({ control, name: "counts" });
  const countedEntries = ingredients.flatMap((ingredient, index) => {
    const countedQuantity = counts?.[index]?.countedQuantity;
    return countedQuantity === undefined
      ? []
      : [{ ingredient, difference: countedQuantity - ingredient.currentStock }];
  });
  const differenceValue = countedEntries.reduce(
    (total, entry) => total + entry.difference * entry.ingredient.unitCost,
    0,
  );
  const mismatchCount = countedEntries.filter(
    (entry) => entry.difference !== 0,
  ).length;

  return (
    <dl className="grid grid-cols-3 gap-3 rounded-xl bg-muted/50 p-4 text-sm">
      <div className="flex flex-col">
        <dt className="text-muted-foreground text-xs">Contados</dt>
        <dd className="font-semibold tabular-nums">
          {countedEntries.length} de {ingredients.length}
        </dd>
      </div>
      <div className="flex flex-col">
        <dt className="text-muted-foreground text-xs">Com diferença</dt>
        <dd className="font-semibold tabular-nums">{mismatchCount}</dd>
      </div>
      <div className="flex flex-col">
        <dt className="text-muted-foreground text-xs">Valor da diferença</dt>
        <dd
          className={cn(
            "font-semibold tabular-nums",
            differenceValue < 0 && "text-destructive",
          )}
        >
          {differenceValue === 0
            ? formatCurrency(0)
            : formatSignedCurrency(differenceValue)}
        </dd>
      </div>
    </dl>
  );
}

function StockCountForm({
  organizationId,
  ingredients,
  onClose,
}: Omit<StockCountDialogProps, "isOpen">) {
  const applyMutation = useApplyStockCountMutation(organizationId);
  const [searchTerm, setSearchTerm] = useState("");
  const form = useForm<StockCountFormInput>({
    resolver: zodResolver(stockCountFormSchema),
    defaultValues: {
      counts: ingredients.map((ingredient) => ({
        ingredientId: ingredient.id,
        countedQuantity: undefined,
      })),
    },
  });
  const normalizedSearch = normalizeText(searchTerm.trim());
  const countsError = form.formState.errors.counts;
  const formError = countsError?.message ?? countsError?.root?.message;

  const handleSubmit = form.handleSubmit((values) =>
    applyMutation.mutate(values, {
      onSuccess: ({ adjustedCount, differenceValue }) => {
        toast.success(
          adjustedCount === 0
            ? "Contagem salva. O estoque já estava certo."
            : `Contagem salva. ${adjustedCount === 1 ? "1 insumo ajustado" : `${adjustedCount} insumos ajustados`}.`,
          {
            description:
              differenceValue === 0
                ? undefined
                : `Diferença de ${formatSignedCurrency(differenceValue)} no valor do estoque.`,
          },
        );
        onClose();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <FormDialog
      isOpen
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Contagem de estoque"
      description="Conte o que tem de cada insumo e digite a quantidade. Deixe vazio o que não contou: só os preenchidos são ajustados."
      submitLabel="Salvar contagem"
      isSubmitting={applyMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        <StockCountSummary control={form.control} ingredients={ingredients} />
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <InputGroup className="h-10 rounded-lg">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label="Buscar insumo"
            placeholder="Buscar insumo"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </InputGroup>
        <ul className="flex flex-col divide-y rounded-xl border">
          {ingredients.map((ingredient, index) =>
            normalizedSearch === "" ||
            normalizeText(ingredient.name).includes(normalizedSearch) ? (
              <StockCountRow
                key={ingredient.id}
                control={form.control}
                index={index}
                ingredient={ingredient}
              />
            ) : null,
          )}
        </ul>
      </FieldGroup>
    </FormDialog>
  );
}

export function StockCountDialog({
  organizationId,
  isOpen,
  ingredients,
  onClose,
}: StockCountDialogProps) {
  if (!isOpen) return null;
  return (
    <StockCountForm
      organizationId={organizationId}
      ingredients={ingredients}
      onClose={onClose}
    />
  );
}
