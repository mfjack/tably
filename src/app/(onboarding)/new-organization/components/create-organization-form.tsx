"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { useSignOutMutation } from "@/features/auth/hooks/use-sign-out-mutation";
import {
  buildOrganizationPath,
  DEFAULT_MODULE_PATH,
} from "@/features/modules/app-modules";
import { useCreateOrganizationMutation } from "@/features/organizations/hooks/use-create-organization-mutation";
import {
  type CreateOrganizationInput,
  createOrganizationSchema,
} from "@/features/organizations/schemas";
import { TermsAcceptanceField } from "./terms-acceptance-field";

type CreateOrganizationFormProps = {
  canCancel: boolean;
};

export function CreateOrganizationForm({
  canCancel,
}: CreateOrganizationFormProps) {
  const router = useRouter();
  const createOrganizationMutation = useCreateOrganizationMutation();
  const signOutMutation = useSignOutMutation();
  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: "", hasAcceptedTerms: false },
  });

  const handleSubmit = form.handleSubmit((values) => {
    createOrganizationMutation.mutate(values, {
      onSuccess: ({ slug }) => {
        router.replace(buildOrganizationPath(slug, DEFAULT_MODULE_PATH));
        router.refresh();
      },
    });
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome do estabelecimento"
          autoComplete="organization"
          placeholder="Ex.: Café Pinheiro"
        />
        <TermsAcceptanceField control={form.control} />

        {createOrganizationMutation.error && (
          <AuthAlert>{createOrganizationMutation.error.message}</AuthAlert>
        )}

        <div className="flex flex-col gap-3 pt-5">
          <AuthSubmitButton isPending={createOrganizationMutation.isPending}>
            Criar estabelecimento
          </AuthSubmitButton>
          {canCancel ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-muted-foreground"
              disabled={signOutMutation.isPending}
              onClick={() => signOutMutation.mutate()}
            >
              Entrar com outra conta
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  );
}
