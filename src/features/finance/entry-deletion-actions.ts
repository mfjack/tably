"use server";

import { addDays, parseISO } from "date-fns";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { toDateKey } from "@/lib/date-key";
import { createClient } from "@/lib/supabase/server";
import { removeFinancialDocuments } from "./document-storage";
import { INVOICE_SOURCE_PREFIX } from "./entry-mapping";
import { ACCESS_DENIED, canUseFinance } from "./finance-core";
import type { EntryDeleteScope } from "./schemas";
import type { FinancialEntryId } from "./types";

async function deleteEntriesWithAttachments(
  organizationId: OrganizationId,
  entryIds: readonly string[],
) {
  if (entryIds.length === 0) return null;
  const supabase = await createClient();
  const { data: attachments } = await supabase
    .from("financial_entry_attachments")
    .select("path")
    .in("entry_id", entryIds);
  const { error } = await supabase
    .from("financial_entries")
    .delete()
    .in("id", entryIds)
    .eq("organization_id", organizationId);

  if (!error) {
    await removeFinancialDocuments(
      (attachments ?? []).map((attachment) => attachment.path),
    );
  }
  return error;
}

async function getEntryIdsToDelete(
  organizationId: OrganizationId,
  entryId: FinancialEntryId,
  filter: { column: "recurrence_id" | "installment_group_id"; value: string },
  fromDueDate?: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from("financial_entries")
    .select("id")
    .eq("organization_id", organizationId)
    .eq(filter.column, filter.value)
    .or(`paid_at.is.null,id.eq.${entryId}`);
  if (fromDueDate) query = query.gte("due_date", fromDueDate);
  const { data, error } = await query;
  return { ids: (data ?? []).map((entry) => entry.id), error };
}

export async function deleteFinancialEntry(
  organizationId: OrganizationId,
  entryId: FinancialEntryId,
  scope: EntryDeleteScope,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("financial_entries")
    .select("recurrence_id, installment_group_id, due_date")
    .eq("id", entryId)
    .eq("organization_id", organizationId)
    .single();

  if (currentError)
    return databaseFailure("Lançamento não encontrado.", currentError);

  if (scope === "all" && current.recurrence_id) {
    const { ids, error: idsError } = await getEntryIdsToDelete(
      organizationId,
      entryId,
      { column: "recurrence_id", value: current.recurrence_id },
    );
    const error =
      idsError ?? (await deleteEntriesWithAttachments(organizationId, ids));
    if (error)
      return databaseFailure("Não foi possível excluir a conta.", error);

    const { error: recurrenceError } = await supabase
      .from("financial_recurrences")
      .delete()
      .eq("id", current.recurrence_id);

    if (recurrenceError) {
      return databaseFailure(
        "Não foi possível excluir a repetição.",
        recurrenceError,
      );
    }
    return actionSuccess();
  }

  if (scope === "following" && current.recurrence_id) {
    const { data: recurrence } = await supabase
      .from("financial_recurrences")
      .select("start_date")
      .eq("id", current.recurrence_id)
      .single();

    const { ids, error: idsError } = await getEntryIdsToDelete(
      organizationId,
      entryId,
      { column: "recurrence_id", value: current.recurrence_id },
      current.due_date,
    );
    const error =
      idsError ?? (await deleteEntriesWithAttachments(organizationId, ids));
    if (error)
      return databaseFailure("Não foi possível excluir os lançamentos.", error);

    const endDate = toDateKey(addDays(parseISO(current.due_date), -1));
    const recurrenceUpdate =
      recurrence && endDate >= recurrence.start_date
        ? supabase
            .from("financial_recurrences")
            .update({ end_date: endDate })
            .eq("id", current.recurrence_id)
        : supabase
            .from("financial_recurrences")
            .delete()
            .eq("id", current.recurrence_id);
    const { error: recurrenceError } = await recurrenceUpdate;
    if (recurrenceError) {
      return databaseFailure(
        "Não foi possível encerrar a recorrência.",
        recurrenceError,
      );
    }
    return actionSuccess();
  }

  if (scope === "installments" && current.installment_group_id) {
    const { ids, error: idsError } = await getEntryIdsToDelete(
      organizationId,
      entryId,
      { column: "installment_group_id", value: current.installment_group_id },
    );
    const error =
      idsError ?? (await deleteEntriesWithAttachments(organizationId, ids));
    if (error)
      return databaseFailure("Não foi possível excluir as parcelas.", error);
    return actionSuccess();
  }

  const error = await deleteEntriesWithAttachments(organizationId, [entryId]);
  if (error)
    return databaseFailure("Não foi possível excluir o lançamento.", error);
  return actionSuccess();
}

async function getPurchaseEntryIds(
  organizationId: OrganizationId,
  entryId: FinancialEntryId,
): Promise<string[]> {
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("financial_entries")
    .select("source_key")
    .eq("id", entryId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  const invoiceKey = entry?.source_key?.startsWith(INVOICE_SOURCE_PREFIX)
    ? entry.source_key.split(":")[1]
    : null;
  if (!invoiceKey) return [entryId];

  const { data: installments } = await supabase
    .from("financial_entries")
    .select("id")
    .eq("organization_id", organizationId)
    .like("source_key", `${INVOICE_SOURCE_PREFIX}${invoiceKey}:%`);
  return (installments ?? []).map((installment) => installment.id);
}

export async function undoStockPurchase(
  organizationId: OrganizationId,
  entryId: FinancialEntryId,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const entryIds = await getPurchaseEntryIds(organizationId, entryId);
  const { data: attachments } = await supabase
    .from("financial_entry_attachments")
    .select("path")
    .in("entry_id", entryIds);
  const { error } = await supabase.rpc("undo_stock_purchase", {
    p_entry_id: entryId,
  });

  if (error?.code === "42501") {
    return actionFailure("Só o dono ou o gerente pode desfazer compras.");
  }
  if (error?.code === "TB048") {
    return actionFailure("Essa compra não tem itens no estoque para desfazer.");
  }
  if (error?.code === "TB049") {
    return actionFailure(
      "Compras recebidas por pedido de compra não podem ser desfeitas.",
    );
  }
  if (error)
    return databaseFailure("Não foi possível desfazer a compra.", error);

  await removeFinancialDocuments(
    (attachments ?? []).map((attachment) => attachment.path),
  );
  return actionSuccess();
}
