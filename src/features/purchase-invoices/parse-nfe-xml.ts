import type { InvoiceInstallment, InvoiceItem, PurchaseInvoice } from "./types";

const ACCESS_KEY_PATTERN = /\d{44}/;

export type ParseInvoiceResult =
  | { status: "valid"; invoice: PurchaseInvoice }
  | { status: "invalid"; message: string };

function getText(parent: Element | Document, tagName: string): string {
  return (
    parent.getElementsByTagNameNS("*", tagName)[0]?.textContent?.trim() ?? ""
  );
}

function getNumber(parent: Element, tagName: string): number {
  const value = Number(getText(parent, tagName));
  return Number.isFinite(value) ? value : 0;
}

function parseItem(detail: Element): InvoiceItem {
  const product = detail.getElementsByTagNameNS("*", "prod")[0] ?? detail;
  return {
    productCode: getText(product, "cProd"),
    description: getText(product, "xProd"),
    unit: getText(product, "uCom"),
    packages: getNumber(product, "qCom"),
    totalCost: getNumber(product, "vProd"),
  };
}

function parseInstallment(duplicate: Element): InvoiceInstallment {
  return {
    dueDate: getText(duplicate, "dVenc"),
    amount: getNumber(duplicate, "vDup"),
  };
}

export function parseNfeXml(xml: string): ParseInvoiceResult {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.getElementsByTagName("parsererror").length > 0) {
    return { status: "invalid", message: "Esse arquivo não é um XML válido." };
  }

  const invoiceInfo = document.getElementsByTagNameNS("*", "infNFe")[0];
  const issuer = document.getElementsByTagNameNS("*", "emit")[0];
  const accessKey =
    invoiceInfo?.getAttribute("Id")?.match(ACCESS_KEY_PATTERN)?.[0] ?? "";
  if (!invoiceInfo || !issuer || !accessKey) {
    return {
      status: "invalid",
      message: "Esse arquivo não é o XML de uma nota fiscal (NF-e).",
    };
  }

  const issuedAt =
    getText(invoiceInfo, "dhEmi") || getText(invoiceInfo, "dEmi");
  const totals = invoiceInfo.getElementsByTagNameNS("*", "ICMSTot")[0];
  const items = Array.from(invoiceInfo.getElementsByTagNameNS("*", "det")).map(
    parseItem,
  );
  if (items.length === 0) {
    return { status: "invalid", message: "A nota não tem produtos." };
  }

  return {
    status: "valid",
    invoice: {
      accessKey,
      number: getText(invoiceInfo, "nNF"),
      issuedAt,
      issuedDate: issuedAt.slice(0, 10),
      totalAmount: totals ? getNumber(totals, "vNF") : 0,
      supplier: {
        taxId: getText(issuer, "CNPJ") || getText(issuer, "CPF"),
        name: getText(issuer, "xFant") || getText(issuer, "xNome"),
        phone: getText(issuer, "fone") || null,
      },
      items,
      installments: Array.from(invoiceInfo.getElementsByTagNameNS("*", "dup"))
        .map(parseInstallment)
        .filter((installment) => installment.amount > 0),
    },
  };
}
