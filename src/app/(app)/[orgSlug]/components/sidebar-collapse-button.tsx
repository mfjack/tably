"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SIDEBAR_ITEM_CLASS_NAME } from "./sidebar-item-styles";

export function SidebarCollapseButton() {
  const { state, isMobile, toggleSidebar } = useSidebar();

  if (isMobile) return null;

  const isExpanded = state === "expanded";
  const label = isExpanded ? "Recolher menu" : "Expandir menu";
  const Icon = isExpanded ? PanelLeftClose : PanelLeftOpen;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={label}
        aria-keyshortcuts="Control+B"
        aria-expanded={isExpanded}
        className={SIDEBAR_ITEM_CLASS_NAME}
        onClick={toggleSidebar}
      >
        <Icon aria-hidden />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
