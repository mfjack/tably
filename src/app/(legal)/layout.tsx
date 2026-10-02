import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ROUTES } from "@/lib/routes";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2.5 px-4 sm:px-6">
          <Link href={ROUTES.home} className="flex items-center gap-2.5">
            <Logo />
            <span className="font-semibold text-lg">Tably</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>
      <footer className="border-t">
        <nav className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-muted-foreground text-sm sm:px-6">
          <Link href={ROUTES.terms} className="hover:text-foreground">
            Termos de uso
          </Link>
          <Link href={ROUTES.privacy} className="hover:text-foreground">
            Política de privacidade
          </Link>
        </nav>
      </footer>
    </div>
  );
}
