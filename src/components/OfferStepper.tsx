const STEPS = ["PENDING", "ACCEPTED", "COMPLETED"] as const;

export function OfferStepper({ status, labels }: { status: string; labels: [string, string, string, string] }) {
  const [pendingLabel, acceptedLabel, completedLabel, rejectedLabel] = labels;

  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
        <span className="size-1.5 rounded-full bg-red-500" />
        {rejectedLabel}
      </span>
    );
  }

  const idx = STEPS.indexOf(status as (typeof STEPS)[number]);
  if (idx === -1) return null;
  const stepLabels = [pendingLabel, acceptedLabel, completedLabel];

  return (
    <ol className="flex items-center" aria-label="Progression de l'offre">
      {STEPS.map((step, i) => (
        <li key={step} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                i < idx
                  ? "bg-green-600 text-white"
                  : i === idx
                  ? "bg-green-600 text-white ring-4 ring-green-100 dark:ring-green-500/20"
                  : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
              }`}
            >
              {i < idx ? "✓" : i + 1}
            </div>
            <span
              className={`whitespace-nowrap text-[11px] ${
                i <= idx ? "font-medium text-zinc-700 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {stepLabels[i]}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-2 mb-4 h-0.5 flex-1 rounded transition-colors ${
                i < idx ? "bg-green-600" : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
