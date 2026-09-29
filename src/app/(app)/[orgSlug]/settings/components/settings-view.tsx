"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CurrentUser } from "@/features/auth/types";
import { APP_MODULES } from "@/features/modules/app-modules";
import type { UserOrganization } from "@/features/organizations/types";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { ModuleVisibilityForm } from "./module-visibility-form";
import { OperatorsSettings } from "./operators-settings";
import { OrganizationSettingsForm } from "./organization-settings-form";
import { ProfileForm } from "./profile-form";

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
          <TabsList className="group-data-horizontal/tabs:h-10">
            {canManageOrganization && (
              <>
                <TabsTrigger value="organization" className="px-4">
                  Estabelecimento
                </TabsTrigger>
                <TabsTrigger value="modules" className="px-4">
                  Módulos
                </TabsTrigger>
                <TabsTrigger value="operators" className="px-4">
                  Operadores
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="profile" className="px-4">
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
              <TabsContent value="modules">
                <ModuleVisibilityForm
                  key={organization.id}
                  organizationId={organization.id}
                  hiddenModules={organization.hiddenModules}
                />
              </TabsContent>
            </>
          )}
          <TabsContent value="profile">
            <ProfileForm
              email={currentUser.email}
              fullName={currentUser.fullName}
            />
          </TabsContent>
        </Tabs>
      </PageContent>
    </>
  );
}
