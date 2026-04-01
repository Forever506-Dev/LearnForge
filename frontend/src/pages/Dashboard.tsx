import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Flame,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import PathCard from '../components/PathCard';
import ProgressBar from '../components/ProgressBar';
import type { PathSummary } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<PathSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<PathSummary[]>('/paths/')
      .then((r) => setPaths(r.data))
      .catch(() => setError('Failed to load learning paths. Please refresh the page.'))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const inProgress = paths.filter(
    (p) => p.completed_sections > 0 && p.completed_sections < p.total_sections
  );
  const totalSections = paths.reduce((a, p) => a + p.total_sections, 0);
  const completedSections = paths.reduce((a, p) => a + p.completed_sections, 0);
  const completedPaths = paths.filter(
    (p) => p.total_sections > 0 && p.completed_sections === p.total_sections
  ).length;
  const completionPct =
    totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
  const featuredPath = inProgress[0] ?? paths[0] ?? null;

  return (
    <div className="animate-fade-in space-y-8">
      <section className="glass overflow-hidden p-8 md:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-accent/20 bg-red-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-red-accent/80">
              <Sparkles size={14} aria-hidden="true" />
              Learning dashboard
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Welcome back, {user.display_name} 👋
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-zinc-400">
                Keep your LearnForge momentum alive with clearer progress insight,
                polished study queues, and a direct route back into your next win.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={featuredPath && inProgress.length > 0 ? `/paths/${featuredPath.slug}` : '/paths'}
                className="btn-red inline-flex items-center gap-2"
              >
                {inProgress.length > 0 ? 'Continue learning' : 'Explore paths'}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                to="/paths"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                Browse all paths
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:w-[360px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-accent/20 bg-red-accent/10 text-red-accent">
                  <Star size={20} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono text-white">{user.xp_total}</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                    Total XP
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-accent/20 bg-amber-accent/10 text-amber-accent">
                  <Flame size={20} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono text-white">{user.current_streak}</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                    Day streak
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-green-accent/20 bg-green-accent/10 text-green-accent">
                  <BookOpen size={20} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono text-white">{completedSections}</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                    Sections done
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300">
                  <Target size={20} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono text-white">{completedPaths}</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                    Paths completed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {totalSections > 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
                  Overall progress
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {completionPct}% of your active curriculum is complete
                </p>
              </div>
              <p className="text-sm text-zinc-400">
                {completedSections} of {totalSections} sections finished
              </p>
            </div>
            <ProgressBar value={completedSections} max={totalSections} variant="red" />
          </div>
        )}
      </section>

      {error && (
        <div
          className="glass flex items-start gap-3 border border-red-accent/20 p-4 text-red-accent"
          role="alert"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-white">Unable to load learning paths</p>
            <p className="mt-1 text-sm text-red-accent">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && inProgress.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-red-accent/80">
                Continue learning
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">
                Pick up where you left off
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                You have {inProgress.length} active path
                {inProgress.length === 1 ? '' : 's'} ready for the next section.
              </p>
            </div>
            <Link
              to="/paths"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              View your catalog
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {inProgress.slice(0, 3).map((p) => (
              <PathCard key={p.id} path={p} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
              Discover
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              Explore learning paths
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Curated journeys built to keep practice sessions focused and rewarding.
            </p>
          </div>
          <Link
            to="/paths"
            className="inline-flex items-center gap-2 text-sm font-medium text-red-accent transition-colors hover:text-white"
          >
            View all
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass animate-pulse space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-white/5" />
                  <div className="h-6 w-24 rounded-full bg-white/5" />
                </div>
                <div className="space-y-3">
                  <div className="h-5 w-2/3 rounded bg-white/10" />
                  <div className="h-4 w-full rounded bg-white/5" />
                  <div className="h-4 w-4/5 rounded bg-white/5" />
                </div>
                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="h-2 rounded-full bg-white/10" />
                  <div className="flex justify-between">
                    <div className="h-4 w-28 rounded bg-white/5" />
                    <div className="h-4 w-16 rounded bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !error && paths.length === 0 ? (
          <div className="glass space-y-4 py-14 text-center">
            <BookOpen size={48} className="mx-auto text-zinc-700" aria-hidden="true" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">
                No learning paths available yet
              </h3>
              <p className="text-sm text-zinc-500">
                Fresh curricula will appear here once the catalog is populated.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {paths.slice(0, 6).map((p) => (
              <PathCard key={p.id} path={p} />
            ))}
          </div>
        )}
        {loading && (
          <div className="sr-only" aria-live="polite">
            Loading learning paths.
          </div>
        )}
      </section>
    </div>
  );
}
