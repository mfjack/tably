"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import type { FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { ControlledFormField } from "./controlled-form-field";
import { getFieldDescriptionId } from "./form-field-shell";
import { FORM_INPUT_CLASS_NAME } from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";

type AutocompleteFieldProps<TFieldValues extends FieldValues> =
  FormFieldProps<TFieldValues> & {
    suggestions: readonly string[];
  };

export function AutocompleteField<TFieldValues extends FieldValues>({
  suggestions,
  placeholder,
  autoComplete = "off",
  ...fieldProps
}: AutocompleteFieldProps<TFieldValues>) {
  return (
    <ControlledFormField
      {...fieldProps}
      render={({ field, fieldState, inputId }) => (
        <Autocomplete.Root
          items={suggestions}
          value={field.value ?? ""}
          onValueChange={(value) => field.onChange(value)}
        >
          <Autocomplete.Input
            render={
              <Input
                ref={field.ref}
                id={inputId}
                name={field.name}
                placeholder={placeholder}
                autoComplete={autoComplete}
                aria-invalid={fieldState.invalid}
                aria-describedby={getFieldDescriptionId(inputId)}
                onBlur={field.onBlur}
                className={FORM_INPUT_CLASS_NAME}
              />
            }
          />
          <Autocomplete.Portal>
            <Autocomplete.Positioner
              className="isolate z-50"
              sideOffset={4}
              align="start"
            >
              <Autocomplete.Popup className="max-h-(--available-height) w-(--anchor-width) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-empty:hidden">
                <Autocomplete.List>
                  {(suggestion: string) => (
                    <Autocomplete.Item
                      key={suggestion}
                      value={suggestion}
                      className="flex w-full cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-[0.9375rem] outline-hidden data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                      {suggestion}
                    </Autocomplete.Item>
                  )}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      )}
    />
  );
}
