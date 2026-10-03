"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { type DefaultValues, useController, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { PasswordField } from "@/components/form/password-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useSaveOperatorMutation } from "@/features/operators/hooks/use-save-operator-mutation";
import {
  type OperatorInput,
  operatorSchema,
  PIN_LENGTH,
} from "@/features/operators/schemas";
import type { Operator } from "@/features/operators/types";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { PageAccessField } from "../../components/page-access-field";

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
  const saveOperatorMutation = useSaveOperatorMutation(organizationId);
  const form = useForm<OperatorInput>({
    resolver: zodResolver(operatorSchema),
    defaultValues: EMPTY_OPERATOR_FORM,
  });

  const allowedModulesField = useController({
    control: form.control,
    name: "allowedModules",
  });
  const settingsField = useController({
    control: form.control,
    name: "canAccessSettings",
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
              isEditing ? "Deixe vazio para manter" : "Vazio: cria no 1º acesso"
            }
            autoComplete="new-password"
            maxDigits={PIN_LENGTH}
          />
        </div>
        <PageAccessField
          allowedModules={allowedModulesField.field.value}
          canAccessSettings={settingsField.field.value}
          visibleModuleIds={visibleModuleIds}
          errorMessage={allowedModulesField.fieldState.error?.message}
          onAllowedModulesChange={allowedModulesField.field.onChange}
          onCanAccessSettingsChange={settingsField.field.onChange}
        />
      </FieldGroup>
    </FormDialog>
  );
}
