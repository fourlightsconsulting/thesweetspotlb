import { defaultLocale } from "@/i18n/config";
import { serviceClient } from "@/lib/supabase/service";

// Short links: /l/<id> sends the visitor on to the tracking link saved under
// that id in the admin (Ad tools → Links), tags and all. QR codes carry these:
// short codes scan better, and a printed one keeps working. Unknown ids go to
// the home page.

export async function GET(request: Request, { params }: RouteContext<"/l/[id]">) {
  const { id } = await params;
  let target = new URL(`/${defaultLocale}`, request.url).toString();
  const db = serviceClient();
  if (db && /^[a-z0-9][a-z0-9-]{1,79}$/.test(id)) {
    const { data } = await db.from("tracking_links").select("url").eq("utm_id", id).maybeSingle();
    if (data?.url) target = data.url;
  }
  return new Response(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": "no-store" },
  });
}
