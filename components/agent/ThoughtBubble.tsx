'use client';

interface Interaction {
  withAgentName: string;
  description: string;
  isAttraction: boolean;
}

interface Props {
  text: string;
  interactions?: Interaction[];
}

export default function ThoughtBubble({ text, interactions }: Props) {
  return (
    <div className="relative mt-3">
      {/* Bubble tail */}
      <div className="absolute -top-2 left-6 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 rotate-45 rounded-tl-sm" />
      <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
          &ldquo;{text}&rdquo;
        </p>
        {interactions && interactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {interactions.map((interaction, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                  interaction.isAttraction
                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {interaction.isAttraction ? '✨' : '👁'}{' '}
                <a
                  href={`/agent/${interaction.withAgentName}`}
                  className="hover:underline"
                >
                  @{interaction.withAgentName}
                </a>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
