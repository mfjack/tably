export const PIX_RECEIVER = {
  key: "+5522997823207",
  displayKey: "(22) 99782-3207",
  merchantName: "MARLON FERREIRA",
  merchantCity: "MACAE",
} as const;

function formatField(id: string, value: string) {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

function calculateCrc16(payload: string) {
  let crc = 0xffff;
  for (const character of payload) {
    crc ^= (character.codePointAt(0) ?? 0) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function toTransactionId(reference: string) {
  return reference.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
}

export function buildPixPayload(amount: number, reference: string) {
  const merchantAccount = formatField(
    "26",
    formatField("00", "br.gov.bcb.pix") + formatField("01", PIX_RECEIVER.key),
  );
  const payload = [
    formatField("00", "01"),
    merchantAccount,
    formatField("52", "0000"),
    formatField("53", "986"),
    formatField("54", amount.toFixed(2)),
    formatField("58", "BR"),
    formatField("59", PIX_RECEIVER.merchantName),
    formatField("60", PIX_RECEIVER.merchantCity),
    formatField("62", formatField("05", toTransactionId(reference))),
    "6304",
  ].join("");

  return `${payload}${calculateCrc16(payload)}`;
}
