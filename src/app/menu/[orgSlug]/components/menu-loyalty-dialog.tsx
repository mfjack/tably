"use client";

import { Gift } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { MaskedField } from "@/components/form/masked-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { usePublicLoyaltyStatusQuery } from "@/features/loyalty/hooks/use-public-loyalty-status-query";
import type { PublicLoyaltyStatus } from "@/features/loyalty/types";
import type { PublicLoyaltyProgram } from "@/features/menu/types";
import { cn } from "@/lib/utils";

type LoyaltyLookupForm = {
  phone: string;
};

type MenuLoyaltyDialogProps = {
  menuSlug: string;
  program: PublicLoyaltyProgram;
};

type StampCardProps = {
  status: PublicLoyaltyStatus;
  program: PublicLoyaltyProgram;
};

function StampCard({ status, program }: StampCardProps) {
  const { balance, firstName, hasStampToday } = status;
  const filledStamps = Math.min(balance, program.stampsRequired);
  const missingStamps = program.stampsRequired - filledStamps;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-muted p-4">
      <div className="flex flex-col gap-0.5">
        {firstName && <p className="text-sm">Olá, {firstName}!</p>}
        <p className="font-semibold">
          {balance} de {program.stampsRequired} selos
        </p>
      </div>
      <ul className="grid grid-cols-5 gap-2" aria-hidden>
        {Array.from({ length: program.stampsRequired }, (_, index) => (
          <li
            key={`stamp-${index.toString()}`}
            className={cn(
              "flex aspect-square items-center justify-center rounded-full border-2",
              index < filledStamps
                ? "border-primary bg-primary text-primary-foreground"
                : "border-dashed border-muted-foreground/40",
            )}
          >
            {index < filledStamps && <Gift className="size-4" />}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-sm">
        {missingStamps === 0
          ? `Você já pode trocar por ${program.rewardDescription}. Peça no caixa.`
          : `Faltam ${missingStamps} ${missingStamps === 1 ? "selo" : "selos"} para ganhar ${program.rewardDescription}.`}
      </p>
      {hasStampToday && (
        <p className="text-muted-foreground text-xs">
          Você já ganhou o selo de hoje. O próximo vale a partir de amanhã.
        </p>
      )}
    </div>
  );
}

export function MenuLoyaltyDialog({
  menuSlug,
  program,
}: MenuLoyaltyDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<LoyaltyLookupForm>({ defaultValues: { phone: "" } });
  const phone = useWatch({ control: form.control, name: "phone" });
  const statusQuery = usePublicLoyaltyStatusQuery(menuSlug, phone);

  function openDialog() {
    setIsOpen(true);
  }

  function closeDialog() {
    setIsOpen(false);
  }

  function changeOpen(isDialogOpen: boolean) {
    setIsOpen(isDialogOpen);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-full"
        onClick={openDialog}
      >
        <Gift aria-hidden />
        Minha fidelidade
      </Button>
      <DetailsDialog
        isOpen={isOpen}
        onOpenChange={changeOpen}
        title="Minha fidelidade"
        footer={
          <Button
            type="button"
            variant="outline"
            className={cn(DIALOG_ACTION_BUTTON_CLASS_NAME, "col-span-2")}
            onClick={closeDialog}
          >
            Fechar
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            A cada dia em que você compra, ganha um selo. Com{" "}
            {program.stampsRequired} selos, ganha {program.rewardDescription}.
            Informe seu celular no caixa ou no pedido para pontuar.
          </p>
          <FieldGroup>
            <MaskedField
              control={form.control}
              name="phone"
              label="Seu celular"
              mask="phone"
              placeholder="00 00000-0000"
              autoComplete="tel-national"
            />
          </FieldGroup>
          {statusQuery.isFetching && statusQuery.data === undefined && (
            <p className="text-muted-foreground text-sm">
              Buscando seus selos…
            </p>
          )}
          {statusQuery.error && (
            <p className="text-destructive text-sm">
              {statusQuery.error.message}
            </p>
          )}
          {statusQuery.data && (
            <StampCard status={statusQuery.data} program={program} />
          )}
        </div>
      </DetailsDialog>
    </>
  );
}
