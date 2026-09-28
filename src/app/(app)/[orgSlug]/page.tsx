import { redirect } from "next/navigation";
import {
  buildOrganizationPath,
  DEFAULT_MODULE_PATH,
} from "@/features/modules/app-modules";

export default async function OrganizationHomePage({
  params,
}: PageProps<"/[orgSlug]">) {
  const { orgSlug } = await params;
  redirect(buildOrganizationPath(orgSlug, DEFAULT_MODULE_PATH));
}
