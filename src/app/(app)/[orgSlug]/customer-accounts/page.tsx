import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { CustomerAccountsView } from "./components/customer-accounts-view";

const customerAccountsModule = getAppModule("customer_accounts");

export const metadata: Metadata = { title: customerAccountsModule.label };

export default async function CustomerAccountsPage({
  params,
}: PageProps<"/[orgSlug]/customer-accounts">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "customer_accounts");

  return (
    <CustomerAccountsView
      organizationId={organization.id}
      title={customerAccountsModule.label}
      description={customerAccountsModule.description}
      paymentFees={organization.paymentFees}
      acceptedPaymentMethods={organization.checkout.acceptedPaymentMethods}
    />
  );
}
