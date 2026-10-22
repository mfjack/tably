import type { FieldValues } from "react-hook-form";
import type { FormFieldProps } from "@/components/form/form-field-types";
import { NumberField } from "@/components/form/number-field";

type FreightCostFieldProps<TFieldValues extends FieldValues> = Pick<
  FormFieldProps<TFieldValues>,
  "control" | "name"
>;

export function FreightCostField<TFieldValues extends FieldValues>({
  control,
  name,
}: FreightCostFieldProps<TFieldValues>) {
  return (
    <NumberField
      control={control}
      name={name}
      label="Frete (opcional)"
      format="currency"
      placeholder="Ex.: $ 15,00"
      description="Somado ao valor pago no custo do insumo."
    />
  );
}
