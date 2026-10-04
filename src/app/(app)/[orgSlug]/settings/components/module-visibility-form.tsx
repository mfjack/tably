"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import {
  APP_MODULES,
  getVisibleModuleGroups,
} from "@/features/modules/app-modules";
import { useUpdateOrganizationModulesMutation } from "@/features/organizations/hooks/use-update-organization-modules-mutation";
import {
  type OrganizationModulesInput,
  organizationModulesSchema,
} from "@/features/organizations/schemas";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { SettingsFormSection } from "./settings-form-section";

type ModuleVisibilityFormProps = {
  organizationId: OrganizationId;
  hiddenModules: AppModuleId[];
  selectableModules: readonly AppModuleId[];
};

function toggleHiddenModule(
  hiddenModules: readonly AppModuleId[],
  moduleId: AppModuleId,
  isVisible: boolean,
): AppModuleId[] {
  return isVisible
    ? hiddenModules.filter((hiddenModuleId) => hiddenModuleId !== moduleId)
    : [...hiddenModules, moduleId];
}

export function ModuleVisibilityForm({
  organizationId,
  hiddenModules,
  selectableModules,
}: ModuleVisibilityFormProps) {
  const router = useRouter();
  const updateModulesMutation =
    useUpdateOrganizationModulesMutation(organizationId);
  const form = useForm<OrganizationModulesInput>({
    resolver: zodResolver(organizationModulesSchema),
    defaultValues: { hiddenModules },
  });

  const handleSubmit = form.handleSubmit((values) =>
    updateModulesMutation.mutate(values, {
      onSuccess: () => {
        form.reset(values);
        toast.success("Páginas atualizadas.");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <SettingsFormSection
      title="Páginas"
      description="Esconda do menu o que o seu negócio não usa. Os dados continuam salvos e voltam ao reativar. Com a Cozinha desligada, os pedidos não vão para a cozinha."
      isDirty={form.formState.isDirty}
      isSubmitting={updateModulesMutation.isPending}
      onSubmit={handleSubmit}
    >
      <Controller
        control={form.control}
        name="hiddenModules"
        render={({ field }) => (
          <div className="flex flex-col gap-6">
            {getVisibleModuleGroups(
              APP_MODULES.filter(
                ({ id }) => !selectableModules.includes(id),
              ).map(({ id }) => id),
            ).map((group) => (
              <FieldSet key={group.label} className="gap-3">
                <FieldLegend variant="label">{group.label}</FieldLegend>
                <div className="flex flex-col gap-2">
                  {group.modules.map((appModule) => {
                    const switchId = `module-${appModule.id}`;
                    const Icon = appModule.icon;

                    return (
                      <Field
                        key={appModule.id}
                        orientation="horizontal"
                        className="items-center rounded-lg border px-4 py-3"
                      >
                        <Icon
                          aria-hidden
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                        <FieldContent>
                          <FieldLabel htmlFor={switchId}>
                            {appModule.label}
                          </FieldLabel>
                          <FieldDescription>
                            {appModule.description}
                          </FieldDescription>
                        </FieldContent>
                        <Switch
                          id={switchId}
                          checked={!field.value.includes(appModule.id)}
                          onCheckedChange={(isVisible) =>
                            field.onChange(
                              toggleHiddenModule(
                                field.value,
                                appModule.id,
                                isVisible,
                              ),
                            )
                          }
                        />
                      </Field>
                    );
                  })}
                </div>
              </FieldSet>
            ))}
          </div>
        )}
      />
    </SettingsFormSection>
  );
}
