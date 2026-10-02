import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  isPlatformAdmin,
  listAdminSubscriptions,
} from "@/features/subscriptions/actions";
import { AdminSignOutButton } from "./components/admin-sign-out-button";
import { AdminSubscriptionsView } from "./components/admin-subscriptions-view";

export const metadata: Metadata = { title: "Administração" };

export default async function AdminPage() {
  if (!(await isPlatformAdmin())) notFound();

  const result = await listAdminSubscriptions();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-2xl tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm">
            Planos, testes, pagamentos e liberações de cada estabelecimento.
          </p>
        </div>
        <AdminSignOutButton />
      </header>
      {result.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : (
        <AdminSubscriptionsView subscriptions={result.data} />
      )}
    </main>
  );
}
