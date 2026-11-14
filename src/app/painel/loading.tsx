export default function PainelLoading() {
  return (
    <div className="min-h-screen bg-[var(--zelo-bg)] px-4 py-6">
      <div className="mx-auto max-w-[600px] space-y-4">
        <div className="h-12 w-full rounded-2xl bg-[var(--zelo-soft)] animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-2xl bg-[var(--zelo-soft)] animate-pulse" />
          <div className="h-24 rounded-2xl bg-[var(--zelo-soft)] animate-pulse" />
        </div>
        <div className="h-48 w-full rounded-2xl bg-[var(--zelo-soft)] animate-pulse" />
      </div>
    </div>
  );
}
