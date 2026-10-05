"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  SIDEBAR_ACTIVE_ITEM_CLASS_NAME,
  SIDEBAR_ITEM_CLASS_NAME,
} from "./sidebar-item-styles";

type SidebarLinkProps = {
  href: string;
  activeHrefs?: readonly string[];
  label: string;
  icon: LucideIcon;
};

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarLink({
  href,
  activeHrefs = [],
  label,
  icon: Icon,
}: SidebarLinkProps) {
  const pathname = usePathname();
  const { setOpen, setOpenMobile } = useSidebar();
  const isActive = [href, ...activeHrefs].some((candidate) =>
    matchesPath(pathname, candidate),
  );

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={label}
        className={cn(SIDEBAR_ITEM_CLASS_NAME, SIDEBAR_ACTIVE_ITEM_CLASS_NAME)}
        render={
          <Link
            href={href}
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              setOpen(false);
              setOpenMobile(false);
            }}
          />
        }
      >
        <Icon aria-hidden />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
