export function ZeloLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box =
    size === "sm" ? "h-6 w-6 rounded-md text-xs" : size === "lg" ? "h-8 w-8 rounded-lg text-base" : "h-7 w-7 rounded-lg text-sm";
  const dot =
    size === "sm" ? "h-1.5 w-1.5 top-0.5 right-0.5" : size === "lg" ? "h-2 w-2 top-1 right-1" : "h-1.5 w-1.5 top-1 right-1";
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg";

  return (
    <span className="inline-flex items-center gap-2 select-none">
      <span
        className={`relative inline-flex items-center justify-center bg-[var(--zelo-btn-bg)] text-[var(--zelo-btn-ink)] font-bold shadow-xs shrink-0 ${box}`}
        aria-hidden="true"
      >
        Z
        <span className={`absolute rounded-full bg-[#F59E0B] ${dot}`} />
      </span>
      <span className={`font-bold tight-heading text-[var(--zelo-ink)] ${text}`}>Zelo</span>
    </span>
  );
}
