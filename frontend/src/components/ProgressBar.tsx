interface ProgressBarProps {
  value: number;
  max: number;
  variant?: 'red' | 'green' | 'amber';
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const FILL_STYLES = {
  red: {
    background: 'linear-gradient(90deg, #e53535, #ff6b6b)',
    boxShadow: '0 0 18px rgba(229, 53, 53, 0.24)',
  },
  green: {
    background: 'linear-gradient(90deg, #22c55e, #4ade80)',
    boxShadow: '0 0 18px rgba(34, 197, 94, 0.24)',
  },
  amber: {
    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
    boxShadow: '0 0 18px rgba(245, 158, 11, 0.24)',
  },
} as const;

export default function ProgressBar({
  value,
  max,
  variant = 'red',
  showLabel = true,
  size = 'md',
}: ProgressBarProps) {
  const safeMax = Math.max(max, 0);
  const safeValue = safeMax > 0 ? Math.min(Math.max(value, 0), safeMax) : 0;
  const pct = safeMax > 0 ? Math.min((safeValue / safeMax) * 100, 100) : 0;
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const fillStyle = FILL_STYLES[variant];
  const hasProgress = pct > 0;

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          <span>{safeMax > 0 ? `${safeValue} / ${safeMax}` : 'No progress yet'}</span>
          <span className="min-w-[3ch] text-right font-mono text-zinc-400">
            {Math.round(pct)}%
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={`Progress: ${Math.round(pct)}%`}
        aria-valuemin={0}
        aria-valuemax={safeMax || 100}
        aria-valuenow={safeValue}
        className={`${h} relative w-full overflow-hidden rounded-full border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015)),rgba(255,255,255,0.04)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)]`}
      >
        <div
          aria-hidden="true"
          className={`${h} rounded-full transition-all duration-700 ease-out`}
          style={{
            width: `${pct}%`,
            minWidth: hasProgress ? '0.35rem' : '0',
            ...fillStyle,
          }}
        />
      </div>
    </div>
  );
}
