import { Badge } from "@/components/ui/badge";
import { formatMenuPrice } from "@/features/menu/format-menu-price";
import type { PublicMenuSection } from "@/features/menu/types";
import { cn } from "@/lib/utils";
import { MenuItemOrderControl } from "./menu-item-order-control";
import { buildMenuSectionAnchor } from "./menu-section-anchor";

type MenuSectionProps = {
  menuSlug: string;
  acceptsOrders: boolean;
  section: PublicMenuSection;
};

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
      <h2 className="font-semibold text-xl tracking-tight">{section.name}</h2>
      <ul className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
        {section.items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex min-h-16 items-center gap-3 px-4 py-3",
              !item.isAvailable && "text-muted-foreground",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
                Tem, mas acabou
              </Badge>
            )}
            {acceptsOrders && item.isAvailable && (
              <MenuItemOrderControl
                menuSlug={menuSlug}
                productId={item.id}
                productName={item.name}
                price={item.price}
                addons={item.addons}
                remaining={item.remaining}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
