import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal configuration: no incremental cache, no queue, no tag cache.
// The site is a portfolio - pages are either static or cheap to render - so the
// extra Cloudflare resources those features need (KV, D1, Durable Objects) would
// be cost and moving parts with nothing to show for them. Add them only when a
// route actually needs ISR.
export default defineCloudflareConfig();
