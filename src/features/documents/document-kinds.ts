import type { SelectOption } from "@/components/form/select-field";
import { Constants } from "@/lib/supabase/database.types";
import type { DocumentKind } from "./types";

export const DOCUMENT_KIND_VALUES = Constants.public.Enums.document_kind;

export const DOCUMENT_KIND_LABELS = {
  company_registration: "Contrato social",
  tax_registration: "CNPJ e inscrições",
  operating_license: "Alvará de funcionamento",
  health_license: "Licença sanitária",
  fire_certificate: "Bombeiros (AVCB)",
  lease_agreement: "Contrato de aluguel",
  digital_certificate: "Certificado digital",
  other: "Outros",
} as const satisfies Record<DocumentKind, string>;

export const DOCUMENT_KIND_OPTIONS: readonly SelectOption[] =
  DOCUMENT_KIND_VALUES.map((kind) => ({
    value: kind,
    label: DOCUMENT_KIND_LABELS[kind],
  }));
