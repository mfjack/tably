import { Gift } from "lucide-react";
import type { LoyaltySummary } from "@/features/sales-report/types";
import { formatCurrency } from "@/lib/format";
import { ReportSection } from "./report-section";
import { ReportStat } from "./report-stat";

type LoyaltyReportSectionProps = {
  loyalty: LoyaltySummary;
};

export function LoyaltyReportSection({ loyalty }: LoyaltyReportSectionProps) {
  return (
    <ReportSection
      title="Fidelidade"
      description="Selos dados, prêmios entregues e quanto os prêmios custaram no período."
      icon={Gift}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ReportStat
          label="Selos dados"
          value={loyalty.stampsGiven.toString()}
        />
        <ReportStat
          label="Prêmios resgatados"
          value={loyalty.rewardsRedeemed.toString()}
        />
        <ReportStat
          label="Valor dos prêmios"
          value={formatCurrency(loyalty.rewardCost)}
        />
        <ReportStat
          label="Clientes que pontuaram"
          value={loyalty.activeCustomers.toString()}
        />
        <ReportStat
          label="Clientes novos"
          value={loyalty.newCustomers.toString()}
        />
      </div>
    </ReportSection>
  );
}
