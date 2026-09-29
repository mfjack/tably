"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { PasswordField } from "@/components/form/password-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useSaveOperatorMutation } from "@/features/operators/hooks/use-save-operator-mutation";
import {
  createOperatorSchema,
  type OperatorInput,
} from "@/features/operators/schemas";
import type { Operator } from "@/features/operators/types";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { PageAccessField } from "./page-access-field";

const EMPTY_OPERATOR_FORM: DefaultValues<OperatorInput> = {
  name: "",
  pin: "",
  allowedModules: [],
  canAccessSettings: false,
};

type OperatorFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  operator?: Operator;
  isFirstOperator: boolean;
  visibleModuleIds: readonly AppModuleId[];
  onClose: () => void;
};

function toFormValues(operator: Operator): DefaultValues<OperatorInput> {
  return {
    name: operator.name,
    pin: "",
    allowedModules: operator.allowedModules,
    canAccessSettings: operator.canAccessSettings,
  };
}

export function OperatorFormDialog({
  organizationId,
  isOpen,
  operator,
  isFirstOperator,
  visibleModuleIds,
  onClose,
}: OperatorFormDialogProps) {
  const router = useRouter();
  const isEditing = operator !== undefined;
  const operatorSchema = useMemo(
    () => createOperatorSchema(isEditing),
    [isEditing],
  );
  const saveOperatorMutation = useSaveOperatorMutation(organizationId);
  const form = useForm<OperatorInput>({
    resolver: zodResolver(operatorSchema),
    defaultValues: EMPTY_OPERATOR_FORM,
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(operator ? toFormValues(operator) : EMPTY_OPERATOR_FORM);
  }, [isOpen, operator, form]);

  const handleSubmit = form.handleSubmit((values) =>
    saveOperatorMutation.mutate(
      { operatorId: operator?.id ?? null, input: values },
      {
        onSuccess: () => {
          onClose();
          toast.success(
            isEditing
              ? "Operador atualizado."
              : `Operador ${values.name} cadastrado.`,
            {
              description: isFirstOperator
                ? "O login por PIN está ativo. Você entrou como esse operador."
                : undefined,
            },
          );
          router.refresh();
        },
        onError: (error) => toast.error(error.message),
      },
    ),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isEditing ? "Editar operador" : "Novo operador"}
      description={
        isFirstOperator
          ? "Ao salvar, o login por PIN passa a ser exigido. Libere Configurações para esse primeiro operador."
          : undefined
      }
      submitLabel={isEditing ? "Salvar" : "Cadastrar"}
      isSubmitting={saveOperatorMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            label="Nome"
            placeholder="Ex.: Atendimento"
            autoComplete="off"
          />
          <PasswordField
            control={form.control}
            name="pin"
            label="PIN"
            placeholder={
              isEditing ? "Deixe vazio para manter" : "4 a 6 números"
            }
            autoComplete="new-password"
          />
        </div>
        <PageAccessField
          control={form.control}
          visibleModuleIds={visibleModuleIds}
        />
      </FieldGroup>
    </FormDialog>
  );
}
