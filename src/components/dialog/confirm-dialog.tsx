import { X } from "lucide-react";
import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DIALOG_ACTION_BUTTON_CLASS_NAME,
  DIALOG_CLOSE_BUTTON_CLASS_NAME,
  DIALOG_CONTENT_CLASS_NAME,
  DIALOG_FOOTER_CLASS_NAME,
  DIALOG_HEADER_CLASS_NAME,
  DIALOG_TITLE_CLASS_NAME,
} from "./dialog-styles";

export const IRREVERSIBLE_ACTION_MESSAGE = "Essa ação não pode ser desfeita.";

type ConfirmDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  isConfirming: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isConfirming,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className={DIALOG_CONTENT_CLASS_NAME}>
        <AlertDialogHeader className={DIALOG_HEADER_CLASS_NAME}>
          <AlertDialogTitle className={DIALOG_TITLE_CLASS_NAME}>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className={DIALOG_FOOTER_CLASS_NAME}>
          <AlertDialogCancel
            disabled={isConfirming}
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
          >
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            isLoading={isConfirming}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>

        <AlertDialogCancel
          size="icon"
          aria-label="Fechar"
          disabled={isConfirming}
          className={DIALOG_CLOSE_BUTTON_CLASS_NAME}
        >
          <X aria-hidden />
        </AlertDialogCancel>
      </AlertDialogContent>
    </AlertDialog>
  );
}
