// Where Supabase is and which keys we have. The URL and publishable key are
// public (NEXT_PUBLIC_*, inlined at build time); the secret key exists only
// on the server.

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
export const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Public URL of a file in a storage bucket. */
export const storageUrl = (bucket: string, path: string) =>
  `${supabaseUrl}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
