"use server";

import { z } from "zod";
import {
  hasAnyModuleAccess,
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import { PAYMENT_METHOD_VALUES } from "@/features/orders/payment-methods";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { getCashRegisterErrorMessage } from "./messages";
import {
  type CashMovementInput,
  type CloseCashSessionInput,
  cashMovementSchema,
  closeCashSessionSchema,
  type OpenCashSessionInput,
  openCashSessionSchema,
} from "./schemas";
import type {
  CashMovementKind,
  CashSessionId,
  CashSessionSummary,
} from "./types";

const INVALID_FORM_MESSAGE = "Confira os campos e tente novamente.";

const cashSessionSummarySchema = z.object({
  id: z.string(),
  openedAt: z.string(),
  openedByName: z.string().nullable(),
  openingAmount: z.number(),
  closedAt: z.string().nullable(),
  closedByName: z.string().nullable(),
  countedCash: z.number().nullable(),
  closingNote: z.string().nullable(),
  orderCount: z.number(),
  receivedTotal: z.number(),
  supplies: z.number(),
  withdrawals: z.number(),
  expectedCash: z.number(),
  payments: z.array(
    z.object({ method: z.enum(PAYMENT_METHOD_VALUES), amount: z.number() }),
  ),
  movements: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["withdrawal", "supply"]),
      amount: z.number(),
      note: z.string().nullable(),
      createdAt: z.string(),
      createdByName: z.string().nullable(),
    }),
  ),
});

function toCashSessionSummary(data: unknown): CashSessionSummary | null {
  const parsedSummary = cashSessionSummarySchema.safeParse(data);
  if (!parsedSummary.success) return null;

  return {
    ...parsedSummary.data,
    id: parsedSummary.data.id as CashSessionId,
  };
}

export async function getOpenCashSession(
  organizationId: OrganizationId,
): Promise<ActionResult<CashSessionSummary | null>> {
  if (!(await hasAnyModuleAccess(organizationId, ["pos", "order_tabs"]))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_open_cash_session", {
    p_organization_id: organizationId,
  });

  if (error) return actionFailure("Não foi possível carregar o caixa.");
  if (data === null) return actionSuccess(null);

  const summary = toCashSessionSummary(data);
  return summary
    ? actionSuccess(summary)
    : actionFailure("Não foi possível carregar o caixa.");
}

export async function openCashSession(
  organizationId: OrganizationId,
  input: OpenCashSessionInput,
): Promise<ActionResult> {
  if (!(await hasAnyModuleAccess(organizationId, ["pos", "order_tabs"]))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = openCashSessionSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { error } = await supabase.rpc("open_cash_session", {
    p_organization_id: organizationId,
    p_opening_amount: parsedInput.data.openingAmount ?? 0,
  });

  if (error) {
    return actionFailure(
      getCashRegisterErrorMessage(error, "Não foi possível abrir o caixa."),
    );
  }
  return actionSuccess();
}

export async function addCashMovement(
  organizationId: OrganizationId,
  kind: CashMovementKind,
  input: CashMovementInput,
): Promise<ActionResult> {
  if (!(await hasAnyModuleAccess(organizationId, ["pos", "order_tabs"]))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = cashMovementSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_cash_movement", {
    p_organization_id: organizationId,
    p_kind: kind,
    p_amount: parsedInput.data.amount,
    p_note: parsedInput.data.note,
  });

  if (error) {
    return actionFailure(
      getCashRegisterErrorMessage(error, "Não foi possível registrar."),
    );
  }
  return actionSuccess();
}

export async function closeCashSession(
  organizationId: OrganizationId,
  input: CloseCashSessionInput,
): Promise<ActionResult<CashSessionSummary>> {
  if (!(await hasAnyModuleAccess(organizationId, ["pos", "order_tabs"]))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = closeCashSessionSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("close_cash_session", {
    p_organization_id: organizationId,
    p_counted_cash: parsedInput.data.countedCash,
    p_note: parsedInput.data.note,
  });

  if (error) {
    return actionFailure(
      getCashRegisterErrorMessage(error, "Não foi possível fechar o caixa."),
    );
  }

  const summary = toCashSessionSummary(data);
  return summary
    ? actionSuccess(summary)
    : actionFailure("O caixa foi fechado, mas o resumo não carregou.");
}

const reportDateSchema = z.iso.date();

export async function listCashSessions(
  organizationId: OrganizationId,
  startDate: string,
  endDate: string,
): Promise<ActionResult<CashSessionSummary[]>> {
  if (!(await hasModuleAccess(organizationId, "sales_report"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  if (
    !reportDateSchema.safeParse(startDate).success ||
    !reportDateSchema.safeParse(endDate).success
  ) {
    return actionFailure("Período inválido.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_cash_sessions", {
    p_organization_id: organizationId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error || !Array.isArray(data)) {
    return actionFailure("Não foi possível carregar os caixas.");
  }

  return actionSuccess(
    data.flatMap((session) => {
      const summary = toCashSessionSummary(session);
      return summary ? [summary] : [];
    }),
  );
}
