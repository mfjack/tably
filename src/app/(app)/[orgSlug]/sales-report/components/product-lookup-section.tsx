import { useState } from "react";
import { getCostShare } from "@/features/sales-report/report-metrics";
import type { SalesReport } from "@/features/sales-report/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { ReportFilterSelect } from "./report-filter-select";
import { ReportSection } from "./report-section";
import { ReportStat } from "./report-stat";

type ProductLookupSectionProps = {
  report: SalesReport;
};

function getProductKey(productId: string | null, productName: string) {
  return productId ?? `name:${productName}`;
}

export function ProductLookupSection({ report }: ProductLookupSectionProps) {
  const [selectedProductKey, setSelectedProductKey] = useState<string | null>(
    null,
  );
  const options = [...report.products]
    .sort((first, second) =>
      first.productName.localeCompare(second.productName, "pt-BR"),
    )
    .map((product) => ({
      value: getProductKey(product.productId, product.productName),
      label: product.productName,
    }));
  const selectedProduct = report.products.find(
    (product) =>
      getProductKey(product.productId, product.productName) ===
      selectedProductKey,
  );
  const costShare = selectedProduct
    ? getCostShare(selectedProduct.cost, selectedProduct.revenue)
    : null;

  return (
    <ReportSection
      title="Consulta por produto"
      description="Vendas de um item específico no período selecionado."
      actions={
        <ReportFilterSelect
          label="Produto"
          placeholder="Selecione um produto"
          options={options}
          value={selectedProductKey}
          onValueChange={setSelectedProductKey}
        />
      }
    >
      {selectedProduct && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <ReportStat
            label="Quantidade vendida"
            value={selectedProduct.quantity.toString()}
          />
          <ReportStat
            label="Faturamento"
            value={formatCurrency(selectedProduct.revenue)}
          />
          <ReportStat
            label="Pedidos"
            value={selectedProduct.orderCount.toString()}
          />
          <ReportStat
            label="Participação"
            value={
              report.summary.revenue > 0
                ? formatPercent(
                    selectedProduct.revenue / report.summary.revenue,
                  )
                : "—"
            }
          />
          <ReportStat
            label="CMV"
            value={costShare === null ? "—" : formatPercent(costShare)}
          />
        </div>
      )}
    </ReportSection>
  );
}
