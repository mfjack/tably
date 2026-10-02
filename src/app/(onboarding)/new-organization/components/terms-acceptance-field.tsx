"use client";

import Link from "next/link";
import { useId } from "react";
import { type Control, Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import type { CreateOrganizationInput } from "@/features/organizations/schemas";
import { ROUTES } from "@/lib/routes";

const LINK_CLASS_NAME = "font-medium text-primary underline underline-offset-4";

type TermsAcceptanceFieldProps = {
  control: Control<CreateOrganizationInput>;
};

export function TermsAcceptanceField({ control }: TermsAcceptanceFieldProps) {
  const checkboxId = useId();

  return (
    <Controller
      control={control}
      name="hasAcceptedTerms"
      render={({ field, fieldState }) => (
        <Field>
          <div className="flex items-start gap-3">
            <Checkbox
              id={checkboxId}
              ref={field.ref}
              checked={field.value === true}
              onCheckedChange={(isChecked) => field.onChange(isChecked)}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid}
              className="mt-0.5"
            />
            <FieldLabel
              htmlFor={checkboxId}
              className="block font-normal text-muted-foreground text-sm leading-snug"
            >
              Li e aceito os{" "}
              <Link
                href={ROUTES.terms}
                target="_blank"
                className={LINK_CLASS_NAME}
              >
                Termos de uso
              </Link>{" "}
              e a{" "}
              <Link
                href={ROUTES.privacy}
                target="_blank"
                className={LINK_CLASS_NAME}
              >
                Política de privacidade
              </Link>
              , inclusive sobre os dados de clientes e funcionários que eu
              cadastrar.
            </FieldLabel>
          </div>
          {fieldState.error && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
