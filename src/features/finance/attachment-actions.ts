"use server";

import * as z from "zod";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { removeFinancialDocuments } from "./document-storage";
import { ACCESS_DENIED, canUseFinance } from "./finance-core";
import type { FinancialEntryAttachmentId, FinancialEntryId } from "./types";

const attachmentsInputSchema = z
  .array(
    z.object({
      path: z.string().min(1),
      fileName: z.string().trim().min(1).max(200),
    }),
  )
  .min(1);

export async function addFinancialEntryAttachments(
  organizationId: OrganizationId,
  entryId: FinancialEntryId,
  attachments: readonly { path: string; fileName: string }[],
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;
  const parsedAttachments = attachmentsInputSchema.safeParse(attachments);
  if (
    !parsedAttachments.success ||
    parsedAttachments.data.some(
      (attachment) => !attachment.path.startsWith(`${organizationId}/`),
    )
  ) {
    return actionFailure("Arquivo inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("financial_entry_attachments").insert(
    parsedAttachments.data.map((attachment) => ({
      organization_id: organizationId,
      entry_id: entryId,
      path: attachment.path,
      file_name: attachment.fileName,
    })),
  );

  if (error) {
    await removeFinancialDocuments(
      parsedAttachments.data.map((attachment) => attachment.path),
    );
    return databaseFailure("Não foi possível salvar o anexo.", error);
  }
  return actionSuccess();
}

export async function removeFinancialEntryAttachment(
  organizationId: OrganizationId,
  attachmentId: FinancialEntryAttachmentId,
): Promise<ActionResult> {
  if (!(await canUseFinance(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_entry_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("organization_id", organizationId)
    .select("path")
    .single();

  if (error) return databaseFailure("Não foi possível remover o anexo.", error);
  await removeFinancialDocuments([data.path]);
  return actionSuccess();
}
