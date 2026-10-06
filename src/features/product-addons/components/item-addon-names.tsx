import { cn } from "@/lib/utils";

type ItemAddonNamesProps = {
  addonNames?: readonly string[];
  className?: string;
};

export function ItemAddonNames({ addonNames, className }: ItemAddonNamesProps) {
  if (!addonNames?.length) return null;
  return (
    <span
      className={cn(
        "flex flex-col font-normal text-muted-foreground text-xs",
        className,
      )}
    >
      {addonNames.map((addonName) => (
        <span key={addonName} className="truncate">
          + {addonName}
        </span>
      ))}
    </span>
  );
}
