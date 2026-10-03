import type { ReactNode } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

export type FormFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  description?: string;
  isDescriptionCompact?: boolean;
  labelAction?: ReactNode;
  isLabelHidden?: boolean;
  placeholder?: string;
  autoComplete?: string;
};
