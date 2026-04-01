import { Link } from 'react-router-dom';
import ProgressBar from './ProgressBar';
import LanguageIcon from './LanguageIcon';
import type { PathSummary } from '../types';
import { ArrowRight, BookOpen, CheckCircle2, Clock3 } from 'lucide-react';

const LANG_COLORS: Record<string, string> = {
  python: '#3776ab',
  cpp: '#00599c',
  go: '#00add8',
  rust: '#ce422b',
  lua: '#000080',
  javascript: '#f7df1e',
  tailwind: '#06b6d4',
};

interface PathCardProps {
  path: PathSummary;
}

export default function PathCard({ path }: PathCardProps) {
  const color = LANG_COLORS[path.language_key ?? ''] ?? '#e53535';
  const completionPct =
    path.total_sections > 0
      ? Math.round((path.completed_sections / path.total_sections) * 100)
      : 0;
  const isCompleted =
    path.total_sections > 0 && path.completed_sections === path.total_sections;
  const isStarted = path.completed_sections > 0 && !isCompleted;
  const statusStyles = isCompleted
    ? 'border-green-accent/20 bg-green-accent/10 text-green-accent'
    : isStarted
    ? 'border-amber-accent/20 bg-amber-accent/10 text-amber-accent'
    : 'border-white/10 bg-white/[0.04] text-zinc-400';
  const ctaLabel = isCompleted
    ? 'Review path'
    : isStarted
    ? 'Continue path'
    : 'Start path';

  return (
    <Link
      to={`/paths/${path.slug}`}
      aria-label={`Open ${path.title} learning path`}
      className="glass-hover group flex h-full flex-col gap-5 p-6"
      style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl shadow-[0_0_30px_rgba(229,53,53,0.08)]">
            <LanguageIcon languageKey={path.language_key} fallback={path.icon} size={28} />
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                {path.category}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                {path.difficulty}
              </span>
              {path.language_key && (
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {path.language_key}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white transition-colors group-hover:text-red-accent">
                {path.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                {path.description}
              </p>
            </div>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${statusStyles}`}
        >
          {isCompleted ? (
            <CheckCircle2 size={12} aria-hidden="true" />
          ) : isStarted ? (
            <Clock3 size={12} aria-hidden="true" />
          ) : (
            <BookOpen size={12} aria-hidden="true" />
          )}
          {isCompleted ? 'Completed' : isStarted ? 'In progress' : 'Ready'}
        </span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-zinc-500">
          <span className="uppercase tracking-[0.2em]">Progress</span>
          <span className="font-mono text-zinc-300">{completionPct}% complete</span>
        </div>
        <ProgressBar
          value={path.completed_sections}
          max={path.total_sections}
          variant="green"
          size="sm"
          showLabel={false}
        />
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="text-zinc-400">
            {path.completed_sections} / {path.total_sections} sections finished
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-zinc-300 transition-colors group-hover:text-white">
            {ctaLabel}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
