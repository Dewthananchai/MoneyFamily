"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("📱 PWA Service Worker Registered with scope:", registration.scope);
        })
        .catch((error) => {
          console.warn("⚠️ PWA Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}

