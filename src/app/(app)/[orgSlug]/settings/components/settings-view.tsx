"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CurrentUser } from "@/features/auth/types";
import { APP_MODULES } from "@/features/modules/app-modules";
import type { UserOrganization } from "@/features/organizations/types";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { DeleteAccountSection } from "./delete-account-section";
import { OperatorsSettings } from "./operators-settings";
import { OrganizationSettingsForm } from "./organization-settings-form";
import { ProfileForm } from "./profile-form";
import { ThermalPrinterSettings } from "./thermal-printer-settings";

type SettingsViewProps = {
  title: string;
  description: string;
  organization: UserOrganization;
  currentUser: CurrentUser;
  canManageOrganization: boolean;
};

export function SettingsView({
  title,
  description,
  organization,
  currentUser,
  canManageOrganization,
}: SettingsViewProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <PageContent>
        <Tabs
          defaultValue={canManageOrganization ? "organization" : "profile"}
          className="gap-6"
        >
          <TabsList className="w-full justify-start overflow-x-auto group-data-horizontal/tabs:h-10 sm:w-fit">
            {canManageOrganization && (
              <>
                <TabsTrigger value="organization" className="shrink-0 px-4">
                  Estabelecimento
                </TabsTrigger>
                <TabsTrigger value="operators" className="shrink-0 px-4">
                  Operadores
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
              <TabsContent value="operators">
                <OperatorsSettings
                  organizationId={organization.id}
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
