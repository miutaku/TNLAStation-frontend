"use client";

import { useEffect } from "react";
import { withBasePath } from "@/lib/base-path";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register(withBasePath("/sw.js"), { scope: withBasePath("/") });
  }, []);

  return null;
}
