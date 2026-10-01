import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOnlineOrderStatus } from "@/features/online-orders/actions";
import { OnlineOrderTracker } from "./components/online-order-tracker";

export const metadata: Metadata = {
  title: "Meu pedido",
  robots: { index: false },
};

export default async function OnlineOrderPage({
  params,
}: PageProps<"/menu/[orgSlug]/orders/[onlineOrderId]">) {
  const { orgSlug, onlineOrderId } = await params;
  const result = await getOnlineOrderStatus(onlineOrderId);

  if (result.status === "error" || result.data.menuSlug !== orgSlug) {
    notFound();
  }

  return (
    <OnlineOrderTracker
      onlineOrderId={onlineOrderId}
      initialOrder={result.data}
    />
  );
}
