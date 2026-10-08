"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { type Control, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  getUnitSymbol,
  MEASURE_UNIT_OPTIONS,
} from "@/features/ingredients/measure-units";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useImportPurchaseInvoiceMutation } from "@/features/purchase-invoices/hooks/use-import-purchase-invoice-mutation";
import { usePreviewPurchaseInvoiceMutation } from "@/features/purchase-invoices/hooks/use-preview-purchase-invoice-mutation";
import {
  detectPackageSize,
  suggestNewIngredientUnit,
  toIngredientName,
} from "@/features/purchase-invoices/item-suggestions";
import { parseNfeXml } from "@/features/purchase-invoices/parse-nfe-xml";
import {
  CREATE_INGREDIENT_TARGET,
  type InvoiceImportFormInput,
  invoiceImportFormSchema,
  SKIP_ITEM_TARGET,
} from "@/features/purchase-invoices/schemas";
import type {
  InvoiceItem,
  InvoiceItemSuggestion,
  InvoicePreview,
  PurchaseInvoice,
} from "@/features/purchase-invoices/types";
import { formatCurrency, formatDateKey, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

type InvoiceImportDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  ingredients: readonly Ingredient[];
  onClose: () => void;
};

type ReviewState = {
  invoice: PurchaseInvoice;
  preview: InvoicePreview;
};

function toDefaultDecision(
  item: InvoiceItem,
  suggestion: InvoiceItemSuggestion,
): InvoiceImportFormInput["items"][number] {
  if (suggestion.ingredientId) {
    return {
      target: suggestion.ingredientId,
      newName: "",
      newUnit: undefined,
      unitsPerPackage: suggestion.unitsPerPackage ?? undefined,
    };
  }
  const newUnit = suggestNewIngredientUnit(item.description);
  return {
    target: CREATE_INGREDIENT_TARGET,
    newName: toIngredientName(item.description),
    newUnit,
    unitsPerPackage:
      newUnit === "unit" ? 1 : detectPackageSize(item.description)?.amount,
  };
}

type InvoiceItemFieldsProps = {
  control: Control<InvoiceImportFormInput>;
  index: number;
  item: InvoiceItem;
  suggestion: InvoiceItemSuggestion;
  ingredients: readonly Ingredient[];
};

function InvoiceItemFields({
  control,
  index,
  item,
  suggestion,
  ingredients,
}: InvoiceItemFieldsProps) {
  const [target, newUnit, unitsPerPackage] = useWatch({
    control,
    name: [
      `items.${index}.target`,
      `items.${index}.newUnit`,
      `items.${index}.unitsPerPackage`,
    ],
  });
  const isSkipped = target === SKIP_ITEM_TARGET;
  const isNew = target === CREATE_INGREDIENT_TARGET;
  const linkedIngredient = ingredients.find(
    (ingredient) => ingredient.id === target,
  );
  const stockUnit = isNew ? newUnit : linkedIngredient?.unit;
  const unitSymbol = stockUnit ? getUnitSymbol(stockUnit) : undefined;
  const packageLabel = item.unit || "embalagem";
  const options = [
    { value: CREATE_INGREDIENT_TARGET, label: "Criar insumo novo" },
    { value: SKIP_ITEM_TARGET, label: "Não dar entrada" },
    ...ingredients.map((ingredient) => ({
      value: ingredient.id,
      label: ingredient.name,
    })),
  ];

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        isSkipped && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-sm">{item.description}</span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatQuantity(item.packages)} {packageLabel} ·{" "}
            {formatCurrency(item.totalCost)}
          </span>
        </div>
        {suggestion.isRemembered && target === suggestion.ingredientId && (
          <Badge variant="secondary">Lembrado da última nota</Badge>
        )}
      </div>
      <SelectField
        control={control}
        name={`items.${index}.target`}
        label="Insumo"
        options={options}
      />
      {isNew && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            control={control}
            name={`items.${index}.newName`}
            label="Nome do insumo"
          />
          <SelectField
            control={control}
            name={`items.${index}.newUnit`}
            label="Unidade de medida"
            placeholder="Selecione"
            options={MEASURE_UNIT_OPTIONS}
          />
        </div>
      )}
      {!isSkipped && (
        <NumberField
          control={control}
          name={`items.${index}.unitsPerPackage`}
          label={`Quanto vem em 1 ${packageLabel}`}
          format="quantity"
          suffix={unitSymbol}
          placeholder="Ex.: 1"
          description={
            unitsPerPackage
              ? `Entra no estoque: ${formatQuantity(item.packages * unitsPerPackage)}${unitSymbol ? ` ${unitSymbol}` : ""}`
              : undefined
          }
        />
      )}
    </li>
  );
}

type InvoiceReviewDialogProps = {
  organizationId: OrganizationId;
  review: ReviewState;
  ingredients: readonly Ingredient[];
  onClose: () => void;
};

function InvoiceReviewDialog({
  organizationId,
  review,
  ingredients,
  onClose,
}: InvoiceReviewDialogProps) {
  const { invoice, preview } = review;
  const importMutation = useImportPurchaseInvoiceMutation(organizationId);
  const form = useForm<InvoiceImportFormInput>({
    resolver: zodResolver(invoiceImportFormSchema),
    defaultValues: {
      items: invoice.items.map((item, index) =>
        toDefaultDecision(item, preview.suggestions[index]),
      ),
    },
  });

  const handleSubmit = form.handleSubmit(({ items }) =>
    importMutation.mutate(
      { invoice, decisions: items },
      {
        onSuccess: () => {
          toast.success(`Nota ${invoice.number} importada.`, {
            description: "Estoque, fornecedor e contas a pagar atualizados.",
          });
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    ),
  );

  return (
    <FormDialog
      isOpen
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={`Nota ${invoice.number}`}
      description="Confira em qual insumo cada produto entra. Na próxima nota desse fornecedor, isso já vem preenchido."
      submitLabel="Importar"
      isSubmitting={importMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        {preview.isAlreadyImported && (
          <Alert variant="destructive">
            <AlertDescription>
              Essa nota já foi importada. Importar de novo daria entrada em
              dobro no estoque.
            </AlertDescription>
          </Alert>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-4">
          <div className="col-span-2 flex flex-col">
            <dt className="text-muted-foreground text-xs">Fornecedor</dt>
            <dd className="font-medium">
              {invoice.supplier.name}
              {!preview.supplierId && (
                <span className="text-muted-foreground"> · novo</span>
              )}
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-muted-foreground text-xs">Emissão</dt>
            <dd className="font-medium tabular-nums">
              {formatDateKey(invoice.issuedDate)}
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-muted-foreground text-xs">Total</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(invoice.totalAmount)}
            </dd>
          </div>
          <div className="col-span-2 flex flex-col sm:col-span-4">
            <dt className="text-muted-foreground text-xs">Contas a pagar</dt>
            <dd className="tabular-nums">
              {invoice.installments.length > 0
                ? invoice.installments
                    .map(
                      (installment) =>
                        `${formatCurrency(installment.amount)} em ${formatDateKey(installment.dueDate)}`,
                    )
                    .join(" · ")
                : `${formatCurrency(invoice.totalAmount)} em ${formatDateKey(invoice.issuedDate)}`}
            </dd>
          </div>
        </dl>
        <ul className="flex flex-col gap-3">
          {invoice.items.map((item, index) => (
            <InvoiceItemFields
              key={`${item.productCode}-${index.toString()}`}
              control={form.control}
              index={index}
              item={item}
              suggestion={preview.suggestions[index]}
              ingredients={ingredients}
            />
          ))}
        </ul>
      </FieldGroup>
    </FormDialog>
  );
}

export function InvoiceImportDialog({
  organizationId,
  isOpen,
  ingredients,
  onClose,
}: InvoiceImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewMutation = usePreviewPurchaseInvoiceMutation(organizationId);
  const [review, setReview] = useState<ReviewState | null>(null);

  function close() {
    setReview(null);
    previewMutation.reset();
    onClose();
  }

  async function readFile(file: File) {
    const result = parseNfeXml(await file.text());
    if (result.status === "invalid") {
      toast.error(result.message);
      return;
    }
    previewMutation.mutate(result.invoice, {
      onSuccess: (preview) => setReview({ invoice: result.invoice, preview }),
      onError: (error) => toast.error(error.message),
    });
  }

  if (isOpen && review) {
    return (
      <InvoiceReviewDialog
        organizationId={organizationId}
        review={review}
        ingredients={ingredients}
        onClose={close}
      />
    );
  }

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && close()}
      title="Importar nota fiscal"
      footer={
        <Button
          type="button"
          variant="outline"
          className={cn(DIALOG_ACTION_BUTTON_CLASS_NAME, "col-span-2")}
          onClick={close}
        >
          Cancelar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Envie o arquivo XML que o fornecedor mandou por e-mail. O Tably cria o
          fornecedor, dá entrada nos insumos e lança as contas a pagar.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,text/xml,application/xml"
          className="sr-only"
          aria-label="Arquivo XML da nota"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void readFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-24 flex-col gap-2 border-dashed"
          isLoading={previewMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp aria-hidden className="size-5" />
          Escolher arquivo XML
        </Button>
      </div>
    </DetailsDialog>
  );
}
