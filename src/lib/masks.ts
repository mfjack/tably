export const CNPJ_PATTERN = "##.###.###/####-##";

const LANDLINE_PHONE_PATTERN = "## ####-####";
const MOBILE_PHONE_PATTERN = "## #####-####";
const LANDLINE_PHONE_LENGTH = 10;

const CNPJ_FIRST_CHECK_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const CNPJ_SECOND_CHECK_WEIGHTS = [
  6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
] as const;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function applyDigitPattern(digits: string, pattern: string): string {
  let formatted = "";
  let digitIndex = 0;

  for (const character of pattern) {
    if (digitIndex >= digits.length) break;
    if (character === "#") {
      formatted += digits[digitIndex];
      digitIndex++;
    } else {
      formatted += character;
    }
  }

  return formatted;
}

export function getPhonePattern(digits: string): string {
  return digits.length > LANDLINE_PHONE_LENGTH
    ? MOBILE_PHONE_PATTERN
    : LANDLINE_PHONE_PATTERN;
}

export function formatPhone(digits: string): string {
  return applyDigitPattern(digits, getPhonePattern(digits));
}

export function formatCnpj(digits: string): string {
  return applyDigitPattern(digits, CNPJ_PATTERN);
}

function getCnpjCheckDigit(digits: string, weights: readonly number[]) {
  const sum = weights.reduce(
    (total, weight, index) => total + Number(digits[index]) * weight,
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false;

  const firstCheckDigit = getCnpjCheckDigit(digits, CNPJ_FIRST_CHECK_WEIGHTS);
  const secondCheckDigit = getCnpjCheckDigit(digits, CNPJ_SECOND_CHECK_WEIGHTS);

  return (
    firstCheckDigit === Number(digits[12]) &&
    secondCheckDigit === Number(digits[13])
  );
}
