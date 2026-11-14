"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ConfirmDialog } from "@/components/dialog/confirm-dialog";
import { FormDialog } from "@/components/dialog/form-dialog";
import { MaskedField } from "@/components/form/masked-field";
import { FieldGroup } from "@/components/ui/field";
import {
  type CancelPinInput,
  cancelPinSchema,
} from "@/features/orders/cancel-authorization";

type AuthorizedConfirmDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  isConfirming: boolean;
  isPinRequired: boolean;
  onConfirm: (pin: string | null) => void;
};

export function AuthorizedConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isConfirming,
  isPinRequired,
  onConfirm,
}: AuthorizedConfirmDialogProps) {
  const form = useForm<CancelPinInput>({
    resolver: zodResolver(cancelPinSchema),
    defaultValues: { pin: "" },
  });

  useEffect(() => {
    if (isOpen) form.reset({ pin: "" });
  }, [isOpen, form]);

  if (!isPinRequired) {
    return (
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        isConfirming={isConfirming}
        onConfirm={() => onConfirm(null)}
      />
    );
  }

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      submitLabel={confirmLabel}
      isSubmitting={isConfirming}
      onSubmit={form.handleSubmit(({ pin }) => onConfirm(pin))}
    >
      <FieldGroup>
        <MaskedField
          control={form.control}
          name="pin"
          label="PIN de autorização"
          mask="pin"
          isSecret
          placeholder="4 números"
          autoComplete="off"
        />
      </FieldGroup>
    </FormDialog>
  );
}
