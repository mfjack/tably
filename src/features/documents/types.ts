import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type OrganizationDocumentId = Brand<string, "OrganizationDocumentId">;

export type DocumentKind = Database["public"]["Enums"]["document_kind"];

export type OrganizationDocument = {
  id: OrganizationDocumentId;
  name: string;
  kind: DocumentKind;
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  expiresOn: string | null;
  notes: string | null;
  createdAt: string;
};

export type UploadedDocumentFile = Pick<
  OrganizationDocument,
  "filePath" | "fileName" | "mimeType" | "sizeBytes"
>;
