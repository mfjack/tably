import "server-only";

import { cache } from "react";
import { getCurrentUserId } from "@/features/auth/queries";
import { APP_MODULES } from "@/features/modules/app-modules";
import {
  getPlanHiddenModules,
  type Subscription,
} from "@/features/subscriptions/subscription-state";
import { createClient } from "@/lib/supabase/server";
import type { OrganizationId, UserOrganization } from "./types";

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
  "id, name, slug, hidden_modules, takeaway_fee, is_takeaway_enabled, service_fee_percent, is_service_fee_enabled, is_discount_enabled, is_split_bill_enabled, is_customer_account_payment_enabled, tax_id, phone, address, is_menu_published, menu_title, menu_tagline, menu_instagram, menu_note, is_online_ordering_enabled, memberships!inner(role, user_id), subscription:subscriptions(plan, billing_cycle, monthly_price, yearly_price, trial_ends_at, paid_until, payment_reported_at)";

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

    return data.map((organization) => ({
      id: organization.id as OrganizationId,
      name: organization.name,
      slug: organization.slug,
      role: organization.memberships[0].role,
      hiddenModules: [
        ...organization.hidden_modules,
        ...getPlanHiddenModules(
          toSubscription(organization.subscription),
          APP_MODULE_IDS,
        ),
      ],
      subscription: toSubscription(organization.subscription),
      takeawayFee: organization.takeaway_fee,
      isTakeawayEnabled: organization.is_takeaway_enabled,
      taxId: organization.tax_id,
      phone: organization.phone,
      address: organization.address,
      menu: {
        isPublished: organization.is_menu_published,
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
      },
    }));
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
