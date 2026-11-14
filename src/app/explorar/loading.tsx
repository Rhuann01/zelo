export default function ExplorarLoading() {
  return (
    <div className="min-h-screen bg-[var(--zelo-bg)] px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="h-12 w-full rounded-2xl bg-[var(--zelo-soft)] animate-pulse" />
        <div className="h-44 w-full rounded-3xl bg-[var(--zelo-soft)] animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-52 rounded-2xl bg-[var(--zelo-soft)] animate-pulse" />
          <div className="h-52 rounded-2xl bg-[var(--zelo-soft)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
