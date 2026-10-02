import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const VISIBLE_INGREDIENT_LIMIT = 2;

type IngredientShortageLineProps = {
  label: string;
  ingredientNames: readonly string[];
  className?: string;
};

export function IngredientShortageLine({
  label,
  ingredientNames,
  className,
}: IngredientShortageLineProps) {
  if (ingredientNames.length === 0) return null;

  const visibleNames = ingredientNames.slice(0, VISIBLE_INGREDIENT_LIMIT);
  const hiddenCount = ingredientNames.length - visibleNames.length;
  const fullText = `${label}: ${ingredientNames.join(", ")}`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "flex max-w-56 cursor-default items-center gap-1 text-xs",
              className,
            )}
          />
        }
      >
        <span className="sr-only">{fullText}</span>
        <span aria-hidden className="truncate">
          {label}: {visibleNames.join(", ")}
        </span>
        {hiddenCount > 0 && (
          <span aria-hidden className="shrink-0 font-semibold">
            +{hiddenCount}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{fullText}</TooltipContent>
    </Tooltip>
  );
}
