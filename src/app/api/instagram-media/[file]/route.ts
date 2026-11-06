import { getCloudflareContext } from "@opennextjs/cloudflare";
import { instagramMediaPath, instagramPosts } from "@/data/social";

declare global {
  interface CloudflareEnv {
    INSTAGRAM_MEDIA?: CloudflareEnv["NEXT_INC_CACHE_R2_BUCKET"];
  }
}

const featuredFiles = new Set(
  instagramPosts.flatMap(({ media }) => (media.video ? [media.image, media.video] : [media.image])),
);

async function serve(request: Request, { params }: RouteContext<"/api/instagram-media/[file]">) {
  const { file } = await params;
  if (!featuredFiles.has(`${instagramMediaPath}${file}`))
    return new Response(null, { status: 404 });

  const {
    env: { INSTAGRAM_MEDIA: bucket },
  } = await getCloudflareContext({ async: true });
  if (!bucket) return new Response(null, { status: 503 });

  // Video players use single byte ranges for playback and seeking.
  const range = /^bytes=(?:(\d+)-(\d*)|-(\d+))$/i.exec(request.headers.get("Range") ?? "");
  if (request.method === "HEAD" || range) {
    const metadata = await bucket.head(file);
    if (!metadata) return new Response(null, { status: 404 });
    if (request.method === "HEAD" || !range)
      return new Response(null, { headers: mediaHeaders(metadata, metadata.size) });

    const size = metadata.size;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[3]));
    const end = range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
    if (start > end)
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });

    const length = end - start + 1;
    const object = await bucket.get(file, { range: { offset: start, length } });
    if (!object) return new Response(null, { status: 404 });
    const headers = mediaHeaders(object, length);
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    return new Response(object.body, { status: 206, headers });
  }

  const object = await bucket.get(file);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, { headers: mediaHeaders(object, object.size) });
}

function mediaHeaders(
  object: { writeHttpMetadata(headers: Headers): void; httpEtag: string },
  length: number,
) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Length", String(length));
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

export { serve as GET, serve as HEAD };
