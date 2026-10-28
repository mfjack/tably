import { useCallback, useState } from "react";
import type { OrganizationId } from "@/features/organizations/types";
import type { FinancialEntryId } from "../types";
import { useAddFinancialEntryAttachmentsMutation } from "./use-add-financial-entry-attachments-mutation";

type AttachCallbacks = {
  onDone: () => void;
  onError: (error: Error) => void;
};

export function usePendingAttachments(organizationId: OrganizationId) {
  const uploadMutation =
    useAddFinancialEntryAttachmentsMutation(organizationId);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const { mutate: upload, reset: resetUpload } = uploadMutation;

  const selectFiles = useCallback(
    (selectedFiles: File[], error: string | null) => {
      setFiles(selectedFiles);
      setFileError(error);
    },
    [],
  );

  const reset = useCallback(() => {
    setFiles([]);
    setFileError(null);
    resetUpload();
  }, [resetUpload]);

  const attachTo = useCallback(
    (entryId: FinancialEntryId | null, callbacks: AttachCallbacks) => {
      if (files.length === 0 || !entryId) {
        callbacks.onDone();
        return;
      }
      upload(
        { entryId, files },
        { onSuccess: callbacks.onDone, onError: callbacks.onError },
      );
    },
    [files, upload],
  );

  return {
    files,
    fileError,
    selectFiles,
    reset,
    attachTo,
    isUploading: uploadMutation.isPending,
  };
}
