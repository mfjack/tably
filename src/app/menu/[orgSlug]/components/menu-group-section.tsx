import { formatMenuPrice } from "@/features/menu/format-menu-price";
import {
  MENU_GROUP_LABELS,
  type MenuGroup,
  type PublicMenuSection,
} from "@/features/menu/types";
import { cn } from "@/lib/utils";
import {
  CupFrameIllustration,
  StackedCupsIllustration,
} from "./menu-illustrations";
import { MenuItemOrderControl } from "./menu-item-order-control";

type MenuGroupSectionProps = {
  menuSlug: string;
  acceptsOrders: boolean;
  group: MenuGroup;
  sections: readonly PublicMenuSection[];
  hasIllustrations: boolean;
  headingClassName: string;
  itemClassName: string;
};

export function MenuGroupSection({
  menuSlug,
  acceptsOrders,
  group,
  sections,
  hasIllustrations,
  headingClassName,
  itemClassName,
}: MenuGroupSectionProps) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className={cn(headingClassName, "text-4xl sm:text-5xl")}>
        {MENU_GROUP_LABELS[group]}
      </h2>
      <div
        className={cn(
          "grid gap-8",
          hasIllustrations && "sm:grid-cols-[minmax(0,1fr)_9rem]",
        )}
      >
        <div className="flex flex-col gap-7">
          {sections.map((section) => (
            <div key={section.name} className="flex flex-col gap-2">
              <h3 className={cn(headingClassName, "pl-2 text-2xl sm:text-3xl")}>
                {section.name.toLocaleLowerCase("pt-BR")}
              </h3>
              <ul
                className={cn(
                  itemClassName,
                  "flex flex-col gap-1 text-base sm:text-lg",
                  section.isHighlighted &&
                    "rounded-2xl border-2 border-black px-4 py-3",
                )}
              >
                {section.items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex justify-between gap-4",
                      acceptsOrders ? "items-center" : "items-baseline",
                    )}
                  >
                    <span className="lowercase">
                      {item.name}
                      {item.detail && ` ${item.detail}`}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="tabular-nums">
                        {formatMenuPrice(item.price)}
                      </span>
                      {acceptsOrders && (
                        <MenuItemOrderControl
                          menuSlug={menuSlug}
                          productId={item.id}
                          productName={item.name}
                        />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {hasIllustrations && (
          <div className="flex items-center justify-center gap-8 sm:flex-col sm:justify-between">
            <CupFrameIllustration className="w-24 sm:w-32" />
            <StackedCupsIllustration className="w-24 sm:w-32" />
          </div>
        )}
      </div>
    </section>
  );
}
