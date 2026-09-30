import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;
const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  compiler: {
    removeConsole: isProduction ? { exclude: ["error", "warn"] } : false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: THIRTY_DAYS_IN_SECONDS,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default withSerwist(nextConfig);
