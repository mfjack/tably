import type { Metadata, Viewport } from "next";
import { Saira } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const saira = Saira({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Tably",
    template: "%s · Tably",
  },
  description: "Sistema de gestão para o seu negócio.",
  applicationName: "Tably",
  appleWebApp: {
    capable: true,
    title: "Tably",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${saira.variable} h-full antialiased select-none`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
