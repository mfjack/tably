import type { ReactNode } from "react";

type PageContentProps = {
  children: ReactNode;
};

export function PageContent({ children }: PageContentProps) {
  return (
    <main className="flex flex-1 flex-col px-4 py-6 md:px-8">{children}</main>
  );
}
