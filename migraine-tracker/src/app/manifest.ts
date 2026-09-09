import type { MetadataRoute } from "next";

// Required, not decorative: with `output: "export"` a route handler must
// declare itself static or the build refuses to collect it. The manifest is a
// route handler, so it needs this even though it reads nothing at request time.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Migraine Tracker",
    short_name: "Migraine",
    description:
      "Log migraine symptoms alongside local pressure, weather, and air quality, and find your own patterns.",
    start_url: "/",
    display: "standalone",
    background_color: "#14110f",
    theme_color: "#14110f",
    orientation: "portrait",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
