import type { Metadata, Viewport } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Tably",
    template: "%s · Tably",
  },
  description:
    "Sistema de gestão para cafeterias, restaurantes, açaiterias e muito mais.",
  applicationName: "Tably",
  appleWebApp: {
    capable: true,
    title: "Tably",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f5a43",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
