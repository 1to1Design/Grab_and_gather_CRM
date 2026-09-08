"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * Applies the comfort-mode dimming to <body>. It lives on the body rather
 * than a wrapper div so the filter covers fixed elements like the nav bar too.
 */
export function ComfortMode() {
  const { settings } = useStore();

  useEffect(() => {
    document.body.dataset.comfort = settings.comfortMode ? "on" : "off";
  }, [settings.comfortMode]);

  return null;
}
