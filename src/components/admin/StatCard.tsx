'use client';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'yellow' | 'red';
  locale?: string;
}

const colorClasses: Record<string, string> = {
  blue: "text-neo-blue",
  green: "text-green-600 dark:text-green-400",
  purple: "text-purple-600 dark:text-purple-400",
  orange: "text-orange-600 dark:text-orange-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  red: "text-red-600 dark:text-red-400",
};

export default function StatCard({ label, value, color, locale = 'en' }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-900/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neo-obsidian">
      <p className="text-start text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`text-2xl font-bold ${color ? colorClasses[color] : "text-zinc-900 dark:text-white"}`}>
        {typeof value === 'number'
          ? value.toLocaleString(locale)
          : value
        }
      </p>
    </div>
  );
}