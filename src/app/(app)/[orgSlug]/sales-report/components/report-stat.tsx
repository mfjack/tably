type ReportStatProps = {
  label: string;
  value: string;
};

export function ReportStat({ label, value }: ReportStatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted px-4 py-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-semibold text-base tabular-nums">{value}</span>
    </div>
  );
}
