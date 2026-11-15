"use client";

import { useEffect } from "react";

const STORAGE_KEY = "zelo_dev_ping_ts";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias por navegador/aparelho

export function DeviceTelemetryPing() {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const now = Date.now();
      const prevRaw = localStorage.getItem(STORAGE_KEY);
      if (prevRaw) {
        const prev = Number(prevRaw);
        if (Number.isFinite(prev) && now - prev < TTL_MS) return;
      }
      localStorage.setItem(STORAGE_KEY, String(now));
      fetch("/api/telemetry/device", { method: "POST", keepalive: true }).catch(() => {});
    } catch {
      // silencioso
    }
  }, []);

  return null;
}
