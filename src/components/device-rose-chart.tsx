"use client";

import { useMemo, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";

export interface DispositivoItem {
  chave: string;
  acessos: number;
}

type OsGroup = "iPhone" | "Android" | "Windows" | "macOS" | "Linux" | "Outros";

interface PetalGroup {
  label: OsGroup;
  acessos: number;
  isDesktop: boolean;
}

interface PillDetail {
  label: string;
  acessos: number;
  isDesktop: boolean;
  group: OsGroup;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = degToRad(deg);
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/**
 * Gera um anel completo (360°) usando fill-rule="evenodd" para quando há apenas 1 grupo.
 */
function fullRingPath(cx: number, cy: number, rInner: number, rOuter: number): string {
  return [
    `M ${cx} ${cy - rOuter}`,
    `A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy + rOuter}`,
    `A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy - rOuter}`,
    `M ${cx} ${cy - rInner}`,
    `A ${rInner} ${rInner} 0 1 0 ${cx} ${cy + rInner}`,
    `A ${rInner} ${rInner} 0 1 0 ${cx} ${cy - rInner}`,
    "Z",
  ].join(" ");
}

/**
 * Gera um setor anelar SVG com cantos arredondados (estilo Nightingale Rose / pétala).
 */
function roundedPetalPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number,
  cornerRadius = 10
): string {
  const span = endDeg - startDeg;
  const cr = Math.min(
    cornerRadius,
    (rOuter - rInner) * 0.38,
    (span * Math.PI * rInner) / 360
  );
  const aInner = (cr / Math.max(rInner, 1)) * (180 / Math.PI);
  const aOuter = (cr / Math.max(rOuter, 1)) * (180 / Math.PI);

  const [i1x, i1y] = polar(cx, cy, rInner, startDeg + aInner);
  const [i2x, i2y] = polar(cx, cy, rInner, endDeg - aInner);

  const [r1StartX, r1StartY] = polar(cx, cy, rInner + cr, startDeg);
  const [r1EndX, r1EndY] = polar(cx, cy, rOuter - cr, startDeg);

  const [o1x, o1y] = polar(cx, cy, rOuter, startDeg + aOuter);
  const [o2x, o2y] = polar(cx, cy, rOuter, endDeg - aOuter);

  const [r2StartX, r2StartY] = polar(cx, cy, rOuter - cr, endDeg);
  const [r2EndX, r2EndY] = polar(cx, cy, rInner + cr, endDeg);

  const [c1x, c1y] = polar(cx, cy, rInner, startDeg);
  const [c2x, c2y] = polar(cx, cy, rOuter, startDeg);
  const [c3x, c3y] = polar(cx, cy, rOuter, endDeg);
  const [c4x, c4y] = polar(cx, cy, rInner, endDeg);

  const largeArc = span > 180 ? 1 : 0;

  return [
    `M ${r1StartX.toFixed(2)} ${r1StartY.toFixed(2)}`,
    `L ${r1EndX.toFixed(2)} ${r1EndY.toFixed(2)}`,
    `Q ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${o1x.toFixed(2)} ${o1y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${o2x.toFixed(2)} ${o2y.toFixed(2)}`,
    `Q ${c3x.toFixed(2)} ${c3y.toFixed(2)} ${r2StartX.toFixed(2)} ${r2StartY.toFixed(2)}`,
    `L ${r2EndX.toFixed(2)} ${r2EndY.toFixed(2)}`,
    `Q ${c4x.toFixed(2)} ${c4y.toFixed(2)} ${i2x.toFixed(2)} ${i2y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${i1x.toFixed(2)} ${i1y.toFixed(2)}`,
    `Q ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${r1StartX.toFixed(2)} ${r1StartY.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function classifyDevice(chave: string): PillDetail {
  const lower = chave.toLowerCase();
  const isDesktop = lower.includes("(desktop)") || lower.includes("desktop");

  let group: OsGroup = "Outros";
  if (lower.includes("ios") || lower.includes("iphone") || lower.includes("ipad")) {
    group = "iPhone";
  } else if (lower.includes("android")) {
    group = "Android";
  } else if (lower.includes("windows")) {
    group = "Windows";
  } else if (lower.includes("macos") || lower.includes("mac os")) {
    group = "macOS";
  } else if (lower.includes("linux")) {
    group = "Linux";
  }

  const label = chave
    .replace(/\s*\((mobile|desktop)\)\s*/gi, "")
    .replace("•", "·")
    .trim();

  return {
    label: label || group,
    acessos: 0,
    isDesktop,
    group,
  };
}

export function DeviceRoseChart({
  items,
  darkMode,
}: {
  items: DispositivoItem[];
  darkMode: boolean;
}) {
  const [hoveredGroup, setHoveredGroup] = useState<OsGroup | null>(null);
  const [hoveredPill, setHoveredPill] = useState<string | null>(null);

  const { petals, pills, totalAcessos, maxGroupAcessos } = useMemo(() => {
    const groupMap = new Map<OsGroup, PetalGroup>();
    const pillList: PillDetail[] = [];

    for (const item of items) {
      const info = classifyDevice(item.chave);
      pillList.push({
        ...info,
        acessos: item.acessos,
      });

      const existing = groupMap.get(info.group);
      if (existing) {
        existing.acessos += item.acessos;
      } else {
        groupMap.set(info.group, {
          label: info.group,
          acessos: item.acessos,
          isDesktop: info.group === "Windows" || info.group === "macOS" || info.group === "Linux",
        });
      }
    }

    const sortedPetals = Array.from(groupMap.values()).sort(
      (a, b) => b.acessos - a.acessos
    );
    const sortedPills = pillList.sort((a, b) => b.acessos - a.acessos);
    const total = sortedPetals.reduce((acc, g) => acc + g.acessos, 0);
    const maxGrp = Math.max(1, ...sortedPetals.map((g) => g.acessos));

    return {
      petals: sortedPetals,
      pills: sortedPills,
      totalAcessos: total,
      maxGroupAcessos: maxGrp,
    };
  }, [items]);

  const count = petals.length;
  const cx = 160;
  const cy = 160;
  const rInner = 34;
  const rOuter = 152;
  const padDeg = count === 2 ? 4.5 : 3.4;
  const sliceDeg = 360 / Math.max(1, count);

  const activePetal = hoveredGroup
    ? petals.find((p) => p.label === hoveredGroup) ?? null
    : null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-2">
      <div className="relative w-full max-w-[360px] aspect-square">
        <svg
          viewBox="0 0 320 320"
          className="h-full w-full select-none overflow-visible"
          role="img"
          aria-label="Distribuição radial de dispositivos por sistema operacional"
        >
          <defs>
            <linearGradient id="zeloPetalGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.96" />
              <stop offset="100%" stopColor="#FF8E53" stopOpacity="0.86" />
            </linearGradient>
            <linearGradient id="zeloPetalGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#111216" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#FF5A1F" stopOpacity="0.88" />
            </linearGradient>
          </defs>

          {count === 1 ? (
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredGroup(petals[0].label)}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              <path
                d={fullRingPath(cx, cy, rInner, rOuter)}
                fillRule="evenodd"
                fill={
                  darkMode
                    ? "rgba(255, 255, 255, 0.06)"
                    : "rgba(17, 18, 22, 0.055)"
                }
              />
              <path
                d={fullRingPath(cx, cy, rInner, rOuter)}
                fillRule="evenodd"
                fill={
                  hoveredGroup === petals[0].label
                    ? "#FF5A1F"
                    : darkMode
                      ? "url(#zeloPetalGradDark)"
                      : "url(#zeloPetalGradLight)"
                }
                className="transition-all duration-200"
              />
              <g className="pointer-events-none">
                <text
                  x={cx}
                  y={cy - (rInner + rOuter) / 2 - 7}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="font-mono-num text-[22px] font-extrabold"
                  fill="#FFFFFF"
                >
                  {petals[0].acessos}
                </text>
                <text
                  x={cx}
                  y={cy - (rInner + rOuter) / 2 + 13}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[12px] font-semibold"
                  fill="rgba(255, 255, 255, 0.92)"
                >
                  {petals[0].label}
                </text>
              </g>
            </g>
          ) : (
            petals.map((item, idx) => {
              const startDeg = -90 + idx * sliceDeg + padDeg / 2;
              const endDeg = -90 + (idx + 1) * sliceDeg - padDeg / 2;
              const midDeg = (startDeg + endDeg) / 2;

              const bgPath = roundedPetalPath(cx, cy, rInner, rOuter, startDeg, endDeg, 10);

              const ratio = 0.34 + 0.66 * (item.acessos / maxGroupAcessos);
              const valRadius = rInner + (rOuter - rInner) * ratio;
              const valPath = roundedPetalPath(
                cx,
                cy,
                rInner,
                valRadius,
                startDeg,
                endDeg,
                10
              );

              const isHovered = hoveredGroup === item.label;
              const labelRadius = Math.max(
                rInner + 42,
                Math.min(rOuter - 26, (rInner + valRadius) / 2 + 6)
              );
              const [lx, ly] = polar(cx, cy, labelRadius, midDeg);

              return (
                <g
                  key={item.label}
                  className="cursor-pointer transition-transform duration-200"
                  onMouseEnter={() => setHoveredGroup(item.label)}
                  onMouseLeave={() => setHoveredGroup(null)}
                >
                  <path
                    d={bgPath}
                    fill={
                      darkMode
                        ? "rgba(255, 255, 255, 0.06)"
                        : "rgba(17, 18, 22, 0.055)"
                    }
                  />
                  <path
                    d={valPath}
                    fill={
                      isHovered
                        ? "#FF5A1F"
                        : darkMode
                          ? "url(#zeloPetalGradDark)"
                          : "url(#zeloPetalGradLight)"
                    }
                    opacity={hoveredGroup !== null && !isHovered ? 0.52 : 1}
                    className="transition-all duration-200"
                  />
                  <g className="pointer-events-none">
                    <text
                      x={lx}
                      y={ly - 6}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="font-mono-num text-[17px] font-extrabold"
                      fill="#FFFFFF"
                    >
                      {item.acessos}
                    </text>
                    <text
                      x={lx}
                      y={ly + 11}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[11px] font-semibold"
                      fill="rgba(255, 255, 255, 0.92)"
                    >
                      {item.label}
                    </text>
                  </g>
                </g>
              );
            })
          )}

          {/* Centro com total de sessões ou detalhe da pétala em hover */}
          <circle
            cx={cx}
            cy={cy}
            r={rInner - 4}
            fill={darkMode ? "#16181F" : "#FFFFFF"}
          />
          <text
            x={cx}
            y={cy - 5}
            textAnchor="middle"
            dominantBaseline="central"
            className="font-mono-num text-base font-extrabold"
            fill={darkMode ? "#F4F3F0" : "#111216"}
          >
            {activePetal ? activePetal.acessos : totalAcessos}
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-[8px] font-semibold uppercase tracking-wider"
            fill={darkMode ? "#9CA3AF" : "#6B6963"}
          >
            {activePetal ? activePetal.label : "total"}
          </text>
        </svg>
      </div>

      {/* Pílulas detalhadas abaixo do gráfico (sem juntar) */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
        {pills.map((p) => {
          const pct = totalAcessos > 0 ? Math.round((p.acessos / totalAcessos) * 100) : 0;
          const active = hoveredPill === p.label || (hoveredPill === null && hoveredGroup === p.group);
          return (
            <button
              key={p.label}
              type="button"
              onMouseEnter={() => {
                setHoveredPill(p.label);
                setHoveredGroup(p.group);
              }}
              onMouseLeave={() => {
                setHoveredPill(null);
                setHoveredGroup(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                active
                  ? "bg-[#FF5A1F] text-white"
                  : darkMode
                    ? "bg-white/[0.06] text-[#F4F3F0] hover:bg-white/10"
                    : "bg-black/[0.045] text-[#1C1B1B] hover:bg-black/8"
              }`}
            >
              {p.isDesktop ? (
                <Monitor className="h-3 w-3 shrink-0" />
              ) : (
                <Smartphone className="h-3 w-3 shrink-0" />
              )}
              <span>{p.label}</span>
              <span className="font-mono-num opacity-75">{pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
