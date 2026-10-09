"use client";

import { useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";

const PRELOAD_DISTANCE = "240px";

type DataTableLoadMoreProps = {
  onLoadMore: () => void;
};

export function DataTableLoadMore({ onLoadMore }: DataTableLoadMoreProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin: PRELOAD_DISTANCE },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sentinelRef}
      role="status"
      className="flex items-center justify-center gap-2 py-3 text-muted-foreground text-sm"
    >
      <Spinner aria-hidden />
      Carregando mais…
    </div>
  );
}
