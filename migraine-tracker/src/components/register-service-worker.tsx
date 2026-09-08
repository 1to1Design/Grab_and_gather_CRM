"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so the app can be installed to a phone's home
 * screen and opened without a connection. Everything except the weather pull
 * works offline, which matters when someone is logging symptoms in a dark room
 * with the phone on airplane mode.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is a bonus; the app is fully usable without it.
    });
  }, []);

  return null;
}
