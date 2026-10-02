export const ROUTES = {
  home: "/",
  login: "/login",
  signUp: "/sign-up",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  authCallback: "/auth/callback",
  newOrganization: "/new-organization",
  terms: "/terms",
  privacy: "/privacy",
} as const;

export const AUTH_ROUTES = [
  ROUTES.login,
  ROUTES.signUp,
  ROUTES.forgotPassword,
] as const;

export const PUBLIC_ROUTES = [
  ROUTES.home,
  ...AUTH_ROUTES,
  "/auth",
  "/menu",
  "/api/public",
  ROUTES.terms,
  ROUTES.privacy,
] as const;

export const LOGIN_ERROR_CODES = {
  invalidLink: "invalid-link",
} as const;
