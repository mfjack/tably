"use server";

import { getUserOrganizationById } from "@/features/organizations/queries";
import type {
  OrganizationId,
  UserOrganization,
} from "@/features/organizations/types";
import { isModuleAllowed } from "@/features/team/access";
import {
  isOrganizationOwner,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/team/module-access";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import {
  CieloError,
  closeCieloOrder,
  createCieloOrder,
  getCieloOrder,
} from "@/lib/cielo/client";
import { toCents } from "@/lib/money";
import { resolveCieloMerchantId } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";
import { getCardTerminalCharge, toCieloPaymentCode } from "./charge-status";
import {
  type CardTerminalSettingsInput,
  cardTerminalSettingsSchema,
  type StartCardTerminalChargeInput,
  startCardTerminalChargeSchema,
} from "./schemas";
import type { CardTerminalCharge, CardTerminalChargeId } from "./types";

const NOT_CONFIGURED_MESSAGE =
  "A maquininha ainda não está conectada. O dono ativa em Configurações → Vendas.";
const TERMINAL_UNAVAILABLE_MESSAGE =
  "Não foi possível falar com a Cielo. Tente de novo ou cobre direto na maquininha.";
const NOT_FOUND_STATUS = 404;
const ORDER_NUMBER_LENGTH = 8;

type TerminalContext = { organization: UserOrganization; merchantId: string };

async function getTerminalContext(
  organizationId: OrganizationId,
): Promise<ActionResult<TerminalContext>> {
  const organization = await getUserOrganizationById(organizationId);
  const canCharge =
    organization &&
    (isModuleAllowed(organization, "pos") ||
      isModuleAllowed(organization, "order_tabs"));
  if (!canCharge) return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);

  const merchantId = resolveCieloMerchantId(organization.cieloMerchantId);
  if (!merchantId) return actionFailure(NOT_CONFIGURED_MESSAGE);
  return actionSuccess({ organization, merchantId });
}

function createOrderNumber(): string {
  return crypto.randomUUID().slice(0, ORDER_NUMBER_LENGTH).toUpperCase();
}

export async function startCardTerminalCharge(
  organizationId: OrganizationId,
  input: StartCardTerminalChargeInput,
): Promise<ActionResult<CardTerminalChargeId>> {
  const parsedInput = startCardTerminalChargeSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure("Confira o valor a cobrar.");

  const context = await getTerminalContext(organizationId);
  if (context.status === "error") return context;

  try {
    const chargeId = await createCieloOrder(context.data.merchantId, {
      number: createOrderNumber(),
      reference: context.data.organization.name,
      amountInCents: toCents(parsedInput.data.amount),
      paymentCode: toCieloPaymentCode(parsedInput.data.method),
    });
    return actionSuccess(chargeId as CardTerminalChargeId);
  } catch (error) {
    console.error("Cielo charge failed", error);
    return actionFailure(TERMINAL_UNAVAILABLE_MESSAGE);
  }
}

export async function fetchCardTerminalCharge(
  organizationId: OrganizationId,
  chargeId: CardTerminalChargeId,
): Promise<ActionResult<CardTerminalCharge>> {
  const context = await getTerminalContext(organizationId);
  if (context.status === "error") return context;

  try {
    const order = await getCieloOrder(context.data.merchantId, chargeId);
    return actionSuccess(getCardTerminalCharge(order));
  } catch (error) {
    if (error instanceof CieloError && error.status === NOT_FOUND_STATUS) {
      return actionSuccess({ status: "canceled" });
    }
    return actionFailure(TERMINAL_UNAVAILABLE_MESSAGE);
  }
}

export async function cancelCardTerminalCharge(
  organizationId: OrganizationId,
  chargeId: CardTerminalChargeId,
): Promise<ActionResult<CardTerminalCharge>> {
  const context = await getTerminalContext(organizationId);
  if (context.status === "error") return context;

  try {
    const order = await getCieloOrder(context.data.merchantId, chargeId);
    const charge = getCardTerminalCharge(order);
    if (charge.status !== "pending") return actionSuccess(charge);
    await closeCieloOrder(context.data.merchantId, chargeId);
    return actionSuccess({ status: "canceled" });
  } catch (error) {
    if (error instanceof CieloError && error.status === NOT_FOUND_STATUS) {
      return actionSuccess({ status: "canceled" });
    }
    return actionFailure(TERMINAL_UNAVAILABLE_MESSAGE);
  }
}

export async function updateCardTerminalSettings(
  organizationId: OrganizationId,
  input: CardTerminalSettingsInput,
): Promise<ActionResult> {
  if (!(await isOrganizationOwner(organizationId))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = cardTerminalSettingsSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira o código da Cielo.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ cielo_merchant_id: parsedInput.data.cieloMerchantId || null })
    .eq("id", organizationId)
    .select("id");

  if (error)
    return databaseFailure("Não foi possível salvar a maquininha.", error);
  if (data.length === 0) return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  return actionSuccess();
}
