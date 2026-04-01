import type { Section } from '../types';

interface QuizCardProps {
  section: Section;
  selectedAnswer: string | null;
  onSelect: (key: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  disabled: boolean;
}

export default function QuizCard({
  section,
  selectedAnswer,
  onSelect,
  onSubmit,
  isSubmitting,
  disabled,
}: QuizCardProps) {
  const choices = section.choices ?? {};
  const choiceEntries = Object.entries(choices);

  return (
    <div className="glass animate-slide-up space-y-6 p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-red-accent/80">
            Knowledge check
          </p>
          {section.body_markdown && (
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-300 md:text-base">
              {section.body_markdown}
            </p>
          )}
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
          {choiceEntries.length} option{choiceEntries.length === 1 ? '' : 's'}
        </span>
      </div>

      {section.code_snippet && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
            Reference snippet
          </p>
          <pre className="overflow-x-auto text-sm text-zinc-200">
            <code>{section.code_snippet}</code>
          </pre>
        </div>
      )}

      <div className="space-y-3" role="list" aria-label="Answer choices">
        {choiceEntries.map(([key, text]) => {
          const selected = selectedAnswer === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelect(key)}
              disabled={disabled}
              aria-pressed={selected}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
                selected
                  ? 'border-red-accent/40 bg-red-accent/10 text-white shadow-[0_0_20px_rgba(229,53,53,0.1)]'
                  : 'border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/20 hover:bg-white/5'
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  selected
                    ? 'border-red-accent text-red-accent'
                    : 'border-zinc-600 text-zinc-500'
                }`}
              >
                {key}
              </span>
              <span className="pt-0.5">{text}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">
          Choose the best answer, then submit to reveal coaching feedback.
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!selectedAnswer || isSubmitting || disabled}
          className="btn-red shrink-0"
        >
          {isSubmitting ? 'Checking…' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
}
