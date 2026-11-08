export const ASAAS_BILLING_TYPES = ["PIX", "CREDIT_CARD"] as const;

export type AsaasBillingType = (typeof ASAAS_BILLING_TYPES)[number];

export function isAsaasBillingType(value: unknown): value is AsaasBillingType {
  return ASAAS_BILLING_TYPES.some((billingType) => billingType === value);
}

export type AsaasCustomer = { id: string };

export type AsaasSubscription = { id: string };

export type AsaasPayment = {
  id: string;
  status: string;
  invoiceUrl: string;
  dueDate: string;
};

export type AsaasList<TItem> = { data: TItem[] };
