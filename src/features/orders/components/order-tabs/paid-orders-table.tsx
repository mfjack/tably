"use client";

import { format } from "date-fns";
import { History, ReceiptText } from "lucide-react";
import { useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { DataTableRowActionButton } from "@/components/data-table/data-table-row-action-button";
import { useDataTable } from "@/components/data-table/use-data-table";
import { DatePicker } from "@/components/date-picker";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getOrderCustomerLabel } from "@/features/orders/order-details-ticket";
import { formatOrderPaymentMethods } from "@/features/orders/order-payments";
import type { OrderDetails } from "@/features/orders/types";
import { formatCurrency } from "@/lib/format";

const EMPTY_ORDERS: OrderDetails[] = [];

const columnHelper = createDataTableColumnHelper<OrderDetails>();

type PaidOrdersTableProps = {
  orders: OrderDetails[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  dateKey: string;
  onDateChange: (dateKey: string) => void;
  onSelect: (order: OrderDetails) => void;
};

function getOrderRowId(order: OrderDetails) {
  return order.id;
}

function getOrderPaidAt(order: OrderDetails) {
  return order.paidAt ?? order.createdAt;
}

function getOrderPaymentLabel(order: OrderDetails) {
  return formatOrderPaymentMethods(order);
}

export function PaidOrdersTable({
  orders,
  isLoading,
  errorMessage,
  dateKey,
  onDateChange,
  onSelect,
}: PaidOrdersTableProps) {
  const salesTotal = (orders ?? EMPTY_ORDERS).reduce(
    (total, order) => total + order.total,
    0,
  );
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor(getOrderPaidAt, {
          id: "paidAt",
          header: "Data",
          enableGlobalFilter: false,
          cell: ({ getValue }) => (
            <span className="tabular-nums">
              {format(new Date(getValue()), "dd/MM/yyyy, HH:mm")}
            </span>
          ),
        }),
        columnHelper.accessor(getOrderCustomerLabel, {
          id: "customer",
          header: "Cliente",
          cell: ({ getValue }) => (
            <span className="font-medium">{getValue()}</span>
          ),
        }),
        columnHelper.accessor(getOrderPaymentLabel, {
          id: "paymentMethod",
          header: "Pagamento",
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{getValue()}</span>
          ),
        }),
        columnHelper.accessor("total", {
          header: "Total",
          enableGlobalFilter: false,
          cell: ({ getValue }) => (
            <span className="font-medium tabular-nums">
              {formatCurrency(getValue())}
            </span>
          ),
        }),
        columnHelper.display({
          id: "actions",
          header: () => <span className="sr-only">Ações</span>,
          cell: ({ row }) => (
            <div className="flex justify-end">
              <DataTableRowActionButton
                label="Ver detalhes"
                accessibleLabel={`Ver detalhes da comanda de ${getOrderCustomerLabel(row.original)}`}
                icon={ReceiptText}
                onClick={() => onSelect(row.original)}
              />
            </div>
          ),
        }),
      ]),
    [onSelect],
  );

  const table = useDataTable({
    data: orders ?? EMPTY_ORDERS,
    columns,
    getRowId: getOrderRowId,
  });

  return (
    <DataTable
      table={table}
      searchPlaceholder="Buscar por cliente"
      toolbarActions={
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-44">
            <DatePicker
              value={dateKey}
              placeholder="Últimas vendas"
              className="h-10 rounded-lg bg-muted px-3 text-sm"
              onChange={onDateChange}
            />
          </div>
          {dateKey && orders && (
            <span className="text-muted-foreground text-sm tabular-nums">
              {orders.length} {orders.length === 1 ? "venda" : "vendas"} ·{" "}
              {formatCurrency(salesTotal)}
            </span>
          )}
        </div>
      }
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyState={
        <Empty className="flex-1 border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <History aria-hidden />
            </EmptyMedia>
            <EmptyTitle>
              {dateKey ? "Nenhuma venda nesse dia" : "Nenhuma venda ainda"}
            </EmptyTitle>
            <EmptyDescription>
              {dateKey
                ? "Escolha outra data ou limpe o filtro."
                : "As comandas e pedidos pagos aparecem aqui."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
