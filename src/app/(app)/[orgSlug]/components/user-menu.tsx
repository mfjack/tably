"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { getUserDisplayName } from "@/features/auth/display-name";
import { useSignOutMutation } from "@/features/auth/hooks/use-sign-out-mutation";
import type { CurrentUser } from "@/features/auth/types";
import { getInitials } from "@/lib/get-initials";

type UserMenuProps = {
  currentUser: CurrentUser;
};

export function UserMenu({ currentUser }: UserMenuProps) {
  const { isMobile } = useSidebar();
  const signOutMutation = useSignOutMutation();
  const displayName = getUserDisplayName(currentUser);

  function handleSignOut() {
    signOutMutation.mutate(undefined, {
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" aria-label="Menu do usuário" />
            }
          >
            <UserAvatar currentUser={currentUser} displayName={displayName} />
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate font-medium text-sidebar-accent-foreground">
                {displayName}
              </span>
              {currentUser.fullName && (
                <span className="truncate text-xs">{currentUser.email}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-auto" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            align="end"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">
                {currentUser.email}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={signOutMutation.isPending}
              onClick={handleSignOut}
            >
              <LogOut aria-hidden />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

type UserAvatarProps = {
  currentUser: CurrentUser;
  displayName: string;
};

const USER_AVATAR_SIZE = 32;

function UserAvatar({ currentUser, displayName }: UserAvatarProps) {
  if (currentUser.avatarUrl) {
    return (
      <Image
        src={currentUser.avatarUrl}
        alt={displayName}
        width={USER_AVATAR_SIZE}
        height={USER_AVATAR_SIZE}
        className="size-8 shrink-0 rounded-lg object-cover"
      />
    );
  }

  return (
    <Avatar className="size-8 rounded-lg">
      <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs">
        {getInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}
