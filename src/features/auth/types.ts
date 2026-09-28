import type { Brand } from "@/lib/brand";

export type UserId = Brand<string, "UserId">;

export type CurrentUser = {
  id: UserId;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};
