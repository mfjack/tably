import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userEmail = data?.claims.email;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="flex w-full max-w-[380px] flex-col gap-6">
        <Logo />
        <div className="flex flex-col gap-2">
          <h1 className="font-bold text-3xl tracking-[-0.03em]">
            Você está no Tably
          </h1>
          <p className="text-muted-foreground">
            Conectado como{" "}
            <strong className="text-foreground">{userEmail}</strong>. O próximo
            passo será cadastrar o seu estabelecimento.
          </p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline" className="h-11 w-full">
            <LogOut aria-hidden />
            Sair
          </Button>
        </form>
      </div>
    </main>
  );
}
