"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 px-5"
      onClick={() => window.location.reload()}
    >
      <RotateCw aria-hidden />
      Tentar de novo
    </Button>
  );
}
