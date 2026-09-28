"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { FormFieldShell, getFieldDescriptionId } from "./form-field-shell";
import {
  FORM_INPUT_GROUP_CLASS_NAME,
  FORM_INPUT_GROUP_CONTROL_CLASS_NAME,
} from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";

type PasswordFieldProps<TFieldValues extends FieldValues> = Omit<
  FormFieldProps<TFieldValues>,
  "autoComplete"
> & {
  autoComplete: "current-password" | "new-password";
};

export function PasswordField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  labelAction,
  isLabelHidden,
  placeholder = "••••••••",
  autoComplete,
}: PasswordFieldProps<TFieldValues>) {
  const inputId = useId();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const VisibilityIcon = isPasswordVisible ? EyeOff : Eye;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldShell
          inputId={inputId}
          label={label}
          description={description}
          labelAction={labelAction}
          isLabelHidden={isLabelHidden}
          error={fieldState.error}
        >
          <InputGroup className={FORM_INPUT_GROUP_CLASS_NAME}>
            <InputGroupInput
              {...field}
              value={field.value ?? ""}
              id={inputId}
              type={isPasswordVisible ? "text" : "password"}
              placeholder={placeholder}
              autoComplete={autoComplete}
              aria-invalid={fieldState.invalid}
              aria-describedby={getFieldDescriptionId(inputId)}
              className={FORM_INPUT_GROUP_CONTROL_CLASS_NAME}
            />
            <InputGroupAddon align="inline-end" className="pr-3">
              <InputGroupButton
                size="icon-sm"
                aria-label={
                  isPasswordVisible ? "Ocultar senha" : "Mostrar senha"
                }
                aria-pressed={isPasswordVisible}
                onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
              >
                <VisibilityIcon className="size-[18px]" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </FormFieldShell>
      )}
    />
  );
}
