export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-white/85 dark:bg-neutral-950/85 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900" />
          <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 tracking-wide">
          Loading…
        </div>
      </div>
    </div>
  );
}
