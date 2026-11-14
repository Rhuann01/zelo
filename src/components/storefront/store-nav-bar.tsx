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
                    ? {
                        backgroundColor: "rgba(255, 255, 255, 0.92)",
                        color: "var(--t-accent)",
                        boxShadow:
                          "0 4px 14px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 1)",
                      }
                    : {
                        color: "#3A3A3C",
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
                      ...(isBrutal ? { border: "1.5px solid #000000" } : {}),
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
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(14px,env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
        {isLiquidGlass ? (
          <nav aria-label="Navegação da loja" className="zelo-sheet-up pointer-events-auto">
            <LiquidGlassSurface tone="light" className="rounded-[32px] p-1.5">
              {dockContent}
            </LiquidGlassSurface>
          </nav>
        ) : (
          <nav
            aria-label="Navegação da loja"
            className="zelo-sheet-up pointer-events-auto flex items-center rounded-full p-1.5 backdrop-blur-xl"
            style={{
              backgroundColor: "#111216",
              boxShadow: isBrutal
                ? "3px 3px 0px #000000"
                : "0 14px 36px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
              border: isBrutal
                ? "2px solid #000000"
                : "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            {dockContent}
          </nav>
        )}
      </div>
    );
  }

  return (
    <nav
      aria-label="Seções da loja"
      className="no-scrollbar w-full overflow-x-auto"
      style={{
        backgroundColor: "var(--t-surface)",
        borderTop: "1px solid var(--t-border)",
        borderBottom: "1px solid var(--t-border)",
      }}
    >
      <div className="flex min-w-max items-center gap-3.5 px-4">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChangeTab(key)}
              className="relative flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap py-2.5 text-xs sm:text-[13px] font-semibold transition-colors"
              style={{ color: active ? "var(--t-accent)" : "var(--t-muted)" }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
              {active && (
                <span
                  className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full"
                  style={{ backgroundColor: "var(--t-accent)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
