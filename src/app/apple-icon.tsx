import { ImageResponse } from "next/og";
import { TablyMark } from "@/components/brand/tably-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<TablyMark size={180} isMaskable />, size);
}
