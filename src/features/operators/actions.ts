"use server";

import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { canAccessSettings } from "./access";
import { getOperatorAccess, OPERATOR_COLUMNS, toOperator } from "./queries";
import {
  createOperatorSchema,
  type OperatorInput,
  operatorPinSchema,
} from "./schemas";
import {
  endOperatorSession,
  readOperatorSession,
  startOperatorSession,
} from "./session";
import type { Operator, OperatorId } from "./types";

const WRONG_PIN_DELAY_IN_MS = 600;

const OPERATOR_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  "23505": "Já existe um operador com esse nome.",
  "42501": "Só o dono ou um gerente pode gerenciar operadores.",
  P0002: "Esse operador não existe mais. Atualize a tela.",
  TB004: "Pelo menos um operador precisa ter acesso a Configurações.",
};

function getOperatorErrorMessage(
  error: { code?: string },
  fallbackMessage: string,
) {
  return (error.code && OPERATOR_ERROR_MESSAGES[error.code]) ?? fallbackMessage;
}

async function canManageOperators(organizationId: OrganizationId) {
  return canAccessSettings(await getOperatorAccess(organizationId));
}

export async function listOperators(
  organizationId: OrganizationId,
): Promise<ActionResult<Operator[]>> {
  if (!(await canManageOperators(organizationId))) {
    return actionFailure(OPERATOR_ERROR_MESSAGES["42501"]);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operators")
    .select(OPERATOR_COLUMNS)
    .eq("organization_id", organizationId)
    .order("name");

  if (error) return actionFailure("Não foi possível carregar os operadores.");

  return actionSuccess(data.map(toOperator));
}

export async function saveOperator(
  organizationId: OrganizationId,
  operatorId: OperatorId | null,
  input: OperatorInput,
): Promise<ActionResult> {
  const parsedInput = createOperatorSchema(operatorId !== null).safeParse(
    input,
  );
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }
  if (!(await canManageOperators(organizationId))) {
    return actionFailure(OPERATOR_ERROR_MESSAGES["42501"]);
  }

  const { name, pin, allowedModules, canAccessSettings } = parsedInput.data;
  const supabase = await createClient();
  const { data: savedOperatorId, error } = await supabase.rpc("save_operator", {
    p_organization_id: organizationId,
    p_operator_id: operatorId ?? undefined,
    p_name: name,
    p_pin: pin || undefined,
    p_allowed_modules: allowedModules,
    p_can_access_settings: canAccessSettings,
  });

  if (error) {
    return actionFailure(
      getOperatorErrorMessage(error, "Não foi possível salvar o operador."),
    );
  }

  const hasSession = (await readOperatorSession(organizationId)) !== null;
  if (!hasSession && operatorId === null) {
    await startOperatorSession(organizationId, savedOperatorId as OperatorId);
  }

  return actionSuccess();
}

export async function deleteOperator(
  organizationId: OrganizationId,
  operatorId: OperatorId,
): Promise<ActionResult> {
  if (!(await canManageOperators(organizationId))) {
    return actionFailure(OPERATOR_ERROR_MESSAGES["42501"]);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_operator", {
    p_operator_id: operatorId,
  });

  if (error) {
    return actionFailure(
      getOperatorErrorMessage(error, "Não foi possível excluir o operador."),
    );
  }
  return actionSuccess();
}

export async function unlockOperator(
  organizationId: OrganizationId,
  operatorId: OperatorId,
  pin: string,
): Promise<ActionResult> {
  const parsedPin = operatorPinSchema.safeParse(pin);
  if (!parsedPin.success) return actionFailure("PIN incorreto.");

  const supabase = await createClient();
  const { data: isValidPin, error } = await supabase.rpc(
    "verify_operator_pin",
    { p_operator_id: operatorId, p_pin: parsedPin.data },
  );

  if (error) return actionFailure("Não foi possível verificar o PIN.");
  if (!isValidPin) {
    await new Promise((resolve) => setTimeout(resolve, WRONG_PIN_DELAY_IN_MS));
    return actionFailure("PIN incorreto.");
  }

  await startOperatorSession(organizationId, operatorId);
  return actionSuccess();
}

export async function lockOperator(
  organizationId: OrganizationId,
): Promise<ActionResult> {
  await endOperatorSession(organizationId);
  return actionSuccess();
}
