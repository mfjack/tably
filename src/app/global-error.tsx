"use client";

import "./globals.css";

type GlobalErrorProps = {
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-svh items-center justify-center px-4 font-sans antialiased">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <h1 className="font-semibold text-xl">Algo deu errado</h1>
          <p className="text-muted-foreground text-sm">
            O Tably encontrou um erro inesperado. Tente de novo.
          </p>
          <button
            type="button"
            className="h-11 rounded-lg border px-5 font-medium text-sm"
            onClick={reset}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
