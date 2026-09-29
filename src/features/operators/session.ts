import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { OrganizationId } from "@/features/organizations/types";
import { serverEnv } from "@/lib/server-env";
import type { OperatorId } from "./types";

const SESSION_MAX_AGE_IN_SECONDS = 60 * 60 * 24 * 30;

function getCookieName(organizationId: OrganizationId) {
  return `tably_operator_${organizationId}`;
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

export async function readOperatorSession(
  organizationId: OrganizationId,
): Promise<OperatorId | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(getCookieName(organizationId))?.value;
  if (!cookieValue) return null;

  const separatorIndex = cookieValue.lastIndexOf(".");
  const payload = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  if (separatorIndex < 0 || !isValidSignature(payload, signature)) return null;

  const [sessionOrganizationId, operatorId] = payload.split(":");
  if (sessionOrganizationId !== organizationId || !operatorId) return null;

  return operatorId as OperatorId;
}
