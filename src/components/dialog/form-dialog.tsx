import type { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { FormEventHandler, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DIALOG_ACTION_BUTTON_CLASS_NAME,
  DIALOG_CLOSE_BUTTON_CLASS_NAME,
  DIALOG_CONTENT_CLASS_NAME,
  DIALOG_FOOTER_CLASS_NAME,
  DIALOG_HEADER_CLASS_NAME,
  DIALOG_TITLE_CLASS_NAME,
} from "./dialog-styles";

type DialogPopupProps = DialogPrimitive.Popup.Props;

const DIALOG_SIZE_CLASS_NAMES = {
  default: "sm:max-w-md",
  large: "sm:max-w-2xl",
  extraLarge: "sm:max-w-4xl",
} as const;

export type FormDialogSecondaryAction = {
  label: string;
  isPending: boolean;
  onClick: () => void;
};

type FormDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  size?: keyof typeof DIALOG_SIZE_CLASS_NAMES;
  isTitleHidden?: boolean;
  secondaryAction?: FormDialogSecondaryAction;
  initialFocus?: DialogPopupProps["initialFocus"];
  children: ReactNode;
};

export function FormDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  submitLabel,
  isSubmitting,
  onSubmit,
  size = "default",
  isTitleHidden = false,
  secondaryAction,
  initialFocus,
  children,
}: FormDialogProps) {
  const isBusy = isSubmitting || (secondaryAction?.isPending ?? false);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        initialFocus={initialFocus}
        className={cn(
          DIALOG_CONTENT_CLASS_NAME,
          "flex flex-col",
          DIALOG_SIZE_CLASS_NAMES[size],
        )}
      >
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex min-h-0 flex-col gap-6"
        >
          <DialogHeader
            className={cn(DIALOG_HEADER_CLASS_NAME, isTitleHidden && "sr-only")}
          >
            <DialogTitle className={DIALOG_TITLE_CLASS_NAME}>
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="-m-1 min-h-0 overflow-y-auto p-1">{children}</div>

          <DialogFooter className={DIALOG_FOOTER_CLASS_NAME}>
            {secondaryAction ? (
              <Button
                type="button"
                variant="outline"
                className={DIALOG_ACTION_BUTTON_CLASS_NAME}
                disabled={isBusy}
                isLoading={secondaryAction.isPending}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            ) : (
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className={DIALOG_ACTION_BUTTON_CLASS_NAME}
                  />
                }
              >
                Cancelar
              </DialogClose>
            )}
            <Button
              type="submit"
              className={DIALOG_ACTION_BUTTON_CLASS_NAME}
              disabled={isBusy}
              isLoading={isSubmitting}
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>

        <DialogClose
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label="Fechar"
              className={DIALOG_CLOSE_BUTTON_CLASS_NAME}
            />
          }
        >
          <X aria-hidden />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
