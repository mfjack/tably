import "server-only";

import { cache } from "react";
import { getCurrentUserId } from "@/features/auth/queries";
import { DEFAULT_STAMPS_REQUIRED } from "@/features/loyalty/schemas";
import type { LoyaltyProgram, LoyaltySettings } from "@/features/loyalty/types";
import { APP_MODULES } from "@/features/modules/app-modules";
import {
  getPlanHiddenModules,
  type Subscription,
} from "@/features/subscriptions/subscription-state";
import { createClient } from "@/lib/supabase/server";
import type { AppModuleId, OrganizationId, UserOrganization } from "./types";

const APP_MODULE_IDS = APP_MODULES.map(({ id }) => id);

type SubscriptionRow = {
  plan: Subscription["plan"];
  billing_cycle: Subscription["billingCycle"];
  monthly_price: number;
  yearly_price: number;
  trial_ends_at: string;
  paid_until: string | null;
  payment_reported_at: string | null;
} | null;

type LoyaltySettingsRow = {
  is_enabled: boolean;
  stamps_required: number;
  minimum_purchase: number;
  reward_description: string;
} | null;

function toLoyaltySettings(row: LoyaltySettingsRow): LoyaltySettings {
  return {
    isEnabled: row?.is_enabled ?? false,
    stampsRequired: row?.stamps_required ?? DEFAULT_STAMPS_REQUIRED,
    minimumPurchase: row?.minimum_purchase ?? 0,
    rewardDescription: row?.reward_description ?? "",
  };
}

function toLoyaltyProgram(
  settings: LoyaltySettings,
  hiddenModules: readonly AppModuleId[],
): LoyaltyProgram | null {
  if (!settings.isEnabled || hiddenModules.includes("loyalty")) return null;
  const { isEnabled: _isEnabled, ...program } = settings;
  return program;
}

function toSubscription(row: SubscriptionRow): Subscription | null {
  if (!row) return null;
  return {
    plan: row.plan,
    billingCycle: row.billing_cycle,
    monthlyPrice: row.monthly_price,
    yearlyPrice: row.yearly_price,
    trialEndsAt: row.trial_ends_at,
    paidUntil: row.paid_until,
    paymentReportedAt: row.payment_reported_at,
  };
}

const USER_ORGANIZATION_COLUMNS =
  "id, name, slug, hidden_modules, takeaway_fee, is_takeaway_enabled, service_fee_percent, is_service_fee_enabled, is_discount_enabled, is_split_bill_enabled, is_customer_account_payment_enabled, credit_card_fee_percent, debit_card_fee_percent, pix_fee_percent, tax_id, phone, address, menu_title, menu_tagline, menu_instagram, menu_note, is_online_ordering_enabled, memberships!inner(role, user_id), subscription:subscriptions(plan, billing_cycle, monthly_price, yearly_price, trial_ends_at, paid_until, payment_reported_at), loyalty:loyalty_settings(is_enabled, stamps_required, minimum_purchase, reward_description)";

export const getUserOrganizations = cache(
  async (): Promise<UserOrganization[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organizations")
      .select(USER_ORGANIZATION_COLUMNS)
      .eq("memberships.user_id", userId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return data.map((organization) => {
      const subscription = toSubscription(organization.subscription);
      const loyalty = toLoyaltySettings(organization.loyalty);
      const hiddenModules: AppModuleId[] = [
        ...organization.hidden_modules,
        ...getPlanHiddenModules(subscription, APP_MODULE_IDS),
        ...(loyalty.isEnabled ? [] : (["loyalty"] as const)),
      ];

      return {
        id: organization.id as OrganizationId,
        name: organization.name,
        slug: organization.slug,
        role: organization.memberships[0].role,
        hiddenModules,
        subscription,
        loyalty,
        takeawayFee: organization.takeaway_fee,
        isTakeawayEnabled: organization.is_takeaway_enabled,
        taxId: organization.tax_id,
        phone: organization.phone,
        address: organization.address,
        menu: {
          isOnlineOrderingEnabled: organization.is_online_ordering_enabled,
          title: organization.menu_title,
          tagline: organization.menu_tagline,
          instagram: organization.menu_instagram,
          note: organization.menu_note,
        },
        checkout: {
          isServiceFeeEnabled: organization.is_service_fee_enabled,
          serviceFeePercent: organization.service_fee_percent,
          isDiscountEnabled: organization.is_discount_enabled,
          isSplitBillEnabled: organization.is_split_bill_enabled,
          isCustomerAccountPaymentEnabled:
            organization.is_customer_account_payment_enabled,
          loyaltyProgram: toLoyaltyProgram(loyalty, hiddenModules),
        },
        paymentFees: {
          creditCardFeePercent: organization.credit_card_fee_percent,
          debitCardFeePercent: organization.debit_card_fee_percent,
          pixFeePercent: organization.pix_fee_percent,
        },
      };
    });
  },
);

export async function getUserOrganizationBySlug(
  slug: string,
): Promise<UserOrganization | null> {
  const organizations = await getUserOrganizations();
  return (
    organizations.find((organization) => organization.slug === slug) ?? null
  );
}
