type QrCodeOptions = {
  width: number;
  margin: number;
};

export async function createQrCodeDataUrl(
  text: string,
  options: QrCodeOptions,
): Promise<string> {
  const { default: QRCode } = await import("qrcode");
  return QRCode.toDataURL(text, options);
}
