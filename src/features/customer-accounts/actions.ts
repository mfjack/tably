"use server";

import type { OrderId } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  type AccountPaymentInput,
  type CustomerAccountInput,
  createAccountPaymentSchema,
  customerAccountSchema,
} from "./schemas";
import type { AccountEntry, CustomerAccount, CustomerAccountId } from "./types";

const ACCOUNT_ENTRIES_LIMIT = 200;

const ACCOUNT_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  "23505": "Já existe uma conta com esse nome.",
  "42501": "Você não tem permissão para gerenciar contas.",
  P0002: "Essa conta não existe mais. Atualize a tela.",
  TB006: "O valor é maior que o saldo devedor.",
  "22023": "Confira o valor e a forma de pagamento.",
};

function getAccountErrorMessage(
  error: { code?: string },
  fallbackMessage: string,
) {
  return (error.code && ACCOUNT_ERROR_MESSAGES[error.code]) ?? fallbackMessage;
}

export async function listCustomerAccounts(
  organizationId: OrganizationId,
): Promise<ActionResult<CustomerAccount[]>> {
  const supabase = await createClient();
  const [accountsResult, balancesResult] = await Promise.all([
    supabase
      .from("customer_accounts")
      .select("id, name, phone, credit_limit, note, is_active")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("customer_account_balances")
      .select("account_id, balance, last_entry_at")
      .eq("organization_id", organizationId),
  ]);

  if (accountsResult.error || balancesResult.error) {
    return actionFailure("Não foi possível carregar as contas.");
  }

  const balancesByAccountId = new Map(
    balancesResult.data.map((balance) => [balance.account_id, balance]),
  );

  return actionSuccess(
    accountsResult.data.map((account) => {
      const balance = balancesByAccountId.get(account.id);
      return {
        id: account.id as CustomerAccountId,
        name: account.name,
        phone: account.phone,
        creditLimit: account.credit_limit,
        note: account.note,
        isActive: account.is_active,
        balance: balance?.balance ?? 0,
        lastEntryAt: balance?.last_entry_at ?? null,
      };
    }),
  );
}

export async function listAccountEntries(
  accountId: CustomerAccountId,
): Promise<ActionResult<AccountEntry[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_entries")
    .select(
      "id, kind, amount, order_id, payment_method, note, operator_name, created_at",
    )
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(ACCOUNT_ENTRIES_LIMIT);

  if (error) return actionFailure("Não foi possível carregar o extrato.");

  return actionSuccess(
    data.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      amount: entry.amount,
      orderId: entry.order_id as OrderId | null,
      paymentMethod: entry.payment_method,
      note: entry.note,
      operatorName: entry.operator_name,
      createdAt: entry.created_at,
    })),
  );
}

export async function saveCustomerAccount(
  organizationId: OrganizationId,
  accountId: CustomerAccountId | null,
  input: CustomerAccountInput,
): Promise<ActionResult> {
  const parsedInput = customerAccountSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const { name, phone, creditLimit, note, isActive } = parsedInput.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_customer_account", {
    p_organization_id: organizationId,
    p_account_id: accountId ?? undefined,
    p_name: name,
    p_phone: phone || undefined,
    p_credit_limit: creditLimit,
    p_note: note || undefined,
    p_is_active: isActive,
  });

  if (error) {
    return actionFailure(
      getAccountErrorMessage(error, "Não foi possível salvar a conta."),
    );
  }
  return actionSuccess();
}

export async function registerAccountPayment(
  accountId: CustomerAccountId,
  balance: number,
  input: AccountPaymentInput,
): Promise<ActionResult<number>> {
  const parsedInput = createAccountPaymentSchema(balance).safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira o valor e a forma de pagamento.");
  }

  const { amount, method, note } = parsedInput.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_account_payment", {
    p_account_id: accountId,
    p_amount: amount,
    p_payment_method: method,
    p_note: note || undefined,
  });

  if (error) {
    return actionFailure(
      getAccountErrorMessage(error, "Não foi possível registrar o pagamento."),
    );
  }
  return actionSuccess(data);
}
