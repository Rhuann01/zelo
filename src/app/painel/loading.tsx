export default function PainelLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Carregando painel">
      {/* Resumo / Cabeçalho da aba */}
      <div className="rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-36 rounded-lg bg-[var(--zelo-soft)]" />
            <div className="h-3 w-48 rounded-lg bg-[var(--zelo-soft)]" />
          </div>
          <div className="h-9 w-24 rounded-xl bg-[var(--zelo-soft)]" />
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-2">
          <div className="h-3 w-16 rounded-md bg-[var(--zelo-soft)]" />
          <div className="h-6 w-24 rounded-lg bg-[var(--zelo-soft)]" />
        </div>
        <div className="h-24 rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-2">
          <div className="h-3 w-20 rounded-md bg-[var(--zelo-soft)]" />
          <div className="h-6 w-20 rounded-lg bg-[var(--zelo-soft)]" />
        </div>
      </div>

      {/* Lista de itens */}
      <div className="rounded-2xl bg-[var(--zelo-card)] p-4 shadow-sm space-y-3">
        <div className="h-4 w-32 rounded-lg bg-[var(--zelo-soft)]" />
        <div className="h-14 w-full rounded-xl bg-[var(--zelo-soft)]" />
        <div className="h-14 w-full rounded-xl bg-[var(--zelo-soft)]" />
        <div className="h-14 w-full rounded-xl bg-[var(--zelo-soft)]" />
      </div>
    </div>
  );
}
