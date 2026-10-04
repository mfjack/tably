import { ToggleChip } from "@/components/toggle-chip";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { APP_MODULES, SETTINGS_PAGE } from "@/features/modules/app-modules";
import type { AppModuleId } from "@/features/organizations/types";

type PageAccessFieldProps = {
  allowedModules: readonly AppModuleId[];
  canAccessSettings: boolean;
  visibleModuleIds: readonly AppModuleId[];
  errorMessage?: string;
  onAllowedModulesChange: (allowedModules: AppModuleId[]) => void;
  onCanAccessSettingsChange: (canAccessSettings: boolean) => void;
};

export function PageAccessField({
  allowedModules,
  canAccessSettings,
  visibleModuleIds,
  errorMessage,
  onAllowedModulesChange,
  onCanAccessSettingsChange,
}: PageAccessFieldProps) {
  const modules = APP_MODULES.filter((appModule) =>
    visibleModuleIds.includes(appModule.id),
  );

  function toggleModule(moduleId: AppModuleId) {
    onAllowedModulesChange(
      allowedModules.includes(moduleId)
        ? allowedModules.filter(
            (allowedModuleId) => allowedModuleId !== moduleId,
          )
        : [...allowedModules, moduleId],
    );
  }

  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">Páginas liberadas</FieldLegend>
      <div className="flex flex-wrap gap-2">
        {modules.map((appModule) => (
          <ToggleChip
            key={appModule.id}
            label={appModule.label}
            isSelected={allowedModules.includes(appModule.id)}
            onToggle={() => toggleModule(appModule.id)}
          />
        ))}
        <ToggleChip
          label={SETTINGS_PAGE.label}
          isSelected={canAccessSettings}
          onToggle={() => onCanAccessSettingsChange(!canAccessSettings)}
        />
      </div>
      {errorMessage && (
        <FieldError
          errors={[{ message: errorMessage }]}
          className="text-[0.8125rem]"
        />
      )}
    </FieldSet>
  );
}
