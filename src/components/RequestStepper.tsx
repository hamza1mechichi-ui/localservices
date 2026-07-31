const STEPS = ["OPEN", "IN_PROGRESS", "CLOSED"] as const;

export function RequestStepper({ status, labels }: { status: string; labels: [string, string, string] }) {
  const idx = STEPS.indexOf(status as (typeof STEPS)[number]);
  // Statut inconnu (ne devrait pas arriver) : n'affiche rien plutôt qu'un stepper cassé.
  if (idx === -1) return null;

  return (
    <ol className="flex items-center" aria-label="Progression de la demande">
      {STEPS.map((step, i) => (
        <li key={step} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                i < idx
                  ? "bg-neo-blue text-white"
                  : i === idx
                  ? "bg-neo-blue text-white ring-4 ring-neo-blue/10 dark:ring-blue-500/20"
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
              {labels[i]}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-2 mb-4 h-0.5 flex-1 rounded transition-colors ${
                i < idx ? "bg-neo-blue" : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
