"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function SidebarOverlay() {
  const pathname = usePathname();
  const { open, setOpen, isMobile, setOpenMobile } = useSidebar();
  const isOverlayVisible = open && !isMobile;

  const lastPathnameRef = useRef(pathname);

  useEffect(() => {
    if (lastPathnameRef.current === pathname) return;
    lastPathnameRef.current = pathname;
    setOpen(false);
    setOpenMobile(false);
  }, [pathname, setOpen, setOpenMobile]);

  useEffect(() => {
    if (!isOverlayVisible) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOverlayVisible, setOpen]);

  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-30 hidden bg-black/25 backdrop-blur-sm transition-opacity duration-200 md:block",
        isOverlayVisible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      onClick={() => setOpen(false)}
    />
  );
}
