export type CieloPaymentCode = "CREDITO_AVISTA" | "DEBITO_AVISTA" | "PIX";

export type CieloOrderStatus =
  | "DRAFT"
  | "ENTERED"
  | "PAID"
  | "CLOSED"
  | "RE-ENTERED";

export type CieloTransaction = {
  id: string;
  status: "CONFIRMED" | "PENDING" | "CANCELLED";
  amount: number;
  transaction_type: "PAYMENT" | "CANCELLATION";
  authorization_code?: string;
  payment_fields?: {
    primary_product_name?: string;
    secondary_product_name?: string;
    number_of_quotas?: number;
  };
  card?: { brand?: string; mask?: string };
};

export type CieloOrder = {
  id: string;
  status: CieloOrderStatus;
  price: number;
  payment_code?: CieloPaymentCode;
  transactions?: CieloTransaction[];
};

export type CreateCieloOrderInput = {
  number: string;
  reference: string;
  amountInCents: number;
  paymentCode: CieloPaymentCode;
};
