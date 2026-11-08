import { timingSafeEqual } from "node:crypto";
import * as z from "zod";
import { serverEnv } from "@/lib/server-env";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAID_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const REVERTED_EVENTS = new Set([
  "PAYMENT_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
]);

const webhookEventSchema = z.object({
  event: z.string(),
  payment: z
    .object({
      id: z.string(),
      subscription: z.string().nullish(),
      value: z.number(),
    })
    .optional(),
});

function hasValidToken(request: Request) {
  const expectedToken = serverEnv.ASAAS_WEBHOOK_TOKEN;
  const receivedToken = request.headers.get("asaas-access-token");
  if (!expectedToken || !receivedToken) return false;
  const expected = Buffer.from(expectedToken);
  const received = Buffer.from(receivedToken);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

function jsonResponse(body: object, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  if (!hasValidToken(request)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsedEvent = webhookEventSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedEvent.success) return jsonResponse({ received: true });

  const { event, payment } = parsedEvent.data;
  if (!payment?.subscription) return jsonResponse({ received: true });

  const supabase = createAdminClient();
  const { error } = PAID_EVENTS.has(event)
    ? await supabase.rpc("record_asaas_payment", {
        p_asaas_subscription_id: payment.subscription,
        p_asaas_payment_id: payment.id,
        p_amount: payment.value,
      })
    : REVERTED_EVENTS.has(event)
      ? await supabase.rpc("revert_asaas_payment", {
          p_asaas_payment_id: payment.id,
        })
      : { error: null };

  if (error && error.code !== "P0002") {
    console.error("Asaas webhook failed", error);
    return jsonResponse({ error: "failed" }, 500);
  }
  return jsonResponse({ received: true });
}
