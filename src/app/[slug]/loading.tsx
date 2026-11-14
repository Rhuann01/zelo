export default function LojaPublicaLoading() {
  return (
    <div className="min-h-screen bg-[var(--zelo-bg)] px-4 py-6">
      <div className="mx-auto max-w-[520px] space-y-4">
        <div className="h-44 w-full rounded-3xl bg-[var(--zelo-soft)] animate-pulse" />
        <div className="h-11 w-full rounded-2xl bg-[var(--zelo-soft)] animate-pulse" />
        <div className="space-y-3">
          <div className="h-20 w-full rounded-2xl bg-[var(--zelo-soft)] animate-pulse" />
          <div className="h-20 w-full rounded-2xl bg-[var(--zelo-soft)] animate-pulse" />
          <div className="h-20 w-full rounded-2xl bg-[var(--zelo-soft)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
