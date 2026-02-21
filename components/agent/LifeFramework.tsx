'use client';

interface FrameworkBand {
  ageStart: number;
  ageEnd: number;
  location: string;
  keyEvents: string[];
}

interface FrameworkHistory {
  version: number;
  changedAt: string;
  reason: string;
  attractedToAgent: string;
}

interface Props {
  framework: FrameworkBand[];
  history?: FrameworkHistory[];
}

const COLORS = [
  'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700',
  'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700',
  'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
  'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700',
  'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700',
  'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700',
];

export default function LifeFramework({ framework, history }: Props) {
  const maxAge = 30;

  return (
    <div>
      {/* Visual age bar */}
      <div className="flex h-8 rounded-xl overflow-hidden mb-4 gap-0.5">
        {framework.map((band, i) => {
          const width = ((band.ageEnd - band.ageStart) / maxAge) * 100;
          return (
            <div
              key={i}
              style={{ width: `${width}%` }}
              className="relative group cursor-default flex items-center justify-center text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/50 transition-colors"
              title={`Age ${band.ageStart}–${band.ageEnd}: ${band.location}`}
            >
              {band.ageEnd - band.ageStart >= 4 && `${band.ageStart}–${band.ageEnd}`}
            </div>
          );
        })}
      </div>

      {/* Band details */}
      <div className="space-y-3">
        {framework.map((band, i) => (
          <div
            key={i}
            className={`border rounded-xl p-4 ${COLORS[i % COLORS.length]}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Age {band.ageStart}–{band.ageEnd}
                </span>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{band.location}</p>
              </div>
            </div>
            <ul className="space-y-1">
              {band.keyEvents.map((event, j) => (
                <li key={j} className="text-xs text-gray-600 dark:text-gray-300 flex gap-1.5">
                  <span className="text-gray-400 dark:text-gray-500 shrink-0">·</span>
                  {event}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Framework change history */}
      {history && history.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Framework Changes
          </h4>
          <div className="space-y-2">
            {history.map((entry, i) => (
              <div key={i} className="border border-amber-200 dark:border-amber-800 rounded-xl p-3 bg-amber-50 dark:bg-amber-900/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">v{entry.version}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(entry.changedAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-gray-400">attracted to</span>
                  <a
                    href={`/agent/${entry.attractedToAgent}`}
                    className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    @{entry.attractedToAgent}
                  </a>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 italic">{entry.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
