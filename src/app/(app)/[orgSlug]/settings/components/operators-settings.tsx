"use client";

import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DataTableRowActionButton } from "@/components/data-table/data-table-row-action-button";
import {
  ConfirmDialog,
  IRREVERSIBLE_ACTION_MESSAGE,
} from "@/components/dialog/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_MODULES, SETTINGS_PAGE } from "@/features/modules/app-modules";
import { useDeleteOperatorMutation } from "@/features/operators/hooks/use-delete-operator-mutation";
import { useOperatorsQuery } from "@/features/operators/hooks/use-operators-query";
import type { Operator } from "@/features/operators/types";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { OperatorFormDialog } from "./operator-form-dialog";

type OperatorFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; operator: Operator };

type OperatorsSettingsProps = {
  organizationId: OrganizationId;
  visibleModuleIds: readonly AppModuleId[];
};

function getPageLabels(operator: Operator) {
  const moduleLabels = APP_MODULES.filter((appModule) =>
    operator.allowedModules.includes(appModule.id),
  ).map((appModule) => appModule.label);
  return operator.canAccessSettings
    ? [...moduleLabels, SETTINGS_PAGE.label]
    : moduleLabels;
}

export function OperatorsSettings({
  organizationId,
  visibleModuleIds,
}: OperatorsSettingsProps) {
  const router = useRouter();
  const operatorsQuery = useOperatorsQuery(organizationId);
  const deleteOperatorMutation = useDeleteOperatorMutation(organizationId);
  const [formState, setFormState] = useState<OperatorFormState>({
    mode: "closed",
  });
  const [operatorToDelete, setOperatorToDelete] = useState<Operator | null>(
    null,
  );
  const operators = operatorsQuery.data ?? [];

  function confirmDelete() {
    if (!operatorToDelete) return;
    deleteOperatorMutation.mutate(operatorToDelete.id, {
      onSuccess: () => {
        setOperatorToDelete(null);
        toast.success("Operador excluído.");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg">Operadores</h2>
        <p className="text-muted-foreground text-sm">
          Cadastre operadores com PIN para exigir login antes de usar o sistema
          e escolha quais páginas cada um pode acessar. Sem operadores
          cadastrados, o login fica desativado.
        </p>
      </header>

      {operatorsQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>{operatorsQuery.error.message}</AlertDescription>
        </Alert>
      ) : operatorsQuery.isPending ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : (
        <ul className="flex flex-col gap-3">
          {operators.map((operator) => (
            <li
              key={operator.id}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <KeyRound
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate font-semibold text-base">
                  {operator.name}
                </span>
                <div className="flex gap-2">
                  <DataTableRowActionButton
                    label="Editar"
                    accessibleLabel={`Editar ${operator.name}`}
                    icon={Pencil}
                    onClick={() => setFormState({ mode: "edit", operator })}
                  />
                  <DataTableRowActionButton
                    label="Excluir"
                    accessibleLabel={`Excluir ${operator.name}`}
                    icon={Trash2}
                    variant="destructive"
                    onClick={() => setOperatorToDelete(operator)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {getPageLabels(operator).map((pageLabel) => (
                  <Badge key={pageLabel} variant="outline">
                    {pageLabel}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={() => setFormState({ mode: "create" })}
        >
          Adicionar operador
        </Button>
      </div>

      <OperatorFormDialog
        organizationId={organizationId}
        isOpen={formState.mode !== "closed"}
        operator={formState.mode === "edit" ? formState.operator : undefined}
        isFirstOperator={formState.mode === "create" && operators.length === 0}
        visibleModuleIds={visibleModuleIds}
        onClose={() => setFormState({ mode: "closed" })}
      />
      <ConfirmDialog
        isOpen={operatorToDelete !== null}
        onOpenChange={(isOpen) => !isOpen && setOperatorToDelete(null)}
        title="Excluir operador?"
        description={
          operators.length === 1
            ? `Sem operadores, o login por PIN é desativado. ${IRREVERSIBLE_ACTION_MESSAGE}`
            : `${operatorToDelete?.name ?? ""} não poderá mais entrar. ${IRREVERSIBLE_ACTION_MESSAGE}`
        }
        confirmLabel="Excluir"
        isConfirming={deleteOperatorMutation.isPending}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
