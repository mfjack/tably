import { CenteredLayout } from "@/components/layout/centered-layout";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <CenteredLayout>{children}</CenteredLayout>;
}
