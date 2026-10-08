// Makes an existing sign-in the admin's owner: the first account, before the
// Team page exists for anyone to use. Create the user first in the Supabase
// dashboard (Authentication → Users → Add user, with a password, "Auto
// Confirm User" on), then run:
//
//   node --env-file=.env.local scripts/make-owner.mjs you@example.com "Your Name"
//
// After that, owners add everyone else from the admin's Team page.
import { createClient } from "@supabase/supabase-js";

const [email, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ").trim();
if (!email || !name) {
  console.error('Usage: node --env-file=.env.local scripts/make-owner.mjs <email> "<name>"');
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY (e.g. in .env.local).");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No sign-in for ${email}. Add the user in the Supabase dashboard first.`);
  process.exit(1);
}

const { error: upsertError } = await db
  .from("staff")
  .upsert({ user_id: user.id, display_name: name, role: "owner", is_active: true });
if (upsertError) throw upsertError;
console.log(`${email} is now an owner. Sign in at /admin.`);
