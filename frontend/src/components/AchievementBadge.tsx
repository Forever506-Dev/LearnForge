interface AchievementBadgeProps {
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
}

export default function AchievementBadge({
  icon,
  name,
  description,
  unlocked,
}: AchievementBadgeProps) {
  return (
    <article
      className={`glass flex h-full items-start gap-4 rounded-3xl p-5 transition-all ${
        unlocked
          ? 'border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.24)]'
          : 'opacity-60 grayscale'
      }`}
      aria-label={`${name} achievement ${unlocked ? 'unlocked' : 'locked'}`}
    >
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-2xl ${
          unlocked
            ? 'border-red-accent/20 bg-red-accent/10'
            : 'border-white/10 bg-white/[0.04]'
        }`}
        aria-hidden="true"
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white sm:text-base">{name}</h4>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              unlocked
                ? 'bg-green-500/10 text-green-accent'
                : 'bg-white/5 text-zinc-500'
            }`}
          >
            {unlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>
      </div>
    </article>
  );
}
