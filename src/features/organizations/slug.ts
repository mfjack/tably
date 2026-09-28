const SLUG_SUFFIX_LENGTH = 4;
const FALLBACK_SLUG = "my-business";

const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "api",
  "apple-icon",
  "auth",
  "forgot-password",
  "icon",
  "login",
  "manifest-webmanifest",
  "new-organization",
  "pwa-icon",
  "reset-password",
  "sign-up",
]);

export function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || FALLBACK_SLUG;
}

function createRandomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, SLUG_SUFFIX_LENGTH);
}

export function buildSlugCandidate(baseSlug: string, attempt: number): string {
  const canUseBaseSlug = attempt === 0 && !RESERVED_SLUGS.has(baseSlug);
  return canUseBaseSlug ? baseSlug : `${baseSlug}-${createRandomSuffix()}`;
}
