import type { ReactNode } from "react";
import type { FieldError as FormFieldError } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

type FormFieldShellProps = {
  inputId: string;
  label: string;
  description?: string;
  labelAction?: ReactNode;
  isLabelHidden?: boolean;
  error?: FormFieldError;
  children: ReactNode;
};

export function getFieldDescriptionId(inputId: string) {
  return `${inputId}-description`;
}

export function FormFieldShell({
  inputId,
  label,
  description,
  labelAction,
  isLabelHidden = false,
  error,
  children,
}: FormFieldShellProps) {
  const descriptionId = getFieldDescriptionId(inputId);

  return (
    <Field>
      <div
        className={
          isLabelHidden ? "sr-only" : "flex h-5 items-center justify-between"
        }
      >
        <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
        {labelAction}
      </div>
      {children}
      {error ? (
        <FieldError
          id={descriptionId}
          errors={[error]}
          className="text-[0.8125rem]"
        />
      ) : (
        description && (
          <FieldDescription id={descriptionId} className="text-[0.8125rem]">
            {description}
          </FieldDescription>
        )
      )}
    </Field>
  );
}
