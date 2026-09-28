import { ImageResponse } from "next/og";
import { TablyMark } from "@/components/brand/tably-mark";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<TablyMark size={64} />, size);
}
