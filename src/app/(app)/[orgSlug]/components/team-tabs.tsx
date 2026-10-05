import Link from "next/link";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export const TEAM_TABS = [
  { value: "team", label: "Funcionários" },
  { value: "monthly", label: "Folha" },
  { value: "vacations", label: "Férias" },
  { value: "thirteenth", label: "13º salário" },
] as const;

export type TeamTab = (typeof TEAM_TABS)[number]["value"];

type TeamTabsProps = {
  employeesHref: string;
  payrollHref: string | null;
  pageTabs: readonly TeamTab[];
  isTeamVisible?: boolean;
};

function buildTabHref(
  tab: TeamTab,
  employeesHref: string,
  payrollHref: string,
): string {
  return tab === "team" ? employeesHref : `${payrollHref}?tab=${tab}`;
}

export function TeamTabs({
  employeesHref,
  payrollHref,
  pageTabs,
  isTeamVisible = true,
}: TeamTabsProps) {
  const visibleTabs = TEAM_TABS.filter((tab) =>
    tab.value === "team" ? isTeamVisible : payrollHref !== null,
  );

  return (
    <TabsList className="max-w-full shrink-0 justify-start overflow-x-auto group-data-horizontal/tabs:h-10">
      {visibleTabs.map((tab) =>
        pageTabs.includes(tab.value) || !payrollHref ? (
          <TabsTrigger key={tab.value} value={tab.value} className="px-3">
            {tab.label}
          </TabsTrigger>
        ) : (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="px-3"
            nativeButton={false}
            render={
              <Link
                href={buildTabHref(tab.value, employeesHref, payrollHref)}
              />
            }
          >
            {tab.label}
          </TabsTrigger>
        ),
      )}
    </TabsList>
  );
}
