import * as z from "zod";
import { MEASURE_UNIT_VALUES } from "@/features/ingredients/measure-units";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const CREATE_INGREDIENT_TARGET = "create";
export const SKIP_ITEM_TARGET = "skip";

export const purchaseInvoiceSchema = z.object({
  accessKey: z.string().regex(/^\d{44}$/),
  number: z.string().max(20),
  issuedAt: z.string().min(1),
  issuedDate: z.string().regex(DATE_PATTERN),
  totalAmount: z.number().min(0),
  supplier: z.object({
    taxId: z.string().regex(/^(\d{11}|\d{14})$/),
    name: z.string().trim().min(1).max(100),
    phone: z.string().max(20).nullable(),
  }),
  items: z
    .array(
      z.object({
        productCode: z.string().trim().min(1).max(60),
        description: z.string().trim().min(1).max(200),
        unit: z.string().max(10),
        packages: z.number().positive(),
        totalCost: z.number().min(0),
      }),
    )
    .min(1),
  installments: z.array(
    z.object({
      dueDate: z.string().regex(DATE_PATTERN),
      amount: z.number().positive(),
    }),
  ),
});

const invoiceItemDecisionSchema = z
  .object({
    target: z.string().min(1, "Escolha o insumo."),
    newName: z.string().trim().max(80, "Nome muito longo."),
    newUnit: z.enum(MEASURE_UNIT_VALUES).optional(),
    unitsPerPackage: z
      .number()
      .positive("Informe um valor maior que zero.")
      .optional(),
  })
  .superRefine((decision, context) => {
    if (decision.target === SKIP_ITEM_TARGET) return;
    if (decision.unitsPerPackage === undefined) {
      context.addIssue({
        code: "custom",
        message: "Informe quanto vem em cada embalagem.",
        path: ["unitsPerPackage"],
      });
    }
    if (decision.target !== CREATE_INGREDIENT_TARGET) return;
    if (!decision.newName) {
      context.addIssue({
        code: "custom",
        message: "Dê um nome ao insumo.",
        path: ["newName"],
      });
    }
    if (!decision.newUnit) {
      context.addIssue({
        code: "custom",
        message: "Escolha a unidade.",
        path: ["newUnit"],
      });
    }
  });

export const invoiceImportFormSchema = z.object({
  items: z.array(invoiceItemDecisionSchema),
});

export const invoiceImportSchema = z.object({
  invoice: purchaseInvoiceSchema,
  decisions: z.array(invoiceItemDecisionSchema),
});

export type InvoiceImportFormInput = z.infer<typeof invoiceImportFormSchema>;
export type InvoiceItemDecision = z.infer<typeof invoiceItemDecisionSchema>;
export type InvoiceImportInput = z.infer<typeof invoiceImportSchema>;
