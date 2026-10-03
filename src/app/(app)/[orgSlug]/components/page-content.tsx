import type { ReactNode } from "react";

type PageContentProps = {
  children: ReactNode;
};

export function PageContent({ children }: PageContentProps) {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8">
      {children}
    </main>
  );
}
