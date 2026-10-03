import { Badge } from "@/components/ui/badge";
import type { CategoryId } from "@/features/categories/types";
import { formatMenuPrice } from "@/features/menu/format-menu-price";
import type { PublicMenuSection } from "@/features/menu/types";
import { cn } from "@/lib/utils";
import { MenuItemOrderControl } from "./menu-item-order-control";

type MenuSectionProps = {
  menuSlug: string;
  acceptsOrders: boolean;
  section: PublicMenuSection;
};

export function buildMenuSectionAnchor(categoryId: CategoryId) {
  return `category-${categoryId}`;
}

export function MenuSection({
  menuSlug,
  acceptsOrders,
  section,
}: MenuSectionProps) {
  return (
    <section
      id={buildMenuSectionAnchor(section.id)}
      className="flex scroll-mt-20 flex-col gap-3"
    >
      <h2 className="font-semibold text-xl">{section.name}</h2>
      <ul className="flex flex-col gap-2">
        {section.items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex min-h-16 items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs",
              !item.isAvailable && "opacity-60",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{item.name}</span>
              {item.detail && (
                <span className="text-muted-foreground text-sm">
                  {item.detail}
                </span>
              )}
            </div>
            {item.isAvailable ? (
              <span className="shrink-0 font-semibold tabular-nums">
                {formatMenuPrice(item.price)}
              </span>
            ) : (
              <Badge variant="secondary" className="shrink-0">
                Esgotado
              </Badge>
            )}
            {acceptsOrders && item.isAvailable && (
              <MenuItemOrderControl
                menuSlug={menuSlug}
                productId={item.id}
                productName={item.name}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
