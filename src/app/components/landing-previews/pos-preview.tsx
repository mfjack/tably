import {
  CreditCard,
  MessageSquareText,
  Printer,
  Search,
  ShoppingBag,
  Trash2,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const PREVIEW_CATEGORIES = ["Todos", "Lanches", "Porções", "Bebidas"] as const;

const PREVIEW_PRODUCTS = [
  { name: "X-Burguer", price: 28, cartQuantity: 2 },
  { name: "Fritas", price: 32, cartQuantity: 1 },
  { name: "Suco", price: 9, cartQuantity: 0 },
  { name: "Chope", price: 12, cartQuantity: 3 },
  { name: "Prato do dia", price: 35, cartQuantity: 0 },
  { name: "Sobremesa", price: 15, cartQuantity: 0 },
] as const;

const PREVIEW_CART = [
  { name: "X-Burguer", quantity: 2, total: 56, note: "sem cebola" },
  { name: "Fritas", quantity: 1, total: 32, note: null },
  { name: "Chope", quantity: 3, total: 36, note: null },
] as const;

export function PosPreview() {
  const cartTotal = PREVIEW_CART.reduce((total, item) => total + item.total, 0);

  return (
    <div className="flex h-full w-full">
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-bold text-sm">Bar do Centro</span>
            <span className="text-[0.625rem] text-muted-foreground">
              Sexta, 2 de outubro
            </span>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[0.625rem]">
            <Wallet className="size-3" />
            Caixa
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </span>
        </div>
        <div className="flex gap-1.5 overflow-hidden">
          {PREVIEW_CATEGORIES.map((category, index) => (
            <span
              key={category}
              className={cn(
                "shrink-0 rounded-lg border px-2 py-1 text-[0.625rem]",
                index === 0 &&
                  "border-primary bg-primary text-primary-foreground",
              )}
            >
              {category}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1.5 text-[0.625rem] text-muted-foreground">
          <Search className="size-3" />
          Buscar produto
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PREVIEW_PRODUCTS.map((product) => (
            <div
              key={product.name}
              className={cn(
                "relative flex flex-col gap-1.5 rounded-xl border bg-card p-1.5",
                product.cartQuantity > 0 && "border-primary bg-primary/5",
              )}
            >
              {product.cartQuantity > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary font-bold text-[0.5625rem] text-primary-foreground">
                  {product.cartQuantity}
                </span>
              )}
              <div className="flex h-9 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground/70">
                <ShoppingBag className="size-3.5" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col px-0.5">
                <span className="truncate font-semibold text-[0.6875rem]">
                  {product.name}
                </span>
                <span className="text-[0.625rem] text-muted-foreground">
                  {formatCurrency(product.price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-40 shrink-0 flex-col border-l bg-muted/40 sm:w-52">
        <div className="flex flex-1 flex-col gap-1.5 p-2 sm:p-2.5">
          {PREVIEW_CART.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-1.5 rounded-lg border bg-card p-1.5"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border font-bold text-[0.5625rem]">
                {item.quantity}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold text-[0.625rem]">
                  {item.name}
                </span>
                {item.note && (
                  <span className="truncate text-[0.5625rem] text-primary">
                    ↳ {item.note}
                  </span>
                )}
                <span className="text-[0.5625rem] text-muted-foreground">
                  {formatCurrency(item.total)}
                </span>
              </div>
              <span className="hidden size-5 shrink-0 items-center justify-center rounded-md border sm:flex">
                <MessageSquareText className="size-2.5" />
              </span>
              <span className="hidden size-5 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive sm:flex">
                <Trash2 className="size-2.5" />
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 border-t bg-background p-2 sm:p-2.5">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-[0.6875rem]">Total</span>
            <span className="font-bold text-xs tabular-nums">
              {formatCurrency(cartTotal)}
            </span>
          </div>
          <span className="flex items-center justify-center gap-1 rounded-lg bg-primary py-1.5 font-semibold text-[0.625rem] text-primary-foreground">
            <Printer className="size-3" />
            Imprimir pedido
          </span>
          <span className="flex items-center justify-center gap-1 rounded-lg border border-primary py-1.5 font-semibold text-[0.625rem] text-primary">
            <CreditCard className="size-3" />
            Pagamento
          </span>
        </div>
      </div>
    </div>
  );
}
