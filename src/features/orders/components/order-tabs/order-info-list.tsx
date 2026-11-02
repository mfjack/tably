type OrderInfoRow = {
  label: string;
  value: string;
};

type OrderInfoListProps = {
  rows: readonly OrderInfoRow[];
};

export function OrderInfoList({ rows }: OrderInfoListProps) {
  return (
    <dl className="flex flex-col gap-1.5 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex gap-1.5">
          <dt className="text-muted-foreground">{row.label}:</dt>
          <dd className="min-w-0 truncate font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
