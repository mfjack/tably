import type { CurrentUser } from "./types";

export function getUserDisplayName(
  user: Pick<CurrentUser, "fullName" | "email">,
): string {
  return user.fullName ?? user.email;
}
