import type { LoyaltyProgram, LoyaltySettings } from "@/features/loyalty/types";
import type { Subscription } from "@/features/subscriptions/subscription-state";
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
  menu: OrganizationMenuSettings;
  checkout: OrganizationCheckoutSettings;
  paymentFees: OrganizationPaymentFees;
  loyalty: LoyaltySettings;
  subscription: Subscription | null;
};

export type OrganizationCheckoutSettings = {
  isServiceFeeEnabled: boolean;
  serviceFeePercent: number;
  isDiscountEnabled: boolean;
  isSplitBillEnabled: boolean;
  isCustomerAccountPaymentEnabled: boolean;
  loyaltyProgram: LoyaltyProgram | null;
  paymentFees: OrganizationPaymentFees;
};

export type OrganizationPaymentFees = {
  creditCardFeePercent: number;
  debitCardFeePercent: number;
  pixFeePercent: number;
  isPassedOnToCustomer: boolean;
};

export type OrganizationMenuSettings = {
  isOnlineOrderingEnabled: boolean;
  title: string | null;
  tagline: string | null;
  instagram: string | null;
  note: string | null;
};
