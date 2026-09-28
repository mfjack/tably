import type { ReactNode } from "react";

type CenteredLayoutProps = {
  children: ReactNode;
};

export function CenteredLayout({ children }: CenteredLayoutProps) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-[380px]">{children}</div>
    </main>
  );
}
