import { ImageResponse } from "next/og";
import { TablyMark } from "@/components/brand/tably-mark";

const SUPPORTED_ICON_SIZES = [192, 512] as const;

type SupportedIconSize = (typeof SUPPORTED_ICON_SIZES)[number];

function isSupportedIconSize(size: number): size is SupportedIconSize {
  return SUPPORTED_ICON_SIZES.includes(size as SupportedIconSize);
}

export async function GET(
  request: Request,
  context: RouteContext<"/pwa-icon/[size]">,
) {
  const { size: rawSize } = await context.params;
  const iconSize = Number(rawSize);

  if (!isSupportedIconSize(iconSize)) {
    return new Response("Not found", { status: 404 });
  }

  const isMaskable = new URL(request.url).searchParams.has("maskable");

  return new ImageResponse(
    <TablyMark size={iconSize} isMaskable={isMaskable} />,
    { width: iconSize, height: iconSize },
  );
}
