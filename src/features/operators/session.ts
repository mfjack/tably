import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { OrganizationId } from "@/features/organizations/types";
import { serverEnv } from "@/lib/server-env";
import type { OperatorId } from "./types";

const COOKIE_PREFIX = "tably_operator_";
const SESSION_MAX_AGE_IN_SECONDS = 60 * 60 * 24 * 30;

function getCookieName(organizationId: OrganizationId) {
  return `${COOKIE_PREFIX}${organizationId}`;
}

function sign(value: string) {
  return createHmac("sha256", serverEnv.OPERATOR_SESSION_SECRET)
    .update(value)
    .digest("base64url");
}

function isValidSignature(value: string, signature: string) {
  const expected = Buffer.from(sign(value));
  const received = Buffer.from(signature);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export async function startOperatorSession(
  organizationId: OrganizationId,
  operatorId: OperatorId,
) {
  const payload = `${organizationId}:${operatorId}`;
  const cookieStore = await cookies();
  cookieStore.set(
    getCookieName(organizationId),
    `${payload}.${sign(payload)}`,
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_IN_SECONDS,
    },
  );
}

export async function endOperatorSession(organizationId: OrganizationId) {
  const cookieStore = await cookies();
  cookieStore.delete(getCookieName(organizationId));
}

type OperatorSessionPayload = {
  organizationId: OrganizationId;
  operatorId: OperatorId;
};

export const OPERATOR_SESSIONS_HEADER = "x-tably-operators";

function parseSessionCookie(
  cookieValue: string,
): OperatorSessionPayload | null {
  const separatorIndex = cookieValue.lastIndexOf(".");
  if (separatorIndex < 0) return null;

  const payload = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  if (!isValidSignature(payload, signature)) return null;

  const [organizationId, operatorId] = payload.split(":");
  if (!organizationId || !operatorId) return null;

  return {
    organizationId: organizationId as OrganizationId,
    operatorId: operatorId as OperatorId,
  };
}

export async function readOperatorSession(
  organizationId: OrganizationId,
): Promise<OperatorId | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(getCookieName(organizationId))?.value;
  const session = cookieValue ? parseSessionCookie(cookieValue) : null;

  return session?.organizationId === organizationId ? session.operatorId : null;
}

export function buildOperatorSessionsHeader(
  requestCookies: ReadonlyArray<{ name: string; value: string }>,
): string {
  return requestCookies
    .filter((cookie) => cookie.name.startsWith(COOKIE_PREFIX))
    .map((cookie) => parseSessionCookie(cookie.value))
    .filter((session) => session !== null)
    .map((session) => `${session.organizationId}:${session.operatorId}`)
    .join(",");
}
