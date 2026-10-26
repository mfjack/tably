import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CurrentUser } from "@/features/auth/types";
import { APP_MODULES } from "@/features/modules/app-modules";
import type { UserOrganization } from "@/features/organizations/types";
import { getPlanHiddenModules } from "@/features/subscriptions/subscription-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { CheckoutSettingsForm } from "./checkout-settings-form";
import { DeleteAccountSection } from "./delete-account-section";
import { LoyaltySettingsForm } from "./loyalty-settings-form";
import { MenuSettings } from "./menu-settings";
import { ModuleVisibilityForm } from "./module-visibility-form";
import { OpeningHoursForm } from "./opening-hours-form";
import { OrganizationSettingsForm } from "./organization-settings-form";
import { PaymentFeesForm } from "./payment-fees-form";
import { ProfileForm } from "./profile-form";
import { SubscriptionSettings } from "./subscription-settings";
import { TeamSettings } from "./team-settings";
import { ThermalPrinterSettings } from "./thermal-printer-settings";

const ESTABLISHMENT_TABS = ["checkout", "loyalty", "menu"] as const;

const OWNER_TABS = ["organization", "modules", "subscription", "team"] as const;

const PERSONAL_TABS = ["printer", "profile"] as const;

type SettingsViewProps = {
  title: string;
  description: string;
  organization: UserOrganization;
  currentUser: CurrentUser;
  canManageEstablishment: boolean;
  isOwner: boolean;
  initialTab?: string;
};

export function SettingsView({
  title,
  description,
  organization,
  currentUser,
  canManageEstablishment,
  isOwner,
  initialTab,
}: SettingsViewProps) {
  const defaultTab = isOwner
    ? "organization"
    : canManageEstablishment
      ? "checkout"
      : "printer";
  const availableTabs: readonly string[] = [
    ...(canManageEstablishment ? ESTABLISHMENT_TABS : []),
    ...(isOwner ? OWNER_TABS : []),
    ...PERSONAL_TABS,
  ];
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
          className="min-h-0 gap-6"
        >
          <TabsList className="w-full justify-start overflow-x-auto group-data-horizontal/tabs:h-10 sm:w-fit">
            {isOwner && (
              <>
                <TabsTrigger value="organization" className="shrink-0 px-4">
                  Estabelecimento
                </TabsTrigger>
                <TabsTrigger value="modules" className="shrink-0 px-4">
                  Páginas
                </TabsTrigger>
              </>
            )}
            {canManageEstablishment && (
              <>
                <TabsTrigger value="checkout" className="shrink-0 px-4">
                  Vendas
                </TabsTrigger>
                <TabsTrigger value="loyalty" className="shrink-0 px-4">
                  Fidelidade
                </TabsTrigger>
                <TabsTrigger value="menu" className="shrink-0 px-4">
                  Cardápio
                </TabsTrigger>
              </>
            )}
            {isOwner && (
              <>
                {organization.subscription && (
                  <TabsTrigger value="subscription" className="shrink-0 px-4">
                    Assinatura
                  </TabsTrigger>
                )}
                <TabsTrigger value="team" className="shrink-0 px-4">
                  Equipe
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
          {isOwner && (
            <>
              <TabsContent
                value="organization"
                className="flex min-h-0 flex-col gap-6 overflow-y-auto *:shrink-0"
              >
                <OrganizationSettingsForm
                  key={organization.id}
                  organization={organization}
                />
                <OpeningHoursForm
                  key={`${organization.id}-opening-hours`}
                  organization={organization}
                />
              </TabsContent>
              <TabsContent value="modules" className="min-h-0 overflow-y-auto">
                <ModuleVisibilityForm
                  key={organization.id}
                  organizationId={organization.id}
                  hiddenModules={organization.manuallyHiddenModules}
                  selectableModules={organization.selectableModules}
                />
              </TabsContent>
            </>
          )}
          {canManageEstablishment && (
            <>
              <TabsContent
                value="checkout"
                className="flex min-h-0 flex-col gap-6 overflow-y-auto *:shrink-0"
              >
                <CheckoutSettingsForm
                  key={organization.id}
                  organization={organization}
                />
                <PaymentFeesForm
                  key={`${organization.id}-payment-fees`}
                  organization={organization}
                />
              </TabsContent>
              <TabsContent value="loyalty" className="min-h-0 overflow-y-auto">
                <LoyaltySettingsForm
                  key={organization.id}
                  organization={organization}
                  isAvailableInPlan={
                    getPlanHiddenModules(organization.subscription, ["loyalty"])
                      .length === 0
                  }
                />
              </TabsContent>
              <TabsContent value="menu" className="min-h-0 overflow-y-auto">
                <MenuSettings
                  key={organization.id}
                  organization={organization}
                />
              </TabsContent>
            </>
          )}
          {isOwner && (
            <>
              {organization.subscription && (
                <TabsContent
                  value="subscription"
                  className="min-h-0 overflow-y-auto"
                >
                  <SubscriptionSettings
                    organization={organization}
                    subscription={organization.subscription}
                  />
                </TabsContent>
              )}
              <TabsContent value="team" className="min-h-0 overflow-y-auto">
                <TeamSettings
                  organizationId={organization.id}
                  organizationName={organization.name}
                  visibleModuleIds={APP_MODULES.map(
                    (appModule) => appModule.id,
                  ).filter(
                    (moduleId) =>
                      !organization.hiddenModules.includes(moduleId),
                  )}
                />
              </TabsContent>
            </>
          )}
          <TabsContent value="printer" className="min-h-0 overflow-y-auto">
            <ThermalPrinterSettings />
          </TabsContent>
          <TabsContent
            value="profile"
            className="flex min-h-0 flex-col gap-6 overflow-y-auto *:shrink-0"
          >
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
