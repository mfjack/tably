import type { LucideIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductSales } from "@/features/sales-report/types";
import { formatCurrency } from "@/lib/format";
import { ReportSection } from "./report-section";

type ProductsRankingSectionProps = {
  title: string;
  icon: LucideIcon;
  products: readonly ProductSales[];
  emptyMessage: string;
};

export function ProductsRankingSection({
  title,
  icon,
  products,
  emptyMessage,
}: ProductsRankingSectionProps) {
  return (
    <ReportSection title={title} icon={icon}>
      {products.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground text-sm">
          {emptyMessage}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-0">Produto</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead className="px-0 text-right">Faturamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.productId ?? product.productName}>
                <TableCell className="max-w-48 px-0">
                  <span className="block truncate font-medium">
                    {product.productName}
                  </span>
                  {product.categoryName && (
                    <span className="block truncate text-muted-foreground text-xs">
                      {product.categoryName}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {product.quantity}
                </TableCell>
                <TableCell className="px-0 text-right tabular-nums">
                  {formatCurrency(product.revenue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ReportSection>
  );
}
