import type { Metadata } from "next";
import { SETTINGS_PAGE } from "@/features/modules/app-modules";
import { ModuleComingSoon } from "../components/module-coming-soon";

export const metadata: Metadata = { title: SETTINGS_PAGE.label };

export default function SettingsPage() {
  return (
    <ModuleComingSoon
      label={SETTINGS_PAGE.label}
      description={SETTINGS_PAGE.description}
      icon={SETTINGS_PAGE.icon}
    />
  );
}
