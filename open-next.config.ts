import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

// Pages are prerendered from Supabase data (menu, hours, settings) and kept in
// R2. When the admin saves, it revalidates a tag (recorded in D1) and the
// pages that used it regenerate; time-based refreshes go through the memory
// queue (it calls this Worker via WORKER_SELF_REFERENCE). Deploying creates
// the D1 table and uploads the prerendered pages.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: memoryQueue,
  enableCacheInterception: true,
});
