import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { publishableKey, supabaseUrl } from "@/lib/supabase/env";
import { STAFF_COOKIE, staffCookieDomain } from "@/lib/staff-cookie";

// Keeps the admin's Supabase session fresh: an expired access token is
// refreshed here, where the new cookies can be written to the response
// (server components can't write cookies). Runs for admin pages only, on the
// edge runtime, which OpenNext supports on Cloudflare. Next 16 prefers
// proxy.ts, but that runs on Node, which OpenNext marks experimental.
// Access itself is enforced by the admin layout and row level security;
// this only sends signed-out visitors to the sign-in page early. Signed-in
// staff also get the tss_staff cookie across the domain, so their own
// browsing of the website is marked internal (src/server/tracking.ts).

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseUrl || !publishableKey) return response;

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signingIn = request.nextUrl.pathname.startsWith("/admin/login");
  if (!data?.claims && !signingIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    if (request.nextUrl.pathname !== "/admin")
      url.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }
  if (data?.claims && !request.cookies.has(STAFF_COOKIE)) {
    response.cookies.set(STAFF_COOKIE, "1", {
      domain: staffCookieDomain(request.headers.get("host")),
      path: "/",
      maxAge: 400 * 24 * 60 * 60,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }
  return response;
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
