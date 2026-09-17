"use client";

import { useEffect } from "react";

/** Registers the service worker that powers install + Web Push. */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration is best-effort; the app works without it.
    });
  }, []);
  return null;
}
