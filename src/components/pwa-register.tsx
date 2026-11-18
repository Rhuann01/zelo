"use client";

import { useEffect } from "react";

/**
 * Registers the Zelo service worker (/sw.js) on mount.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures (e.g., private browsing or unsupported origin) are non-fatal.
    });
  }, []);

  return null;
}
