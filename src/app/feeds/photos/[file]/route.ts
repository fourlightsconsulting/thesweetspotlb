import { getCloudflareContext } from "@opennextjs/cloudflare";
import { publicClient } from "@/lib/supabase/service";
import { menu as builtInMenu } from "@/data/menu";
import { menuPhoto } from "@/server/menu";

// A menu photo as a JPEG, for the Meta catalog feed: the menu's photos are
// WebP, which Meta's catalog doesn't take. Converted by Cloudflare's image
// binding (the same one next/image uses); without it (development) the
// original is sent as it is.

const notFound = () => new Response("Not found", { status: 404 });

function bindings() {
  try {
    return getCloudflareContext().env;
  } catch {
    return undefined;
  }
}

/** The item's photo, if it's on the menu online and has one. */
async function photoOf(id: string) {
  const db = publicClient();
  if (!db) return builtInMenu.items.find((i) => i.id === id)?.image;
  const { data } = await db
    .from("products")
    .select("image_path")
    .eq("slug", id)
    .eq("orderable_online", true)
    .maybeSingle();
  return menuPhoto(data?.image_path ?? null);
}

export async function GET(request: Request, { params }: RouteContext<"/feeds/photos/[file]">) {
  const id = /^([a-z0-9-]{1,80})\.jpg$/.exec((await params).file)?.[1];
  if (!id) return notFound();
  const photo = await photoOf(id);
  if (!photo) return notFound();

  const env = bindings();
  const source = new URL(photo.src, request.url);
  // Bundled photos are the site's own files; uploads live in Supabase Storage.
  const original =
    photo.src.startsWith("/") && env?.ASSETS ? await env.ASSETS.fetch(source) : await fetch(source);
  if (!original.ok || !original.body) return new Response("Photo unavailable", { status: 502 });

  const headers = { "Cache-Control": "public, max-age=86400" };
  if (!env?.IMAGES)
    return new Response(original.body, {
      headers: { ...headers, "Content-Type": original.headers.get("Content-Type") ?? "image/webp" },
    });
  const jpeg = await env.IMAGES.input(original.body)
    .transform({ width: 1080, fit: "scale-down" })
    .output({ format: "image/jpeg", quality: 85 });
  return new Response(jpeg.image(), { headers: { ...headers, "Content-Type": "image/jpeg" } });
}
