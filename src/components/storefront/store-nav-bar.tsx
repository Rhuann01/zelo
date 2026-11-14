"use client";

import { List, MapPin, Users } from "lucide-react";

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

    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
        <nav
          aria-label="Navegação da loja"
          className={`zelo-sheet-up pointer-events-auto flex items-center gap-1 rounded-full p-1.5 backdrop-blur-xl ${
            isLiquidGlass ? "store-glass-surface" : ""
          }`}
          style={{
            backgroundColor: "color-mix(in srgb, var(--t-surface) 88%, #0A0A0D 12%)",
            boxShadow: isBrutal
              ? "3px 3px 0px #000000"
              : "0 12px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
            border: isBrutal ? "2px solid #000000" : "1px solid var(--t-border)",
          }}
        >
          {NAV_ITEMS.map(({ key, shortLabel, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChangeTab(key)}
                className="flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-all duration-200 active:scale-95"
                style={
                  active
                    ? {
                        backgroundColor: "var(--t-accent)",
                        color: "var(--t-accent-ink)",
                        ...(isBrutal ? { border: "1.5px solid #000000" } : {}),
                      }
                    : {
                        color: "var(--t-muted)",
                      }
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <nav
      aria-label="Seções da loja"
      className={`no-scrollbar w-full overflow-x-auto ${isLiquidGlass ? "store-glass-surface" : ""}`}
      style={{
        backgroundColor: "var(--t-surface)",
        borderTop: "1px solid var(--t-border)",
        borderBottom: "1px solid var(--t-border)",
      }}
    >
      <div className="flex min-w-max items-center gap-4 px-4">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChangeTab(key)}
              className="relative flex min-h-[46px] shrink-0 items-center gap-1.5 whitespace-nowrap py-3 text-[13px] font-semibold transition-colors"
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
