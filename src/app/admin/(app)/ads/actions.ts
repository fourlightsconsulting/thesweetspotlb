"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slug, tagValue, taggedUrl } from "@/lib/ad-tools/links";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";

// Saving tracking links and the ad registry (creatives and audiences).

type Result = { error: string | null };

const linkInput = z.object({
  label: z.string().trim().max(120),
  destination: z.url({ protocol: /^https?$/ }).max(500),
  source: z.string().max(60),
  medium: z.string().max(40),
  campaign: z.string().max(100),
  content: z.string().max(100),
  term: z.string().max(100),
  id: z.string().max(80),
});

export async function createLink(input: z.input<typeof linkInput>): Promise<Result> {
  await requireStaff("manager");
  const parsed = linkInput.safeParse(input);
  if (!parsed.success) return { error: "Check the page address: it must be a full web address." };
  const v = parsed.data;
  const tags = {
    source: slug(v.source, 60),
    medium: slug(v.medium, 40),
    campaign: tagValue(v.campaign),
    content: tagValue(v.content),
    term: tagValue(v.term),
    id: slug(v.id, 80),
  };
  if (!tags.source || !tags.medium || !tags.campaign || tags.id.length < 2)
    return { error: "Give it a source, a medium and a campaign." };
  const url = taggedUrl(v.destination, tags);
  if (!url || url.length > 1000) return { error: "That page address doesn’t work." };

  const db = await adminClient();
  const { error } = await db.from("tracking_links").insert({
    utm_id: tags.id,
    label: v.label,
    destination: v.destination,
    url,
    utm_source: tags.source,
    utm_medium: tags.medium,
    utm_campaign: tags.campaign,
    utm_content: tags.content,
    utm_term: tags.term,
  });
  if (error)
    return {
      error:
        error.code === "23505"
          ? `There’s already a link called “${tags.id}”. Change its id and save again.`
          : "That didn’t save. Try again.",
    };
  revalidatePath("/admin/ads");
  return { error: null };
}

export async function setLinkArchived(id: string, archived: boolean): Promise<Result> {
  await requireStaff("manager");
  const db = await adminClient();
  const { error } = await db
    .from("tracking_links")
    .update({ archived })
    .eq("id", z.uuid().parse(id));
  if (error) return { error: "That didn’t save. Try again." };
  revalidatePath("/admin/ads");
  return { error: null };
}

const registryInput = z.object({
  kind: z.enum(["creative", "audience"]),
  code: z.string().regex(/^[a-z0-9][a-z0-9-]{1,99}$/),
  name: z.string().trim().max(200),
  note: z.string().trim().max(500),
  details: z.record(
    z.string(),
    z.union([z.string().max(200), z.number(), z.array(z.string().max(20))]),
  ),
});

export async function addToRegistry(input: z.input<typeof registryInput>): Promise<Result> {
  await requireStaff("manager");
  const parsed = registryInput.safeParse(input);
  if (!parsed.success) return { error: "Fill in every part of the name first." };
  const db = await adminClient();
  const { error } = await db.from("ad_registry").insert(parsed.data);
  if (error)
    return {
      error:
        error.code === "23505"
          ? `“${parsed.data.code}” is already saved. Use the next number.`
          : "That didn’t save. Try again.",
    };
  revalidatePath("/admin/ads");
  return { error: null };
}

export async function setRegistryArchived(id: string, archived: boolean): Promise<Result> {
  await requireStaff("manager");
  const db = await adminClient();
  const { error } = await db.from("ad_registry").update({ archived }).eq("id", z.uuid().parse(id));
  if (error) return { error: "That didn’t save. Try again." };
  revalidatePath("/admin/ads");
  return { error: null };
}
