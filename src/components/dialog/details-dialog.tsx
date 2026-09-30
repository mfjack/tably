"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DIALOG_CLOSE_BUTTON_CLASS_NAME,
  DIALOG_CONTENT_CLASS_NAME,
  DIALOG_FOOTER_CLASS_NAME,
  DIALOG_HEADER_CLASS_NAME,
  DIALOG_TITLE_CLASS_NAME,
} from "./dialog-styles";

const DIALOG_SIZE_CLASS_NAMES = {
  default: "sm:max-w-md",
  large: "sm:max-w-2xl",
} as const;

type DetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  footer: ReactNode;
  size?: keyof typeof DIALOG_SIZE_CLASS_NAMES;
  children: ReactNode;
};

export function DetailsDialog({
  isOpen,
  onOpenChange,
  title,
  footer,
  size = "default",
  children,
}: DetailsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          DIALOG_CONTENT_CLASS_NAME,
          "flex flex-col",
          DIALOG_SIZE_CLASS_NAMES[size],
        )}
      >
        <DialogHeader className={DIALOG_HEADER_CLASS_NAME}>
          <DialogTitle className={DIALOG_TITLE_CLASS_NAME}>{title}</DialogTitle>
        </DialogHeader>

        <div className="-m-1 min-h-0 overflow-y-auto p-1">{children}</div>

        <DialogFooter className={DIALOG_FOOTER_CLASS_NAME}>
          {footer}
        </DialogFooter>

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
