"use client";

import {
  FileSpreadsheet,
  MoreHorizontal,
  Tags,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayEntryDialog } from "@/features/finance/components/pay-entry-dialog";
import { sortPaidEntriesLast } from "@/features/finance/entry-order";
import { useFinancialCategoriesQuery } from "@/features/finance/hooks/use-financial-categories-query";
import { useFinancialOverviewQuery } from "@/features/finance/hooks/use-financial-overview-query";
import type {
  FinancialCategory,
  FinancialEntry,
  FinancialEntryKind,
} from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  formatMonthLabel,
  parseMonthKey,
} from "@/features/time-clock/time-utils";
import { useSearchParamState } from "@/hooks/use-search-param-state";
import { MonthNavigator } from "../../components/month-navigator";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { DEFAULT_FINANCE_TAB, parseFinanceTab } from "../finance-search-params";
import { AnalysisPanel } from "./analysis-panel";
import { CategoriesDialog } from "./categories-dialog";
import { DeleteEntryDialog } from "./delete-entry-dialog";
import { EntriesPanel } from "./entries-panel";
import { EntryFormDialog, type EntryFormState } from "./entry-form-dialog";
import { FinanceOverview } from "./finance-overview";
import { OpeningBalanceDialog } from "./opening-balance-dialog";

type OpenDialog = "none" | "categories" | "opening-balance";

type PaymentState = { entry: FinancialEntry; today: string } | null;

const EMPTY_CATEGORIES: FinancialCategory[] = [];

type FinanceViewProps = {
  organizationId: OrganizationId;
  organizationName: string;
  title: string;
  description: string;
  today: string;
  initialMonthKey: string;
};

export function FinanceView({
  organizationId,
  organizationName,
  title,
  description,
  today,
  initialMonthKey,
}: FinanceViewProps) {
  const [tab, setTab] = useSearchParamState({
    key: "tab",
    defaultValue: DEFAULT_FINANCE_TAB,
    parse: parseFinanceTab,
  });
  const [monthKey, setMonthKey] = useSearchParamState({
    key: "month",
    defaultValue: initialMonthKey,
    parse: parseMonthKey,
  });
  const [entryFormState, setEntryFormState] = useState<EntryFormState>({
    mode: "closed",
  });
  const [payment, setPayment] = useState<PaymentState>(null);
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(
    null,
  );
  const [openDialog, setOpenDialog] = useState<OpenDialog>("none");
  const categoriesQuery = useFinancialCategoriesQuery(organizationId);
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const overviewQuery = useFinancialOverviewQuery(organizationId, monthKey);
  const firstMonthKey = overviewQuery.data?.firstMonthKey;

  useEffect(() => {
    if (firstMonthKey && monthKey < firstMonthKey) setMonthKey(firstMonthKey);
  }, [firstMonthKey, monthKey, setMonthKey]);
  const [isExporting, setIsExporting] = useState(false);

  async function exportMonth() {
    const overview = overviewQuery.data;
    if (!overview) return;
    setIsExporting(true);
    try {
      const { exportFinanceExcel } = await import(
        "@/features/finance/export-finance-excel"
      );
      await exportFinanceExcel({
        businessName: organizationName,
        monthLabel: formatMonthLabel(monthKey),
        monthKey,
        today: overview.today,
        entries: sortPaidEntriesLast(overview.monthEntries),
      });
    } catch {
      toast.error("Não foi possível gerar a planilha.");
    } finally {
      setIsExporting(false);
    }
  }

  const openCreateForm = useCallback((kind: FinancialEntryKind) => {
    setEntryFormState({ mode: "create", kind });
  }, []);

  const openEditForm = useCallback((entry: FinancialEntry) => {
    setEntryFormState({ mode: "edit", entry });
  }, []);

  function changeTab(value: string) {
    const nextTab = parseFinanceTab(value);
    if (nextTab) setTab(nextTab);
  }

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
              <TrendingUp aria-hidden />
              <span className="max-sm:sr-only">Receita</span>
            </Button>
            <Button className="h-10" onClick={() => openCreateForm("expense")}>
              <TrendingDown aria-hidden />
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
                <DropdownMenuItem
                  onClick={() => setOpenDialog("opening-balance")}
                >
                  <Wallet aria-hidden />
                  Saldo inicial
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenDialog("categories")}>
                  <Tags aria-hidden />
                  Categorias
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!overviewQuery.data || isExporting}
                  onClick={() => void exportMonth()}
                >
                  <FileSpreadsheet aria-hidden />
                  Baixar Excel do mês
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <PageContent>
        <Tabs value={tab} onValueChange={changeTab} className="min-h-0 gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="max-w-full justify-start overflow-x-auto group-data-horizontal/tabs:h-10">
              <TabsTrigger value="overview" className="px-3">
                Resumo
              </TabsTrigger>
              <TabsTrigger value="payables" className="px-3">
                A pagar
              </TabsTrigger>
              <TabsTrigger value="analysis" className="px-3">
                Análises
              </TabsTrigger>
            </TabsList>
            <MonthNavigator
              monthKey={monthKey}
              minMonthKey={firstMonthKey}
              onChange={setMonthKey}
            />
          </div>
          <TabsContent value="overview" className="min-h-0 overflow-y-auto">
            <FinanceOverview
              organizationId={organizationId}
              monthKey={monthKey}
              onPay={openPayment}
              onEdit={openEditForm}
              onDelete={setEntryToDelete}
            />
          </TabsContent>
          <TabsContent value="payables" className="min-h-0 overflow-y-auto">
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
          <TabsContent value="analysis" className="min-h-0 overflow-y-auto">
            <AnalysisPanel
              organizationId={organizationId}
              monthKey={monthKey}
            />
          </TabsContent>
        </Tabs>
      </PageContent>

      <EntryFormDialog
        organizationId={organizationId}
        state={entryFormState}
        today={today}
        categories={categories}
        onClose={() => setEntryFormState({ mode: "closed" })}
      />
      <PayEntryDialog
        organizationId={organizationId}
        entry={payment?.entry ?? null}
        today={payment?.today ?? today}
        onClose={() => setPayment(null)}
      />
      <DeleteEntryDialog
        organizationId={organizationId}
        entry={entryToDelete}
        onClose={() => setEntryToDelete(null)}
      />
      <CategoriesDialog
        organizationId={organizationId}
        isOpen={openDialog === "categories"}
        categories={categories}
        onClose={() => setOpenDialog("none")}
      />
      <OpeningBalanceDialog
        organizationId={organizationId}
        isOpen={openDialog === "opening-balance"}
        onClose={() => setOpenDialog("none")}
      />
    </>
  );
}
