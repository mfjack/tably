"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Download, ExternalLink } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useSaveMenuSettingsMutation } from "@/features/menu/hooks/use-save-menu-settings-mutation";
import {
  type MenuSettingsInput,
  menuSettingsSchema,
} from "@/features/menu/schemas";
import type { UserOrganization } from "@/features/organizations/types";
import { productionSiteUrl } from "@/lib/env";
import { SettingsFormSection } from "./settings-form-section";

const QR_CODE_SIZE_IN_PIXELS = 1024;

type MenuSettingsProps = {
  organization: UserOrganization;
};

function toFormValues(organization: UserOrganization): MenuSettingsInput {
  return {
    isPublished: organization.menu.isPublished,
    isOnlineOrderingEnabled: organization.menu.isOnlineOrderingEnabled,
    title: organization.menu.title ?? "",
    tagline: organization.menu.tagline ?? "",
    instagram: organization.menu.instagram ?? "",
    note: organization.menu.note ?? "",
  };
}

export function MenuSettings({ organization }: MenuSettingsProps) {
  const saveMenuSettingsMutation = useSaveMenuSettingsMutation(organization.id);
  const form = useForm<MenuSettingsInput>({
    resolver: zodResolver(menuSettingsSchema),
    defaultValues: toFormValues(organization),
  });
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const menuUrl = new URL(
    `/menu/${organization.slug}`,
    productionSiteUrl,
  ).toString();

  useEffect(() => {
    let isCurrent = true;
    QRCode.toDataURL(menuUrl, { width: QR_CODE_SIZE_IN_PIXELS, margin: 2 })
      .then((dataUrl) => {
        if (isCurrent) setQrCodeUrl(dataUrl);
      })
      .catch(() => setQrCodeUrl(null));
    return () => {
      isCurrent = false;
    };
  }, [menuUrl]);

  const handleSubmit = form.handleSubmit((values) =>
    saveMenuSettingsMutation.mutate(values, {
      onSuccess: () => {
        form.reset(values);
        toast.success("Cardápio salvo.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  async function copyMenuUrl() {
    try {
      await navigator.clipboard.writeText(menuUrl);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsFormSection
        title="Cardápio digital"
        description="Página pública com os produtos e preços do PDV, separados pelas suas categorias. No cadastro de cada produto você escolhe se ele aparece no cardápio e pode colocar um detalhe (ex.: 300ml)."
        isDirty={form.formState.isDirty}
        isSubmitting={saveMenuSettingsMutation.isPending}
        onSubmit={handleSubmit}
      >
        <FieldGroup>
          <SwitchField
            control={form.control}
            name="isPublished"
            label="Cardápio publicado"
            description="Desligado, o link mostra “página não encontrada”."
          />
          <SwitchField
            control={form.control}
            name="isOnlineOrderingEnabled"
            label="Receber pedidos pelo cardápio"
            description="O cliente faz o pedido pelo celular para comer no local. Os pedidos só são aceitos enquanto o PDV estiver aberto em algum aparelho, e cada um precisa ser aceito por você."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="title"
              label="Título"
              placeholder={`Ex.: ${organization.name}`}
              description="Vazio, usa o nome do estabelecimento."
            />
            <TextField
              control={form.control}
              name="tagline"
              label="Frase abaixo do título"
              placeholder="Ex.: cafés y coisinhas"
            />
            <TextField
              control={form.control}
              name="instagram"
              label="Instagram"
              placeholder="Ex.: mananacomtil"
            />
            <TextField
              control={form.control}
              name="note"
              label="Observação no rodapé"
              placeholder="Ex.: leite vegetal +4"
            />
          </div>
        </FieldGroup>
      </SettingsFormSection>

      <section className="flex max-w-2xl flex-col gap-5 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center">
        {qrCodeUrl && (
          // biome-ignore lint/performance/noImgElement: data URL gerado no navegador não passa pelo otimizador do Next.
          <img
            src={qrCodeUrl}
            alt={`QR Code do cardápio de ${organization.name}`}
            className="size-40 shrink-0 self-center rounded-lg border"
          />
        )}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-lg">Link e QR Code</h2>
            <p className="break-all text-muted-foreground text-sm">{menuUrl}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={copyMenuUrl}
            >
              <Copy aria-hidden />
              Copiar link
            </Button>
            <Button
              variant="outline"
              className="h-10"
              nativeButton={false}
              render={
                <a href={menuUrl} target="_blank" rel="noopener noreferrer" />
              }
            >
              <ExternalLink aria-hidden />
              Abrir cardápio
            </Button>
            {qrCodeUrl && (
              <Button
                variant="outline"
                className="h-10"
                nativeButton={false}
                render={
                  <a
                    href={qrCodeUrl}
                    download={`cardapio-${organization.slug}-qrcode.png`}
                  />
                }
              >
                <Download aria-hidden />
                Baixar QR Code
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
