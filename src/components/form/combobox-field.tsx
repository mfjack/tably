"use client";

import { Combobox } from "@base-ui/react/combobox";
import { ChevronDown } from "lucide-react";
import type { FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ControlledFormField } from "./controlled-form-field";
import { getFieldDescriptionId } from "./form-field-shell";
import { FORM_INPUT_CLASS_NAME } from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";
import type { SelectOption } from "./select-field";

type ComboboxFieldProps<TFieldValues extends FieldValues> = Omit<
  FormFieldProps<TFieldValues>,
  "autoComplete"
> & {
  options: readonly SelectOption[];
  emptyMessage?: string;
};

function getOptionLabel(option: SelectOption) {
  return option.label;
}

function isSameOption(option: SelectOption, selectedOption: SelectOption) {
  return option.value === selectedOption.value;
}

export function ComboboxField<TFieldValues extends FieldValues>({
  placeholder = "Buscar",
  options,
  emptyMessage = "Nada encontrado.",
  ...fieldProps
}: ComboboxFieldProps<TFieldValues>) {
  return (
    <ControlledFormField
      {...fieldProps}
      render={({ field, fieldState, inputId }) => (
        <Combobox.Root
          items={options}
          value={options.find((option) => option.value === field.value) ?? null}
          onValueChange={(option) => field.onChange(option?.value ?? "")}
          itemToStringLabel={getOptionLabel}
          isItemEqualToValue={isSameOption}
        >
          <div className="relative">
            <Combobox.Input
              render={
                <Input
                  ref={field.ref}
                  id={inputId}
                  name={field.name}
                  placeholder={placeholder}
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={getFieldDescriptionId(inputId)}
                  onBlur={field.onBlur}
                  className={cn(FORM_INPUT_CLASS_NAME, "pr-10")}
                />
              }
            />
            <Combobox.Trigger
              aria-label="Ver opções"
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
            >
              <ChevronDown className="size-4" aria-hidden />
            </Combobox.Trigger>
          </div>
          <Combobox.Portal>
            <Combobox.Positioner
              className="isolate z-50"
              sideOffset={4}
              align="start"
            >
              <Combobox.Popup className="max-h-[min(var(--available-height),20rem)] w-(--anchor-width) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
                <Combobox.Empty className="px-2 py-2.5 text-muted-foreground text-sm empty:hidden">
                  {emptyMessage}
                </Combobox.Empty>
                <Combobox.List>
                  {(option: SelectOption) => (
                    <Combobox.Item
                      key={option.value}
                      value={option}
                      className="flex w-full cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-[0.9375rem] outline-hidden data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-medium"
                    >
                      {option.label}
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      )}
    />
  );
}
