import { onlyDigits } from "@/lib/masks";

const BANK_LINE_LENGTH = 47;
const UTILITY_LINE_LENGTH = 48;
const UTILITY_PREFIX = "8";
const CENTS_FACTOR = 100;
const MILLISECONDS_PER_DAY = 86_400_000;
const OLD_FACTOR_BASE = Date.UTC(1997, 9, 7);
const NEW_FACTOR_BASE = Date.UTC(2025, 1, 22);
const NEW_FACTOR_START = 1000;
const MAX_UTILITY_DUE_DATE_DISTANCE_IN_DAYS = 365;

export type BoletoData = {
  kind: "bank" | "utility";
  digitableLine: string;
  amount: number | null;
  dueDate: string | null;
};

export type BoletoParseResult =
  | { status: "valid"; boleto: BoletoData }
  | { status: "invalid"; message: string };

function calculateModulo10(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let index = digits.length - 1; index >= 0; index--) {
    const product = Number(digits[index]) * weight;
    sum += product > 9 ? Math.floor(product / 10) + (product % 10) : product;
    weight = weight === 2 ? 1 : 2;
  }
  return (10 - (sum % 10)) % 10;
}

function calculateUtilityModulo11(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let index = digits.length - 1; index >= 0; index--) {
    sum += Number(digits[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  return remainder <= 1 ? 0 : 11 - remainder;
}

function toDateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getDueDateFromFactor(factor: number, today: string): string | null {
  if (factor === 0) return null;
  const todayTimestamp = Date.parse(`${today}T00:00:00Z`);
  const candidates = [
    OLD_FACTOR_BASE + factor * MILLISECONDS_PER_DAY,
    factor >= NEW_FACTOR_START
      ? NEW_FACTOR_BASE + (factor - NEW_FACTOR_START) * MILLISECONDS_PER_DAY
      : null,
  ].filter((candidate) => candidate !== null);
  const closest = candidates.reduce((best, candidate) =>
    Math.abs(candidate - todayTimestamp) < Math.abs(best - todayTimestamp)
      ? candidate
      : best,
  );
  return toDateKey(closest);
}

function parseBankLine(line: string, today: string): BoletoParseResult {
  const fields = [
    { data: line.slice(0, 9), checkDigit: line[9] },
    { data: line.slice(10, 20), checkDigit: line[20] },
    { data: line.slice(21, 31), checkDigit: line[31] },
  ];
  const hasInvalidField = fields.some(
    (field) => calculateModulo10(field.data) !== Number(field.checkDigit),
  );
  if (hasInvalidField) {
    return {
      status: "invalid",
      message: "Código do boleto inválido. Confira os números.",
    };
  }

  const factor = Number(line.slice(33, 37));
  const amountInCents = Number(line.slice(37, 47));
  return {
    status: "valid",
    boleto: {
      kind: "bank",
      digitableLine: line,
      amount: amountInCents > 0 ? amountInCents / CENTS_FACTOR : null,
      dueDate: getDueDateFromFactor(factor, today),
    },
  };
}

function isPlausibleDate(dateKey: string, today: string): boolean {
  const timestamp = Date.parse(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(timestamp) || toDateKey(timestamp) !== dateKey) return false;
  const distance =
    Math.abs(timestamp - Date.parse(`${today}T00:00:00Z`)) /
    MILLISECONDS_PER_DAY;
  return distance <= MAX_UTILITY_DUE_DATE_DISTANCE_IN_DAYS;
}

function parseUtilityLine(line: string, today: string): BoletoParseResult {
  const valueIdentifier = line[2];
  const usesModulo10 = valueIdentifier === "6" || valueIdentifier === "7";
  const blocks = [0, 12, 24, 36].map((start) => ({
    data: line.slice(start, start + 11),
    checkDigit: Number(line[start + 11]),
  }));
  const hasInvalidBlock = blocks.some(
    (block) =>
      (usesModulo10
        ? calculateModulo10(block.data)
        : calculateUtilityModulo11(block.data)) !== block.checkDigit,
  );
  if (hasInvalidBlock) {
    return {
      status: "invalid",
      message: "Código da conta inválido. Confira os números.",
    };
  }

  const barcode = blocks.map((block) => block.data).join("");
  const hasRealAmount = valueIdentifier === "6" || valueIdentifier === "8";
  const amountInCents = Number(barcode.slice(4, 15));
  const dueDateCandidate = `${barcode.slice(19, 23)}-${barcode.slice(23, 25)}-${barcode.slice(25, 27)}`;

  return {
    status: "valid",
    boleto: {
      kind: "utility",
      digitableLine: line,
      amount:
        hasRealAmount && amountInCents > 0
          ? amountInCents / CENTS_FACTOR
          : null,
      dueDate: isPlausibleDate(dueDateCandidate, today)
        ? dueDateCandidate
        : null,
    },
  };
}

const BARCODE_LENGTH = 44;
const UTILITY_BLOCK_LENGTH = 11;

function withModulo10(digits: string): string {
  return `${digits}${calculateModulo10(digits)}`;
}

export function barcodeToDigitableLine(barcode: string): string | null {
  const digits = onlyDigits(barcode);
  if (digits.length !== BARCODE_LENGTH) return null;

  if (digits.startsWith(UTILITY_PREFIX)) {
    const usesModulo10 = digits[2] === "6" || digits[2] === "7";
    return [0, 1, 2, 3]
      .map((index) => {
        const block = digits.slice(
          index * UTILITY_BLOCK_LENGTH,
          (index + 1) * UTILITY_BLOCK_LENGTH,
        );
        const checkDigit = usesModulo10
          ? calculateModulo10(block)
          : calculateUtilityModulo11(block);
        return `${block}${checkDigit}`;
      })
      .join("");
  }

  return [
    withModulo10(`${digits.slice(0, 4)}${digits.slice(19, 24)}`),
    withModulo10(digits.slice(24, 34)),
    withModulo10(digits.slice(34, 44)),
    digits[4],
    digits.slice(5, 19),
  ].join("");
}

export function parseBoleto(input: string, today: string): BoletoParseResult {
  const digits = onlyDigits(input);

  if (
    digits.length === UTILITY_LINE_LENGTH &&
    digits.startsWith(UTILITY_PREFIX)
  ) {
    return parseUtilityLine(digits, today);
  }
  if (digits.length === BANK_LINE_LENGTH) {
    return parseBankLine(digits, today);
  }
  return {
    status: "invalid",
    message:
      "Cole a linha digitável completa: 47 números no boleto bancário ou 48 nas contas de consumo.",
  };
}
