import "server-only";
import { nameParts, phoneDigits, sha256 } from "@/lib/tracking/identity";

// Meta Conversions API: the server's copy of what the pixel sends, ported
// from Thirty's _shared/metaConversions.ts. It reaches Meta when an ad
// blocker stops the pixel, and it carries the customer's details (hashed)
// for the purchase. Every event reuses the browser's event id, so Meta
// counts it once. Best effort: nothing here can affect an order.
//
// Settings: META_CAPI_TOKEN (a system user's token; secret) and the pixel
// id (META_PIXEL_ID, or the website's NEXT_PUBLIC_META_PIXEL_ID).
// META_CAPI_TEST_EVENT_CODE shows events in Events Manager → Test events
// instead of counting them: set it only while checking, then remove it.

const GRAPH = "https://graph.facebook.com/v21.0";

const pixelId = () =>
  (process.env.META_PIXEL_ID ?? process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();

export const metaCapiConfigured = () => Boolean(pixelId() && process.env.META_CAPI_TOKEN?.trim());

export type MetaServerEvent = {
  eventName: string;
  eventId: string;
  /** When it happened; defaults to now. */
  eventTime?: Date;
  eventSourceUrl: string;
  customer?: { phone?: string | null; name?: string | null; externalIds?: (string | null)[] };
  browser: {
    fbp?: string | null;
    fbc?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  };
  customData?: Record<string, unknown>;
};

const hashed = async (value: string) => (value ? [await sha256(value)] : undefined);

async function userData(event: MetaServerEvent) {
  const { first, last } = nameParts(event.customer?.name);
  const ids = [...new Set((event.customer?.externalIds ?? []).filter((id): id is string => !!id))];
  const data: Record<string, unknown> = {
    ph: await hashed(phoneDigits(event.customer?.phone)),
    fn: await hashed(first),
    ln: await hashed(last),
    country: await hashed("lb"),
    external_id: ids.length ? await Promise.all(ids.map(sha256)) : undefined,
    client_ip_address: event.browser.ip || undefined,
    client_user_agent: event.browser.userAgent || undefined,
    fbp: event.browser.fbp || undefined,
    fbc: event.browser.fbc || undefined,
  };
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

/** Sends events; true when Meta accepted them, false otherwise (never throws). */
export async function sendMetaEvents(events: MetaServerEvent[]): Promise<boolean> {
  const token = process.env.META_CAPI_TOKEN?.trim();
  if (!token || !pixelId() || events.length === 0) return false;
  try {
    const data = await Promise.all(
      events.map(async (e) => ({
        event_name: e.eventName,
        event_time: Math.floor((e.eventTime ?? new Date()).getTime() / 1000),
        event_id: e.eventId,
        event_source_url: e.eventSourceUrl,
        action_source: "website",
        user_data: await userData(e),
        ...(e.customData ? { custom_data: e.customData } : {}),
      })),
    );
    const testCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();
    const response = await fetch(`${GRAPH}/${pixelId()}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data,
        access_token: token,
        ...(testCode ? { test_event_code: testCode } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      // Meta's error can echo the request, so only its code is logged.
      const detail = (await response.json().catch(() => null)) as {
        error?: { code?: number; error_subcode?: number };
      } | null;
      console.warn("Meta Conversions API refused events", {
        status: response.status,
        code: detail?.error?.code,
        subcode: detail?.error?.error_subcode,
        first: events[0]?.eventName,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.warn(
      "Meta Conversions API unreachable",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
