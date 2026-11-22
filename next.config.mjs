import { execSync } from "node:child_process";
import { withContentCollections } from "@content-collections/next";

const commit = execSync("git rev-parse --short HEAD", { windowsHide: true }).toString().trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Static export: the whole site is prerenderable, so Cloudflare serves plain
  // files with no server runtime. Chosen over the OpenNext Workers adapter
  // because that adapter cannot build from a non-C: drive on Windows (Node's
  // ESM loader rejects an "a:" URL scheme). Security headers move to
  // public/_headers, since headers() is not supported under output: "export".
  output: "export",
  images: { unoptimized: true },
  // Every route becomes a directory with an index.html, and that is a fix rather
  // than a preference.
  //
  // Without it the exporter writes a route that has children as BOTH a file and a
  // directory - out/resume.html beside out/resume/, which Next creates for its
  // segment-prefetch payloads. Cloudflare Assets resolves the directory, finds no
  // index inside it, and returns 404 for a page that was uploaded successfully and
  // is sitting right there. /demos hit this first and /resume hit it again; asking
  // the Worker to retry the explicit .html only papered over the first one.
  //
  // With trailing slashes there is no file-versus-directory ambiguity left to
  // resolve: out/resume/index.html is the only candidate.
  trailingSlash: true,
  // D04: a tab open across a deploy asks for chunks under its own id; src/lib/stale-build.ts reloads once.
  deploymentId: commit,
  // Public ingest key (project 660260, shared with Inkpot; events are told apart by $host).
  env: {
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "phc_zUP2XGwJoLmbcUdNksepW2jHV6rxDcxouqvaS8P6kHQh", // gitleaks:allow (public ingest key)
    NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
  },
};

// withContentCollections must be the outermost plugin
export default withContentCollections(nextConfig);
