import { Logo } from "@/components/brand/logo";

type AuthHeaderProps = {
  title: string;
  description: string;
  showLogo?: boolean;
};

export function AuthHeader({
  title,
  description,
  showLogo = true,
}: AuthHeaderProps) {
  return (
    <header className="flex flex-col gap-2.5">
      {showLogo && <Logo className="mb-3.5" />}
      <h1 className="font-bold text-4xl leading-[1.1] tracking-[-0.03em]">
        {title}
      </h1>
      <p className="text-base text-muted-foreground">{description}</p>
    </header>
  );
}
