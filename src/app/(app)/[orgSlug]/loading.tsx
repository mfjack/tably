import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDER_ROWS = 6;

export default function OrganizationLoading() {
  return (
    <div className="flex flex-1 flex-col" role="status" aria-busy>
      <span className="sr-only">Carregando…</span>
      <div className="flex flex-col gap-2 px-4 pt-7 pb-1 md:px-8">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex flex-col gap-3 px-4 py-6 md:px-8">
        <Skeleton className="h-10 w-full sm:w-80" />
        {Array.from({ length: PLACEHOLDER_ROWS }, (_, rowIndex) => (
          <Skeleton
            key={`loading-row-${rowIndex.toString()}`}
            className="h-16 w-full rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
