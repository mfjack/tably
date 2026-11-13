import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ORGANIZATION_DOCUMENTS_BUCKET } from "@/features/documents/document-files";
import { FINANCIAL_DOCUMENTS_BUCKET } from "@/features/finance/documents";
import { PRODUCT_IMAGES_BUCKET } from "@/features/products/product-image";

const STORAGE_LIST_LIMIT = 1000;

type StorageOwner = Pick<SupabaseClient, "storage">;
type StorageBucket = ReturnType<SupabaseClient["storage"]["from"]>;

async function listFolderPaths(bucket: StorageBucket, folderPath: string) {
  const { data: files } = await bucket.list(folderPath, {
    limit: STORAGE_LIST_LIMIT,
  });
  return (files ?? []).map((file) => `${folderPath}/${file.name}`);
}

async function removePaths(bucket: StorageBucket, paths: readonly string[]) {
  if (paths.length > 0) await bucket.remove([...paths]);
}

export async function removeOrganizationFiles(
  { storage }: StorageOwner,
  organizationIds: readonly string[],
) {
  const productImages = storage.from(PRODUCT_IMAGES_BUCKET);
  const organizationDocuments = storage.from(ORGANIZATION_DOCUMENTS_BUCKET);
  const financialDocuments = storage.from(FINANCIAL_DOCUMENTS_BUCKET);

  await Promise.all(
    organizationIds.map(async (organizationId) => {
      await removePaths(
        productImages,
        await listFolderPaths(productImages, organizationId),
      );
      await removePaths(
        organizationDocuments,
        await listFolderPaths(organizationDocuments, organizationId),
      );
      const entryFolders = await listFolderPaths(
        financialDocuments,
        organizationId,
      );
      const documentPaths = (
        await Promise.all(
          entryFolders.map((folderPath) =>
            listFolderPaths(financialDocuments, folderPath),
          ),
        )
      ).flat();
      await removePaths(financialDocuments, documentPaths);
    }),
  );
}
