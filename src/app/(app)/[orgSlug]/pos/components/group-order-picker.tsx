import { Check } from "lucide-react";
import { OrderSummary } from "@/features/orders/components/order-summary";
import { cn } from "@/lib/utils";
import { getGroupKey, toGroupSummary } from "../hooks/use-group-checkout";
import type { TabOrderGroup } from "../hooks/use-pos-checkout";

type GroupOrderPickerProps = {
  groups: readonly TabOrderGroup[];
  selectedKeys: ReadonlySet<string>;
  onToggle: (groupKey: string) => void;
};

export function GroupOrderPicker({
  groups,
  selectedKeys,
  onToggle,
}: GroupOrderPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium text-sm">
        Quais pedidos vai receber agora?
      </legend>
      <div className="flex max-h-[24rem] flex-col gap-2 overflow-y-auto p-0.5">
        {groups.map((group) => {
          const groupKey = getGroupKey(group);
          const isSelected = selectedKeys.has(groupKey);
          return (
            <button
              key={groupKey}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(groupKey)}
              className={cn(
                "relative rounded-xl border p-4 text-left transition-colors",
                isSelected
                  ? "border-primary ring-1 ring-primary"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-4 right-4 flex size-5 items-center justify-center rounded-full border",
                  isSelected &&
                    "border-primary bg-primary text-primary-foreground",
                )}
              >
                {isSelected && <Check className="size-3.5" />}
              </span>
              <OrderSummary summary={toGroupSummary(group)} />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
