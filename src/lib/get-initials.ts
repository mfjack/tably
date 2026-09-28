const MAX_INITIALS = 2;

export function getInitials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, MAX_INITIALS)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
