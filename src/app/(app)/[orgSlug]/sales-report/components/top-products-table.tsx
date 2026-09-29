import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TopProduct } from "@/features/sales-report/types";
import { formatCurrency, formatPercent } from "@/lib/format";

type TopProductsTableProps = {
  products: readonly TopProduct[];
};

function formatProductCostShare(product: TopProduct) {
  return product.cost > 0 && product.revenue > 0
    ? formatPercent(product.cost / product.revenue)
    : "—";
}

export function TopProductsTable({ products }: TopProductsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-0">Produto</TableHead>
          <TableHead className="text-right">Qtd.</TableHead>
          <TableHead className="text-right">Faturamento</TableHead>
          <TableHead className="px-0 text-right">CMV</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.productName}>
            <TableCell className="max-w-48 truncate px-0 font-medium">
              {product.productName}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {product.quantity}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(product.revenue)}
            </TableCell>
            <TableCell className="px-0 text-right text-muted-foreground tabular-nums">
              {formatProductCostShare(product)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
