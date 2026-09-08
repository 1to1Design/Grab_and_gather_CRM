import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Everything in this app runs in the browser and stores data on-device, so
  // it ships as plain static files. That means it can be hosted for free on
  // Vercel, Netlify, GitHub Pages, or any web server, with no database, no
  // server, and no account to sign up for.
  output: "export",
  images: { unoptimized: true },
  // This app lives in a subdirectory of a repository that contains another
  // Next.js app. Pinning the root stops the bundler from walking up to the
  // parent lockfile and pulling that app's files into this build.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
};

export default nextConfig;
