"use client";

import { useEffect } from "react";

export function DeviceTelemetryPing() {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (sessionStorage.getItem("zelo_dev_ping")) return;
      sessionStorage.setItem("zelo_dev_ping", "1");
      fetch("/api/telemetry/device", { method: "POST", keepalive: true }).catch(() => {});
    } catch {
      // silencioso
    }
  }, []);

  return null;
}
