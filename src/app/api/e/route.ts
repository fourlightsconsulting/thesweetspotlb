import { getCloudflareContext } from "@opennextjs/cloudflare";
import { after } from "next/server";
import { z } from "zod";
import { site } from "@/data/site";
import { browserName, crawlerReason, deviceType, osName } from "@/lib/tracking/classify";
import { isBrowserEvent, metaName } from "@/lib/tracking/events";
import { cleanUrl } from "@/lib/tracking/sanitize";
import { serviceClient } from "@/lib/supabase/service";
import { getSiteSettings } from "@/server/catalog";
import { metaCapiConfigured, sendMetaEvents } from "@/server/meta-capi";
import { STAFF_COOKIE } from "@/lib/staff-cookie";

// POST /api/e: one visitor event from the website (src/lib/tracking). The
// browser says what happened; the request says who: the IP address, user
// agent and Cloudflare's location, robots stamped, staff browsing marked
// internal. Saved with the secret key, then relayed to Meta's Conversions
// API when it has a Meta counterpart. Always answers 204: a visitor's page
// never waits on, or learns anything from, tracking.

const text = (max: number) => z.string().max(max).optional();
const tag = text(300);

const eventSchema = z.object({
  e: z.string().max(40),
  v: text(64),
  s: text(64),
  p: text(2000),
  l: text(2000),
  r: text(2000),
  t: z
    .object({
      utm_source: tag,
      utm_medium: tag,
      utm_campaign: tag,
      utm_term: tag,
      utm_content: tag,
      utm_id: tag,
      gclid: tag,
      fbclid: tag,
    })
    .optional(),
  fbp: text(120),
  fbc: text(500),
  lang: z.enum(["en", "ar"]).optional(),
  tz: text(64),
  i: text(64),
  o: z.uuid().optional(),
  val: z.number().int().min(0).max(10_000_000).optional(),
  m: text(120),
  x: z
    .record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean()]))
    .optional(),
});

const done = () => new Response(null, { status: 204 });

/** Only our own pages may send events. */
function fromOurSite(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return (
      host === new URL(site.url).hostname ||
      host.endsWith(`.${new URL(site.url).hostname}`) ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

/** Cloudflare's guess at the visitor's city (absent in development). */
function city() {
  try {
    const cf = getCloudflareContext().cf as { city?: string } | undefined;
    return cf?.city?.slice(0, 80) ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!fromOurSite(request)) return done();
  const raw = await request.text();
  if (raw.length > 8000) return done();
  let body: z.infer<typeof eventSchema>;
  try {
    body = eventSchema.parse(JSON.parse(raw));
  } catch {
    return done();
  }
  const event = body.e;
  if (!isBrowserEvent(event)) return done();

  const db = serviceClient();
  if (!db) return done();

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 500);
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const botReason = crawlerReason(userAgent, body.tz);
  // Staff (the admin sets this cookie) and development aren't real visits.
  const internal =
    request.headers.get("cookie")?.includes(`${STAFF_COOKIE}=`) === true ||
    process.env.NODE_ENV === "development";
  const tags = body.t ?? {};

  // Our record, unless it's switched off to save database space.
  const { tracking } = await getSiteSettings();
  let rowId: number | null = null;
  let orderId: string | null = null;
  if (body.o) {
    const { data } = await db.from("orders").select("id").eq("public_token", body.o).maybeSingle();
    orderId = data?.id ?? null;
  }
  // The purchase reaches Meta from the server when the order is placed.
  const relayable =
    !!body.m && metaName(event) !== "Purchase" && !botReason && !internal && metaCapiConfigured();

  if (tracking.first_party) {
    const { data, error } = await db
      .from("analytics_events")
      .insert({
        event_name: event,
        visitor_id: body.v,
        visit_id: body.s,
        locale: body.lang,
        path: body.p ? cleanUrl(body.p) : null,
        landing_page: body.l ? cleanUrl(body.l) : null,
        referrer: body.r ? cleanUrl(body.r, { stripTracking: false }) : null,
        utm_source: tags.utm_source?.slice(0, 120),
        utm_medium: tags.utm_medium?.slice(0, 120),
        utm_campaign: tags.utm_campaign?.slice(0, 200),
        utm_term: tags.utm_term?.slice(0, 200),
        utm_content: tags.utm_content?.slice(0, 200),
        utm_id: tags.utm_id?.slice(0, 120),
        gclid: tags.gclid?.slice(0, 200),
        fbclid: tags.fbclid,
        fbp: body.fbp,
        fbc: body.fbc,
        item_id: body.i,
        order_id: orderId,
        value_cents: body.val,
        device_type: deviceType(userAgent),
        browser: browserName(userAgent),
        os: osName(userAgent),
        country: request.headers.get("cf-ipcountry")?.slice(0, 2) ?? null,
        city: city(),
        client_ip: ip?.slice(0, 64),
        user_agent: userAgent || null,
        bot: botReason !== null,
        bot_reason: botReason,
        internal,
        meta_event_id: body.m,
        params: body.x ?? {},
      })
      .select("id")
      .single();
    if (error) console.warn("Recording an event failed", error.code);
    rowId = data?.id ?? null;
  }

  if (relayable) {
    const value = typeof body.x?.food_value === "number" ? body.x.food_value : body.val;
    after(async () => {
      const sent = await sendMetaEvents([
        {
          eventName: metaName(event)!,
          eventId: body.m!,
          eventSourceUrl: `${site.url}${body.p ? cleanUrl(body.p) : ""}`,
          customer: { externalIds: [body.v ?? null] },
          browser: { fbp: body.fbp, fbc: body.fbc, ip, userAgent },
          customData: {
            ...(value !== undefined ? { value: value / 100, currency: "USD" } : {}),
            ...(body.i ? { content_ids: [body.i], content_type: "product" } : {}),
          },
        },
      ]);
      if (sent && rowId !== null)
        await db
          .from("analytics_events")
          .update({ meta_relayed_at: new Date().toISOString() })
          .eq("id", rowId);
    });
  }
  return done();
}
