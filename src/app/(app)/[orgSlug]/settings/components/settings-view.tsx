import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CurrentUser } from "@/features/auth/types";
import { APP_MODULES } from "@/features/modules/app-modules";
import type { UserOrganization } from "@/features/organizations/types";
import {
  getOperatorLimit,
  getPlanHiddenModules,
} from "@/features/subscriptions/subscription-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { CheckoutSettingsForm } from "./checkout-settings-form";
import { DeleteAccountSection } from "./delete-account-section";
import { LoyaltySettingsForm } from "./loyalty-settings-form";
import { MenuSettings } from "./menu-settings";
import { OperatorsSettings } from "./operators-settings";
import { OrganizationSettingsForm } from "./organization-settings-form";
import { ProfileForm } from "./profile-form";
import { SubscriptionSettings } from "./subscription-settings";
import { ThermalPrinterSettings } from "./thermal-printer-settings";

type SettingsViewProps = {
  title: string;
  description: string;
  organization: UserOrganization;
  currentUser: CurrentUser;
  canManageOrganization: boolean;
  initialTab?: string;
};

export function SettingsView({
  title,
  description,
  organization,
  currentUser,
  canManageOrganization,
  initialTab,
}: SettingsViewProps) {
  const defaultTab = canManageOrganization ? "organization" : "profile";
  const availableTabs = canManageOrganization
    ? [
        "organization",
        "checkout",
        "loyalty",
        "subscription",
        "operators",
        "menu",
        "printer",
        "profile",
      ]
    : ["printer", "profile"];
  return (
    <>
      <PageHeader title={title} description={description} />
      <PageContent>
        <Tabs
          defaultValue={
            initialTab && availableTabs.includes(initialTab)
              ? initialTab
              : defaultTab
          }
          className="gap-6"
        >
          <TabsList className="w-full justify-start overflow-x-auto group-data-horizontal/tabs:h-10 sm:w-fit">
            {canManageOrganization && (
              <>
                <TabsTrigger value="organization" className="shrink-0 px-4">
                  Estabelecimento
                </TabsTrigger>
                <TabsTrigger value="checkout" className="shrink-0 px-4">
                  Vendas
                </TabsTrigger>
                <TabsTrigger value="loyalty" className="shrink-0 px-4">
                  Fidelidade
                </TabsTrigger>
                {organization.subscription && (
                  <TabsTrigger value="subscription" className="shrink-0 px-4">
                    Assinatura
                  </TabsTrigger>
                )}
                <TabsTrigger value="operators" className="shrink-0 px-4">
                  Operadores
                </TabsTrigger>
                <TabsTrigger value="menu" className="shrink-0 px-4">
                  Cardápio
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="printer" className="shrink-0 px-4">
              Impressora
            </TabsTrigger>
            <TabsTrigger value="profile" className="shrink-0 px-4">
              Meu perfil
            </TabsTrigger>
          </TabsList>
          {canManageOrganization && (
            <>
              <TabsContent value="organization">
                <OrganizationSettingsForm
                  key={organization.id}
                  organization={organization}
                />
              </TabsContent>
              <TabsContent value="checkout">
                <CheckoutSettingsForm
                  key={organization.id}
                  organization={organization}
                />
              </TabsContent>
              <TabsContent value="loyalty">
                <LoyaltySettingsForm
                  key={organization.id}
                  organization={organization}
                  isAvailableInPlan={
                    getPlanHiddenModules(organization.subscription, ["loyalty"])
                      .length === 0
                  }
                />
              </TabsContent>
              {organization.subscription && (
                <TabsContent value="subscription">
                  <SubscriptionSettings
                    organization={organization}
                    subscription={organization.subscription}
                  />
                </TabsContent>
              )}
              <TabsContent value="operators">
                <OperatorsSettings
                  organizationId={organization.id}
                  operatorLimit={getOperatorLimit(organization.subscription)}
                  visibleModuleIds={APP_MODULES.map(
                    (appModule) => appModule.id,
                  ).filter(
                    (moduleId) =>
                      !organization.hiddenModules.includes(moduleId),
                  )}
                />
              </TabsContent>
              <TabsContent value="menu">
                <MenuSettings
                  key={organization.id}
                  organization={organization}
                />
              </TabsContent>
            </>
          )}
          <TabsContent value="printer">
            <ThermalPrinterSettings />
          </TabsContent>
          <TabsContent value="profile" className="flex flex-col gap-6">
            <ProfileForm
              email={currentUser.email}
              fullName={currentUser.fullName}
            />
            <DeleteAccountSection email={currentUser.email} />
          </TabsContent>
        </Tabs>
      </PageContent>
    </>
  );
}
