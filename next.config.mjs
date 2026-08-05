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
};

// withContentCollections must be the outermost plugin
export default withContentCollections(nextConfig);
