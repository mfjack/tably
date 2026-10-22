"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { FieldValues } from "react-hook-form";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { onlyDigits } from "@/lib/masks";
import { ControlledFormField } from "./controlled-form-field";
import { getFieldDescriptionId } from "./form-field-shell";
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
  maxDigits?: number;
};

export function PasswordField<TFieldValues extends FieldValues>({
  placeholder = "••••••••",
  autoComplete,
  maxDigits,
  ...fieldProps
}: PasswordFieldProps<TFieldValues>) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const VisibilityIcon = isPasswordVisible ? EyeOff : Eye;

  return (
    <ControlledFormField
      {...fieldProps}
      render={({ field, fieldState, inputId }) => (
        <InputGroup className={FORM_INPUT_GROUP_CLASS_NAME}>
          <InputGroupInput
            {...field}
            onChange={(event) =>
              field.onChange(
                maxDigits === undefined
                  ? event.target.value
                  : onlyDigits(event.target.value).slice(0, maxDigits),
              )
            }
            inputMode={maxDigits === undefined ? undefined : "numeric"}
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
              aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={isPasswordVisible}
              onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
            >
              <VisibilityIcon className="size-4.5" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      )}
    />
  );
}
