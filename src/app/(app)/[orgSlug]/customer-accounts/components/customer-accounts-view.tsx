"use client";

import { BookUser, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCustomerAccountsQuery } from "@/features/customer-accounts/hooks/use-customer-accounts-query";
import type {
  CustomerAccount,
  CustomerAccountId,
} from "@/features/customer-accounts/types";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { AccountPaymentDialog } from "./account-payment-dialog";
import { AccountStatementDialog } from "./account-statement-dialog";
import { CustomerAccountFormDialog } from "./customer-account-form-dialog";
import { CustomerAccountsTable } from "./customer-accounts-table";

type AccountFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; account: CustomerAccount };

type CustomerAccountsViewProps = {
  organizationId: OrganizationId;
  title: string;
  description: string;
};

export function CustomerAccountsView({
  organizationId,
  title,
  description,
}: CustomerAccountsViewProps) {
  const accountsQuery = useCustomerAccountsQuery(organizationId);
  const [formState, setFormState] = useState<AccountFormState>({
    mode: "closed",
  });
  const [statementAccountId, setStatementAccountId] =
    useState<CustomerAccountId | null>(null);
  const [paymentAccountId, setPaymentAccountId] =
    useState<CustomerAccountId | null>(null);

  const accounts = accountsQuery.data;
  const findAccount = (accountId: CustomerAccountId | null) =>
    accounts?.find((account) => account.id === accountId) ?? null;
  const debtors = (accounts ?? []).filter((account) => account.balance > 0);
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

  return (
    <>
      <PageHeader
        title={title}
        description={
          accounts && debtors.length > 0
            ? `${formatCurrency(totalReceivable)} a receber de ${debtors.length} ${debtors.length === 1 ? "cliente" : "clientes"}`
            : description
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
          accounts={accounts}
          isLoading={accountsQuery.isPending}
          errorMessage={accountsQuery.error?.message}
          emptyState={
            <ListEmptyState
              icon={BookUser}
              title="Nenhuma conta ainda"
              description="Cadastre os clientes que compram para pagar depois. No PDV, escolha a forma de pagamento Conta."
              createLabel="Criar primeira conta"
              canCreate
              onCreate={openCreateForm}
            />
          }
          onOpenStatement={openStatement}
          onReceivePayment={openPayment}
          onEdit={openEditForm}
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
      <AccountPaymentDialog
        organizationId={organizationId}
        account={findAccount(paymentAccountId)}
        onClose={() => setPaymentAccountId(null)}
      />
    </>
  );
}
