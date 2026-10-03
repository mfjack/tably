"use client";

import { Gift, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/dialog/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useLoyaltyCustomersQuery } from "@/features/loyalty/hooks/use-loyalty-customers-query";
import { useRedeemLoyaltyRewardMutation } from "@/features/loyalty/hooks/use-redeem-loyalty-reward-mutation";
import type {
  LoyaltyCustomer,
  LoyaltyCustomerId,
  LoyaltyProgram,
} from "@/features/loyalty/types";
import type { OrganizationId } from "@/features/organizations/types";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { LoyaltyAdjustmentDialog } from "./loyalty-adjustment-dialog";
import { LoyaltyCustomerFormDialog } from "./loyalty-customer-form-dialog";
import { LoyaltyCustomersTable } from "./loyalty-customers-table";
import { LoyaltyHistoryDialog } from "./loyalty-history-dialog";

type LoyaltyViewProps = {
  organizationId: OrganizationId;
  title: string;
  program: LoyaltyProgram;
  canManage: boolean;
};

function describeProgram(program: LoyaltyProgram) {
  return `${program.stampsRequired} selos valem ${program.rewardDescription}`;
}

export function LoyaltyView({
  organizationId,
  title,
  program,
  canManage,
}: LoyaltyViewProps) {
  const customersQuery = useLoyaltyCustomersQuery(organizationId);
  const redeemMutation = useRedeemLoyaltyRewardMutation(organizationId);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [historyCustomerId, setHistoryCustomerId] =
    useState<LoyaltyCustomerId | null>(null);
  const [customerToAdjust, setCustomerToAdjust] =
    useState<LoyaltyCustomer | null>(null);
  const [customerToRedeem, setCustomerToRedeem] =
    useState<LoyaltyCustomer | null>(null);
  const customers = customersQuery.data;
  const historyCustomer =
    customers?.find((customer) => customer.id === historyCustomerId) ?? null;

  const openCreateForm = useCallback(() => {
    setIsCreateFormOpen(true);
  }, []);

  const openHistory = useCallback((customer: LoyaltyCustomer) => {
    setHistoryCustomerId(customer.id);
  }, []);

  const requestRedeem = useCallback((customer: LoyaltyCustomer) => {
    setCustomerToRedeem(customer);
  }, []);

  const openAdjustment = useCallback((customer: LoyaltyCustomer) => {
    setCustomerToAdjust(customer);
  }, []);

  function closeCreateForm() {
    setIsCreateFormOpen(false);
  }

  function closeHistory() {
    setHistoryCustomerId(null);
  }

  function closeAdjustment() {
    setCustomerToAdjust(null);
  }

  function closeRedeemConfirmation(isOpen: boolean) {
    if (!isOpen) setCustomerToRedeem(null);
  }

  function confirmRedeem() {
    if (!customerToRedeem) return;
    redeemMutation.mutate(customerToRedeem.id, {
      onSuccess: () => {
        toast.success("Prêmio resgatado.", {
          description: `Entregue ${program.rewardDescription} sem cobrar.`,
        });
        setCustomerToRedeem(null);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <>
      <PageHeader
        title={title}
        description={describeProgram(program)}
        actions={
          canManage && (
            <Button className="h-10" onClick={openCreateForm}>
              <Plus aria-hidden />
              <span className="max-sm:sr-only">Novo cliente</span>
            </Button>
          )
        }
      />
      <PageContent>
        <LoyaltyCustomersTable
          customers={customers}
          program={program}
          canManage={canManage}
          isLoading={customersQuery.isPending}
          errorMessage={customersQuery.error?.message}
          emptyState={
            <ListEmptyState
              icon={Gift}
              title="Nenhum cliente na fidelidade ainda"
              description="Na hora de cobrar, no PDV ou nas comandas, informe o celular do cliente. O cadastro e o primeiro selo acontecem ali mesmo."
              createLabel="Cadastrar cliente"
              canCreate={canManage}
              onCreate={openCreateForm}
            />
          }
          onOpenHistory={openHistory}
          onRedeem={requestRedeem}
          onAdjust={openAdjustment}
        />
      </PageContent>

      <LoyaltyCustomerFormDialog
        organizationId={organizationId}
        isOpen={isCreateFormOpen}
        onClose={closeCreateForm}
      />
      <LoyaltyHistoryDialog
        organizationId={organizationId}
        customer={historyCustomer}
        program={program}
        onClose={closeHistory}
      />
      <LoyaltyAdjustmentDialog
        organizationId={organizationId}
        customer={customerToAdjust}
        onClose={closeAdjustment}
      />
      <ConfirmDialog
        isOpen={customerToRedeem !== null}
        onOpenChange={closeRedeemConfirmation}
        title="Resgatar prêmio?"
        description={
          customerToRedeem
            ? `${customerToRedeem.name} troca ${program.stampsRequired} selos por ${program.rewardDescription}. Entregue sem cobrar.`
            : ""
        }
        confirmLabel="Resgatar"
        isConfirming={redeemMutation.isPending}
        onConfirm={confirmRedeem}
      />
    </>
  );
}
