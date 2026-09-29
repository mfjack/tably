"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useUpdateProfileMutation } from "@/features/auth/hooks/use-update-profile-mutation";
import { type ProfileInput, profileSchema } from "@/features/auth/schemas";
import { SettingsFormSection } from "./settings-form-section";

type ProfileFormProps = {
  email: string;
  fullName: string | null;
};

export function ProfileForm({ email, fullName }: ProfileFormProps) {
  const router = useRouter();
  const updateProfileMutation = useUpdateProfileMutation();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: fullName ?? "" },
  });

  const handleSubmit = form.handleSubmit((values) =>
    updateProfileMutation.mutate(values, {
      onSuccess: () => {
        form.reset(values);
        toast.success("Perfil atualizado.");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <SettingsFormSection
      title="Meu perfil"
      description="Seu nome aparece no menu e como atendente nas comandas."
      isDirty={form.formState.isDirty}
      isSubmitting={updateProfileMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="fullName"
          label="Nome"
          placeholder="Ex.: Marlon Ferreira"
          autoComplete="name"
        />
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Email</span>
          <span className="text-muted-foreground">{email}</span>
        </div>
      </FieldGroup>
    </SettingsFormSection>
  );
}
