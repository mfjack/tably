import type { UserId } from "@/features/auth/types";
import type { AppModuleId } from "@/features/organizations/types";
import type { Brand } from "@/lib/brand";

export type InvitationId = Brand<string, "InvitationId">;

export type InvitationStatus = "pending" | "expired" | "accepted";

export type TeamMember = {
  userId: UserId;
  name: string;
  email: string;
  isOwner: boolean;
  allowedModules: AppModuleId[] | null;
  canAccessSettings: boolean;
  joinedAt: string;
};

export type Invitation = {
  id: InvitationId;
  inviteeName: string;
  token: string;
  allowedModules: AppModuleId[];
  canAccessSettings: boolean;
  expiresAt: string;
  status: Exclude<InvitationStatus, "accepted">;
};

export type Team = {
  members: TeamMember[];
  invitations: Invitation[];
  maxMembers: number | null;
};

export type TeamMemberSummary = {
  userId: UserId;
  name: string;
};

export type InvitationPreview = {
  organizationName: string;
  inviteeName: string;
  status: InvitationStatus;
};
