import { withContentCollections } from "@content-collections/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export: the whole site is prerenderable, so Cloudflare serves plain
  // files with no server runtime. Chosen over the OpenNext Workers adapter
  // because that adapter cannot build from a non-C: drive on Windows (Node's
  // ESM loader rejects an "a:" URL scheme). Security headers move to
  // public/_headers, since headers() is not supported under output: "export".
  output: "export",
  images: { unoptimized: true },
};

// withContentCollections must be the outermost plugin
export default withContentCollections(nextConfig);
