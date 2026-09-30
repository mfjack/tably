export const CNPJ_PATTERN = "##.###.###/####-##";
export const CPF_PATTERN = "###.###.###-##";
export const PIS_PATTERN = "###.#####.##-#";
export const CBO_PATTERN = "####-##";
const BANK_SLIP_PATTERN =
  "#####.##### #####.###### #####.###### # ##############";
const UTILITY_BILL_PATTERN =
  "###########-# ###########-# ###########-# ###########-#";
const UTILITY_BILL_PREFIX = "8";

const LANDLINE_PHONE_PATTERN = "## ####-####";
const MOBILE_PHONE_PATTERN = "## #####-####";
const LANDLINE_PHONE_LENGTH = 10;
const ELEVEN_DIGITS_PATTERN = /^\d{11}$/;
const REPEATED_ELEVEN_DIGITS_PATTERN = /^(\d)\1{10}$/;

const PIS_CHECK_WEIGHTS = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

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

export function formatCpf(digits: string): string {
  return applyDigitPattern(digits, CPF_PATTERN);
}

export function getBoletoPattern(digits: string): string {
  return digits.startsWith(UTILITY_BILL_PREFIX)
    ? UTILITY_BILL_PATTERN
    : BANK_SLIP_PATTERN;
}

export function formatBoleto(digits: string): string {
  return applyDigitPattern(digits, getBoletoPattern(digits));
}

export function formatCbo(digits: string): string {
  return applyDigitPattern(digits, CBO_PATTERN);
}

export function formatPis(digits: string): string {
  return applyDigitPattern(digits, PIS_PATTERN);
}

function hasElevenDistinctDigits(digits: string) {
  return (
    ELEVEN_DIGITS_PATTERN.test(digits) &&
    !REPEATED_ELEVEN_DIGITS_PATTERN.test(digits)
  );
}

function getCpfCheckDigit(digits: string, length: number) {
  let sum = 0;
  for (let index = 0; index < length; index++) {
    sum += Number(digits[index]) * (length + 1 - index);
  }
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidCpf(digits: string): boolean {
  if (!hasElevenDistinctDigits(digits)) return false;
  return (
    getCpfCheckDigit(digits, 9) === Number(digits[9]) &&
    getCpfCheckDigit(digits, 10) === Number(digits[10])
  );
}

export function isValidPis(digits: string): boolean {
  if (!hasElevenDistinctDigits(digits)) return false;
  const sum = PIS_CHECK_WEIGHTS.reduce(
    (total, weight, index) => total + Number(digits[index]) * weight,
    0,
  );
  const remainder = 11 - (sum % 11);
  return (remainder >= 10 ? 0 : remainder) === Number(digits[10]);
}
