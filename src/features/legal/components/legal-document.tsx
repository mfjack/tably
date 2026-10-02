import type { ReactNode } from "react";

type LegalDocumentProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalDocument({
  title,
  lastUpdated,
  children,
}: LegalDocumentProps) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-bold text-3xl tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">
          Última atualização: {lastUpdated}
        </p>
      </header>
      {children}
    </article>
  );
}

type LegalSectionProps = {
  title: string;
  children: ReactNode;
};

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="flex flex-col gap-3 text-sm leading-relaxed sm:text-base">
      <h2 className="font-semibold text-foreground text-lg">{title}</h2>
      {children}
    </section>
  );
}

type LegalListProps = {
  items: readonly ReactNode[];
};

export function LegalList({ items }: LegalListProps) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5">
      {items.map((item, index) => (
        <li key={`legal-item-${index.toString()}`}>{item}</li>
      ))}
    </ul>
  );
}
