"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  buildOrganizationPath,
  DEFAULT_MODULE_PATH,
} from "@/features/modules/app-modules";
import { MEMBER_ROLE_LABELS } from "@/features/organizations/constants";
import type { UserOrganization } from "@/features/organizations/types";
import { getInitials } from "@/lib/get-initials";
import { ROUTES } from "@/lib/routes";

type OrganizationSwitcherProps = {
  activeOrganization: UserOrganization;
  organizations: UserOrganization[];
};

export function OrganizationSwitcher({
  activeOrganization,
  organizations,
}: OrganizationSwitcherProps) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={`Estabelecimento atual: ${activeOrganization.name}`}
              />
            }
          >
            <OrganizationAvatar name={activeOrganization.name} />
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate font-semibold text-sidebar-accent-foreground">
                {activeOrganization.name}
              </span>
              <span className="truncate text-xs">
                {MEMBER_ROLE_LABELS[activeOrganization.role]}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-60"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Estabelecimentos</DropdownMenuLabel>
              {organizations.map((organization) => (
                <DropdownMenuItem
                  key={organization.id}
                  render={
                    <Link
                      href={buildOrganizationPath(
                        organization.slug,
                        DEFAULT_MODULE_PATH,
                      )}
                    />
                  }
                >
                  <OrganizationAvatar name={organization.name} />
                  <span className="flex-1 truncate">{organization.name}</span>
                  {organization.id === activeOrganization.id && (
                    <Check aria-label="Atual" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href={ROUTES.newOrganization} />}>
              <Plus aria-hidden />
              Novo estabelecimento
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

type OrganizationAvatarProps = {
  name: string;
};

function OrganizationAvatar({ name }: OrganizationAvatarProps) {
  return (
    <div
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-semibold text-sidebar-primary-foreground text-xs"
    >
      {getInitials(name)}
    </div>
  );
}
