"use client";

import { Check } from "lucide-react";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { APP_MODULES, SETTINGS_PAGE } from "@/features/modules/app-modules";
import type { AppModuleId } from "@/features/organizations/types";
import { cn } from "@/lib/utils";

const PAGE_CHIP_CLASS_NAME =
  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

type PageChipProps = {
  label: string;
  isSelected: boolean;
  onToggle: () => void;
};

function PageChip({ label, isSelected, onToggle }: PageChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={cn(
        PAGE_CHIP_CLASS_NAME,
        isSelected
          ? "border-primary bg-primary/10 text-primary"
          : "bg-background text-muted-foreground hover:bg-muted",
      )}
      onClick={onToggle}
    >
      {isSelected && <Check aria-hidden className="size-3.5" />}
      {label}
    </button>
  );
}

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
          <PageChip
            key={appModule.id}
            label={appModule.label}
            isSelected={allowedModules.includes(appModule.id)}
            onToggle={() => toggleModule(appModule.id)}
          />
        ))}
        <PageChip
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
