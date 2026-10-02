"use server";

import type { OrganizationId } from "@/features/organizations/types";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  ACCESS_DENIED,
  canUseFinance,
  getDefaultAccountId,
} from "./finance-core";
import {
  AUTOMATED_PAYMENT_METHODS,
  type AutomationSettingsInput,
  automationSettingsSchema,
} from "./schemas";
import type { FinanceAutomationSettings } from "./types";

export async function getFinanceAutomationSettings(
  organizationId: OrganizationId,
): Promise<ActionResult<FinanceAutomationSettings>> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const clock = await getOrganizationClock(organizationId);
  if (!clock) return actionFailure("Não foi possível carregar a automação.");

  const supabase = await createClient();
  await supabase
    .from("finance_automation_settings")
    .upsert(
      { organization_id: organizationId, start_date: clock.today },
      { onConflict: "organization_id", ignoreDuplicates: true },
    );

  const [settingsResult, methodsResult] = await Promise.all([
    supabase
      .from("finance_automation_settings")
      .select(
        "start_date, is_sales_enabled, is_customer_payments_enabled, is_stock_purchases_enabled, is_payroll_enabled",
      )
      .eq("organization_id", organizationId)
      .single(),
    supabase
      .from("finance_payment_method_settings")
      .select("payment_method, fee_percent, settlement_days")
      .eq("organization_id", organizationId),
  ]);

  if (settingsResult.error || methodsResult.error) {
    return actionFailure("Não foi possível carregar a automação.");
  }

  const methodsByKey = new Map(
    methodsResult.data.map((method) => [method.payment_method, method]),
  );
  const settings = settingsResult.data;
  const accountId = await getDefaultAccountId(organizationId);
  const { data: account } = accountId
    ? await supabase
        .from("financial_accounts")
        .select("opening_balance")
        .eq("id", accountId)
        .single()
    : { data: null };

  return actionSuccess({
    startDate: settings.start_date,
    openingBalance: account?.opening_balance ?? 0,
    isSalesEnabled: settings.is_sales_enabled,
    isCustomerPaymentsEnabled: settings.is_customer_payments_enabled,
    isStockPurchasesEnabled: settings.is_stock_purchases_enabled,

    isPayrollEnabled: settings.is_payroll_enabled,
    paymentMethods: AUTOMATED_PAYMENT_METHODS.map((paymentMethod) => {
      const method = methodsByKey.get(paymentMethod);
      return {
        paymentMethod,

        feePercent: method?.fee_percent ?? 0,
        settlementDays: method?.settlement_days ?? 0,
      };
    }),
  });
}

export async function saveFinanceAutomationSettings(
  organizationId: OrganizationId,
  input: AutomationSettingsInput,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const parsedInput = automationSettingsSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const settings = parsedInput.data;
  const accountId = await getDefaultAccountId(organizationId);
  if (!accountId)
    return actionFailure("Não foi possível salvar a configuração.");

  const supabase = await createClient();
  const [settingsResult, methodsResult, accountResult] = await Promise.all([
    supabase.from("finance_automation_settings").upsert({
      organization_id: organizationId,
      start_date: settings.startDate,
      is_sales_enabled: settings.isSalesEnabled,
      is_customer_payments_enabled: settings.isCustomerPaymentsEnabled,
      is_stock_purchases_enabled: settings.isStockPurchasesEnabled,
      stock_purchase_account_id: accountId,
      is_payroll_enabled: settings.isPayrollEnabled,
    }),
    supabase.from("finance_payment_method_settings").upsert(
      settings.paymentMethods.map((method) => ({
        organization_id: organizationId,
        payment_method: method.paymentMethod,
        account_id: accountId,
        fee_percent: method.feePercent ?? 0,
        settlement_days: method.settlementDays ?? 0,
      })),
    ),
    supabase
      .from("financial_accounts")
      .update({ opening_balance: settings.openingBalance ?? 0 })
      .eq("id", accountId),
  ]);

  if (settingsResult.error || methodsResult.error || accountResult.error) {
    return actionFailure("Não foi possível salvar a automação.");
  }
  return actionSuccess();
}
