import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Nav } from "@/components/nav";
import { ComfortMode } from "@/components/comfort-mode";
import { RegisterServiceWorker } from "@/components/register-service-worker";

export const metadata: Metadata = {
  title: "Migraine Tracker",
  description:
    "Track migraine symptoms alongside local weather, pressure, and air quality — and find your own patterns.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  appleWebApp: { capable: true, title: "Migraine", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#14110f",
  width: "device-width",
  initialScale: 1,
  // Zoom stays enabled: someone with blurred vision from an aura needs it.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <ComfortMode />
          <RegisterServiceWorker />
          <main className="mx-auto w-full max-w-2xl px-4 pt-5">{children}</main>
          <Nav />
        </StoreProvider>
      </body>
    </html>
  );
}
