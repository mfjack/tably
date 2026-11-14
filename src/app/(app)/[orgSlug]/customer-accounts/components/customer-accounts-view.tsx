"use client";

import { BookUser, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  IRREVERSIBLE_ACTION_MESSAGE,
} from "@/components/dialog/confirm-dialog";
import { ToggleChip } from "@/components/toggle-chip";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CustomerAccountFormDialog } from "@/features/customer-accounts/components/customer-account-form-dialog";
import { useCustomerAccountsQuery } from "@/features/customer-accounts/hooks/use-customer-accounts-query";
import { useDeleteCustomerAccountMutation } from "@/features/customer-accounts/hooks/use-delete-customer-account-mutation";
import type {
  CustomerAccount,
  CustomerAccountId,
} from "@/features/customer-accounts/types";
import type { PaymentMethod } from "@/features/orders/types";
import type {
  OrganizationId,
  OrganizationPaymentFees,
} from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { AccountPaymentDialog } from "./account-payment-dialog";
import { AccountStatementDialog } from "./account-statement-dialog";
import { CustomerAccountsTable } from "./customer-accounts-table";

type AccountFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; account: CustomerAccount };

function getDeleteDescription(account: CustomerAccount) {
  const debtWarning =
    account.balance > 0
      ? `O saldo devedor de ${formatCurrency(account.balance)} deixa de ser cobrado. `
      : "";
  return `${debtWarning}A conta de ${account.name} sai da lista e do PDV. ${IRREVERSIBLE_ACTION_MESSAGE}`;
}

type CustomerAccountsViewProps = {
  organizationId: OrganizationId;
  title: string;
  paymentFees: OrganizationPaymentFees;
  acceptedPaymentMethods: readonly PaymentMethod[];
};

export function CustomerAccountsView({
  organizationId,
  title,
  paymentFees,
  acceptedPaymentMethods,
}: CustomerAccountsViewProps) {
  const accountsQuery = useCustomerAccountsQuery(organizationId);
  const [formState, setFormState] = useState<AccountFormState>({
    mode: "closed",
  });
  const [statementAccountId, setStatementAccountId] =
    useState<CustomerAccountId | null>(null);
  const [paymentAccountId, setPaymentAccountId] =
    useState<CustomerAccountId | null>(null);
  const [accountToDelete, setAccountToDelete] =
    useState<CustomerAccount | null>(null);
  const deleteAccountMutation =
    useDeleteCustomerAccountMutation(organizationId);
  const [isShowingPaidAccounts, setIsShowingPaidAccounts] = useState(false);

  const accounts = accountsQuery.data;
  const findAccount = (accountId: CustomerAccountId | null) =>
    accounts?.find((account) => account.id === accountId) ?? null;
  const debtors = (accounts ?? []).filter((account) => account.balance > 0);
  const hasPaidAccounts = (accounts?.length ?? 0) > debtors.length;
  const visibleAccounts =
    accounts && !isShowingPaidAccounts ? debtors : accounts;
  const totalReceivable = debtors.reduce(
    (total, account) => total + account.balance,
    0,
  );

  const openCreateForm = useCallback(() => {
    setFormState({ mode: "create" });
  }, []);

  const openEditForm = useCallback((account: CustomerAccount) => {
    setFormState({ mode: "edit", account });
  }, []);

  const openStatement = useCallback((account: CustomerAccount) => {
    setStatementAccountId(account.id);
  }, []);

  const openPayment = useCallback((account: CustomerAccount) => {
    setPaymentAccountId(account.id);
  }, []);

  const requestDelete = useCallback((account: CustomerAccount) => {
    setAccountToDelete(account);
  }, []);

  function confirmDelete() {
    if (!accountToDelete) return;
    deleteAccountMutation.mutate(accountToDelete.id, {
      onSuccess: () => {
        toast.success(`Conta de ${accountToDelete.name} excluída.`);
        setAccountToDelete(null);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <>
      <PageHeader
        title={title}
        description={
          accounts && debtors.length > 0
            ? `${formatCurrency(totalReceivable)} a receber de ${debtors.length} ${debtors.length === 1 ? "cliente" : "clientes"}`
            : undefined
        }
        actions={
          <Button className="h-10" onClick={openCreateForm}>
            <Plus aria-hidden />
            Nova conta
          </Button>
        }
      />
      <PageContent>
        <CustomerAccountsTable
          accounts={visibleAccounts}
          isLoading={accountsQuery.isPending}
          errorMessage={accountsQuery.error?.message}
          emptyState={
            hasPaidAccounts ? (
              <Empty className="flex-1 border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BookUser aria-hidden />
                  </EmptyMedia>
                  <EmptyTitle>Ninguém devendo</EmptyTitle>
                  <EmptyDescription>
                    Todas as contas estão quitadas.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={() => setIsShowingPaidAccounts(true)}
                  >
                    Mostrar quitadas
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <ListEmptyState
                icon={BookUser}
                title="Nenhuma conta ainda"
                description="Cadastre os clientes que compram para pagar depois. No PDV, escolha a forma de pagamento Conta."
                createLabel="Criar primeira conta"
                canCreate
                onCreate={openCreateForm}
              />
            )
          }
          toolbarActions={
            hasPaidAccounts && (
              <ToggleChip
                label="Mostrar quitadas"
                isSelected={isShowingPaidAccounts}
                onToggle={() =>
                  setIsShowingPaidAccounts((isShowing) => !isShowing)
                }
              />
            )
          }
          onOpenStatement={openStatement}
          onEdit={openEditForm}
          onDelete={requestDelete}
        />
      </PageContent>

      <CustomerAccountFormDialog
        organizationId={organizationId}
        isOpen={formState.mode !== "closed"}
        account={formState.mode === "edit" ? formState.account : undefined}
        onClose={() => setFormState({ mode: "closed" })}
      />
      <AccountStatementDialog
        organizationId={organizationId}
        account={paymentAccountId ? null : findAccount(statementAccountId)}
        onClose={() => setStatementAccountId(null)}
        onReceivePayment={openPayment}
      />
      <ConfirmDialog
        isOpen={accountToDelete !== null}
        onOpenChange={(isOpen) => !isOpen && setAccountToDelete(null)}
        title="Excluir conta?"
        description={
          accountToDelete
            ? getDeleteDescription(accountToDelete)
            : IRREVERSIBLE_ACTION_MESSAGE
        }
        confirmLabel="Excluir"
        isConfirming={deleteAccountMutation.isPending}
        onConfirm={confirmDelete}
      />
      <AccountPaymentDialog
        organizationId={organizationId}
        account={findAccount(paymentAccountId)}
        paymentFees={paymentFees}
        acceptedPaymentMethods={acceptedPaymentMethods}
        onClose={() => setPaymentAccountId(null)}
      />
    </>
  );
}
