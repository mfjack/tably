"use client";

import {
  ArrowLeftRight,
  Landmark,
  MoreHorizontal,
  Plus,
  Tags,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinancialAccountsQuery } from "@/features/finance/hooks/use-financial-accounts-query";
import { useFinancialCategoriesQuery } from "@/features/finance/hooks/use-financial-categories-query";
import type {
  FinancialAccount,
  FinancialCategory,
  FinancialEntry,
  FinancialEntryKind,
} from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import { MonthNavigator } from "../../components/month-navigator";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { AccountsDialog } from "./accounts-dialog";
import { CategoriesDialog } from "./categories-dialog";
import { DeleteEntryDialog } from "./delete-entry-dialog";
import { EntriesPanel } from "./entries-panel";
import { EntryFormDialog, type EntryFormState } from "./entry-form-dialog";
import { FinanceOverview } from "./finance-overview";
import { PayEntryDialog } from "./pay-entry-dialog";
import { StatementPanel } from "./statement-panel";
import { TransferDialog } from "./transfer-dialog";

const FINANCE_TABS = [
  "overview",
  "payables",
  "receivables",
  "statement",
] as const;

type FinanceTab = (typeof FINANCE_TABS)[number];

type OpenDialog = "none" | "accounts" | "categories" | "transfer";

type PaymentState = { entry: FinancialEntry; today: string } | null;

const EMPTY_ACCOUNTS: FinancialAccount[] = [];
const EMPTY_CATEGORIES: FinancialCategory[] = [];

type FinanceViewProps = {
  organizationId: OrganizationId;
  title: string;
  description: string;
  today: string;
  initialMonthKey: string;
};

export function FinanceView({
  organizationId,
  title,
  description,
  today,
  initialMonthKey,
}: FinanceViewProps) {
  const [tab, setTab] = useState<FinanceTab>("overview");
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [entryFormState, setEntryFormState] = useState<EntryFormState>({
    mode: "closed",
  });
  const [payment, setPayment] = useState<PaymentState>(null);
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(
    null,
  );
  const [openDialog, setOpenDialog] = useState<OpenDialog>("none");
  const accountsQuery = useFinancialAccountsQuery(organizationId);
  const categoriesQuery = useFinancialCategoriesQuery(organizationId);
  const accounts = accountsQuery.data ?? EMPTY_ACCOUNTS;
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;

  const openCreateForm = useCallback((kind: FinancialEntryKind) => {
    setEntryFormState({ mode: "create", kind });
  }, []);

  const openEditForm = useCallback((entry: FinancialEntry) => {
    setEntryFormState({ mode: "edit", entry });
  }, []);

  const openPayment = useCallback(
    (entry: FinancialEntry, paymentToday: string) =>
      setPayment({ entry, today: paymentToday }),
    [],
  );

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button
              variant="outline"
              className="h-10"
              onClick={() => openCreateForm("income")}
            >
              <Plus aria-hidden />
              <span className="max-sm:sr-only">Receita</span>
            </Button>
            <Button className="h-10" onClick={() => openCreateForm("expense")}>
              <Plus aria-hidden />
              <span className="max-sm:sr-only">Despesa</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10"
                    aria-label="Mais opções do financeiro"
                  />
                }
              >
                <MoreHorizontal aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem onClick={() => setOpenDialog("transfer")}>
                  <ArrowLeftRight aria-hidden />
                  Transferência entre contas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenDialog("accounts")}>
                  <Landmark aria-hidden />
                  Contas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenDialog("categories")}>
                  <Tags aria-hidden />
                  Categorias
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <PageContent>
        <Tabs
          value={tab}
          onValueChange={(value: string) => {
            const nextTab = FINANCE_TABS.find(
              (financeTab) => financeTab === value,
            );
            if (nextTab) setTab(nextTab);
          }}
          className="gap-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="group-data-horizontal/tabs:h-10">
              <TabsTrigger value="overview" className="px-3">
                Resumo
              </TabsTrigger>
              <TabsTrigger value="payables" className="px-3">
                A pagar
              </TabsTrigger>
              <TabsTrigger value="receivables" className="px-3">
                A receber
              </TabsTrigger>
              <TabsTrigger value="statement" className="px-3">
                Extrato
              </TabsTrigger>
            </TabsList>
            <MonthNavigator monthKey={monthKey} onChange={setMonthKey} />
          </div>
          <TabsContent value="overview">
            <FinanceOverview
              organizationId={organizationId}
              monthKey={monthKey}
              onPay={openPayment}
              onEdit={openEditForm}
              onDelete={setEntryToDelete}
              onOpenAccounts={() => setOpenDialog("accounts")}
            />
          </TabsContent>
          <TabsContent value="payables">
            <EntriesPanel
              organizationId={organizationId}
              kind="expense"
              monthKey={monthKey}
              onCreate={() => openCreateForm("expense")}
              onPay={openPayment}
              onEdit={openEditForm}
              onDelete={setEntryToDelete}
            />
          </TabsContent>
          <TabsContent value="receivables">
            <EntriesPanel
              organizationId={organizationId}
              kind="income"
              monthKey={monthKey}
              onCreate={() => openCreateForm("income")}
              onPay={openPayment}
              onEdit={openEditForm}
              onDelete={setEntryToDelete}
            />
          </TabsContent>
          <TabsContent value="statement">
            <StatementPanel
              organizationId={organizationId}
              monthKey={monthKey}
              accounts={accounts}
            />
          </TabsContent>
        </Tabs>
      </PageContent>

      <EntryFormDialog
        organizationId={organizationId}
        state={entryFormState}
        today={today}
        accounts={accounts}
        categories={categories}
        onClose={() => setEntryFormState({ mode: "closed" })}
      />
      <PayEntryDialog
        organizationId={organizationId}
        entry={payment?.entry ?? null}
        today={payment?.today ?? today}
        accounts={accounts}
        onClose={() => setPayment(null)}
      />
      <DeleteEntryDialog
        organizationId={organizationId}
        entry={entryToDelete}
        onClose={() => setEntryToDelete(null)}
      />
      <AccountsDialog
        organizationId={organizationId}
        isOpen={openDialog === "accounts"}
        accounts={accounts}
        onClose={() => setOpenDialog("none")}
      />
      <CategoriesDialog
        organizationId={organizationId}
        isOpen={openDialog === "categories"}
        categories={categories}
        onClose={() => setOpenDialog("none")}
      />
      <TransferDialog
        organizationId={organizationId}
        isOpen={openDialog === "transfer"}
        today={today}
        accounts={accounts}
        onClose={() => setOpenDialog("none")}
      />
    </>
  );
}
