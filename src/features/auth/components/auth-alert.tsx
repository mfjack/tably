import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type AuthAlertProps = {
  variant?: "error" | "success";
  children: ReactNode;
};

export function AuthAlert({ variant = "error", children }: AuthAlertProps) {
  const isError = variant === "error";
  const Icon = isError ? CircleAlert : CircleCheck;

  return (
    <Alert
      variant={isError ? "destructive" : "default"}
      role={isError ? "alert" : "status"}
      className={cn(
        "rounded-[10px] border-0 px-3.5 py-3",
        isError ? "bg-destructive/8" : "bg-primary/8 text-primary",
      )}
    >
      <Icon aria-hidden />
      <AlertDescription className={cn(!isError && "text-primary")}>
        {children}
      </AlertDescription>
    </Alert>
  );
}
