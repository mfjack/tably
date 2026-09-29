import type { FormEventHandler, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type SettingsFormSectionProps = {
  title: string;
  description: string;
  isDirty: boolean;
  isSubmitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
};

export function SettingsFormSection({
  title,
  description,
  isDirty,
  isSubmitting,
  onSubmit,
  children,
}: SettingsFormSectionProps) {
  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex max-w-2xl flex-col gap-6 rounded-2xl border bg-card p-6"
    >
      <header className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </header>

      {children}

      <footer className="flex justify-end">
        <Button
          type="submit"
          className="h-11 px-5"
          disabled={!isDirty || isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting && <Spinner aria-hidden />}
          Salvar alterações
        </Button>
      </footer>
    </form>
  );
}
