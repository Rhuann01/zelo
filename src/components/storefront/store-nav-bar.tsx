"use client";

import { List, MapPin, Users } from "lucide-react";
import { LiquidGlassSurface } from "@/components/ui/liquid-glass-surface";

export type StoreTabKey = "servicos" | "equipe" | "detalhes";

interface StoreNavBarProps {
  tab: StoreTabKey;
  onChangeTab: (tab: StoreTabKey) => void;
  estiloBarra: "abas" | "dock_flutuante";
  hidden?: boolean;
  isBrutal?: boolean;
  isLiquidGlass?: boolean;
  isDark?: boolean;
}

const NAV_ITEMS: Array<{ key: StoreTabKey; label: string; shortLabel: string; icon: typeof List }> = [
  { key: "servicos", label: "Serviços", shortLabel: "Serviços", icon: List },
  { key: "equipe", label: "Equipe & Horários", shortLabel: "Equipe", icon: Users },
  { key: "detalhes", label: "Detalhes & Mapa", shortLabel: "Mapa", icon: MapPin },
];

export function StoreNavBar({
  tab,
  onChangeTab,
  estiloBarra,
  hidden = false,
  isBrutal = false,
  isLiquidGlass = false,
  isDark = false,
}: StoreNavBarProps) {
  if (estiloBarra === "dock_flutuante") {
    if (hidden) return null;

    const dockContent = (
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map(({ key, shortLabel, icon: Icon }) => {
          const active = tab === key;
          if (isLiquidGlass) {
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChangeTab(key)}
                aria-label={shortLabel}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-[26px] text-xs font-semibold transition-all duration-200 active:scale-95 ${
                  active ? "px-4" : "w-12 px-0"
                }`}
                style={
                  active
                    ? isDark
                      ? {
                          backgroundColor: "rgba(255, 255, 255, 0.16)",
                          color: "#FFFFFF",
                          boxShadow:
                            "0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
                        }
                      : {
                          backgroundColor: "rgba(255, 255, 255, 0.92)",
                          color: "var(--t-accent)",
                          boxShadow:
                            "0 4px 14px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 1)",
                        }
                    : {
                        color: isDark ? "#D1D5DB" : "#3A3A3C",
                      }
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {active && <span>{shortLabel}</span>}
              </button>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChangeTab(key)}
              aria-label={shortLabel}
              className={`flex min-h-[44px] items-center justify-center gap-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 ${
                active ? "px-4" : "w-11 px-0"
              }`}
              style={
                active
                  ? {
                      backgroundColor: "#FFFFFF",
                      color: "#111216",
                    }
                  : {
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      color: "rgba(255, 255, 255, 0.72)",
                    }
              }
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={
                  active
                    ? {
                        backgroundColor: "var(--t-accent)",
                        color: "var(--t-accent-ink)",
                      }
                    : undefined
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
              </span>
              {active && <span>{shortLabel}</span>}
            </button>
          );
        })}
      </div>
    );

    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(24px,calc(env(safe-area-inset-bottom)+12px))] z-40 flex justify-center px-4">
        {isLiquidGlass ? (
          <nav aria-label="Navegação da loja" className="zelo-sheet-up pointer-events-auto">
            <LiquidGlassSurface tone={isDark ? "dark" : "light"} className="rounded-[32px] p-1.5">
              {dockContent}
            </LiquidGlassSurface>
          </nav>
        ) : (
          <nav
            aria-label="Navegação da loja"
            className="zelo-sheet-up pointer-events-auto flex items-center rounded-full p-1.5 backdrop-blur-xl"
            style={{
              backgroundColor: "#111216",
              boxShadow:
                "0 14px 36px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            {dockContent}
          </nav>
        )}
      </div>
    );
  }

  if (hidden) return null;

  return (
    <nav
      aria-label="Seções da loja"
      className="fixed inset-x-0 bottom-0 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      style={{
        backgroundColor: "var(--t-surface)",
        borderTop: isBrutal ? "2px solid #000000" : "1px solid var(--t-border)",
        boxShadow: isBrutal ? "none" : "0 -4px 20px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div className="mx-auto grid h-16 max-w-[480px] grid-cols-3 items-center px-2">
        {NAV_ITEMS.map(({ key, shortLabel, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChangeTab(key)}
              aria-current={active ? "page" : undefined}
              className="relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition-colors active:scale-95"
              style={{ color: active ? "var(--t-accent)" : "var(--t-muted)" }}
            >
              {active && (
                <span
                  className="absolute top-0 h-0.5 w-8 rounded-full"
                  style={{ backgroundColor: "var(--t-accent)" }}
                />
              )}
              <Icon className="h-[20px] w-[20px] shrink-0" />
              <span className={`text-[11px] leading-tight ${active ? "font-bold" : "font-medium"}`}>
                {shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
