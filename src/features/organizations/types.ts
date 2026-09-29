import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type OrganizationId = Brand<string, "OrganizationId">;

export type MemberRole = Database["public"]["Enums"]["member_role"];

export type AppModuleId = Database["public"]["Enums"]["app_module"];

export type UserOrganization = {
  id: OrganizationId;
  name: string;
  slug: string;
  role: MemberRole;
  hiddenModules: AppModuleId[];
  takeawayFee: number;
  isTakeawayEnabled: boolean;
  taxId: string | null;
  phone: string | null;
  address: string | null;
};
