"use client";

import { useEffect } from "react";

// Registers the service worker that makes the site installable. Only in production:
// in development a cached worker would hide code changes.
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
