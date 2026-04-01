import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, Filter, RefreshCw } from 'lucide-react';
import api from '../api/client';
import PathCard from '../components/PathCard';
import type { PathSummary } from '../types';

const CATEGORIES = ['all', 'coding', 'cybersecurity', 'devops', 'frontend', 'ui'];
const DIFFICULTIES = ['all', 'fundamental', 'easy', 'medium', 'hard'];

export default function PathCatalog() {
  const [paths, setPaths] = useState<PathSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (difficulty !== 'all') params.set('difficulty', difficulty);

    api
      .get<PathSummary[]>(`/paths/?${params}`)
      .then((r) => {
        if (isMounted) setPaths(r.data);
      })
      .catch(() => {
        if (isMounted) {
          setPaths([]);
          setError('Unable to load learning paths right now. Please try again.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [category, difficulty, requestId]);

  const hasActiveFilters = category !== 'all' || difficulty !== 'all';
  const activeFiltersCount = Number(category !== 'all') + Number(difficulty !== 'all');
  const formatLabel = (value: string) => value.replace(/_/g, ' ');

  return (
    <div className="animate-fade-in space-y-8">
      <section className="glass p-8 md:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-accent/20 bg-red-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-red-accent/80">
              <BookOpen size={14} aria-hidden="true" />
              Learning paths
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Pick your next guided journey
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-zinc-400">
                Filter the curriculum by topic and challenge level to find the
                right next step for your LearnForge progression.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:w-[320px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                Results
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                {loading ? '—' : paths.length}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Paths matching your current filters
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                Active filters
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                {activeFiltersCount}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {hasActiveFilters ? 'Refining the catalog' : 'Showing the full catalog'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="glass space-y-6 p-6 md:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
              <Filter size={14} aria-hidden="true" />
              Filters
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Narrow the learning catalog without leaving the page.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setCategory('all');
                setDifficulty('all');
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
              Category
            </span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-all ${
                    category === c
                      ? 'border-red-accent/30 bg-red-accent/10 text-red-accent shadow-[0_0_20px_rgba(229,53,53,0.12)]'
                      : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {formatLabel(c)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
              Difficulty
            </span>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDifficulty(d)}
                  aria-pressed={difficulty === d}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-all ${
                    difficulty === d
                      ? 'border-red-accent/30 bg-red-accent/10 text-red-accent shadow-[0_0_20px_rgba(229,53,53,0.12)]'
                      : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {formatLabel(d)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
              Catalog
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              Available learning paths
            </h2>
          </div>
          {!loading && !error && paths.length > 0 && (
            <p className="text-sm text-zinc-400">
              Showing {paths.length} path{paths.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="glass animate-pulse space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-white/5" />
                  <div className="h-6 w-24 rounded-full bg-white/5" />
                </div>
                <div className="space-y-3">
                  <div className="h-5 w-2/3 rounded bg-white/10" />
                  <div className="h-4 w-full rounded bg-white/5" />
                  <div className="h-4 w-5/6 rounded bg-white/5" />
                </div>
                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="h-2 rounded-full bg-white/10" />
                  <div className="flex justify-between">
                    <div className="h-4 w-24 rounded bg-white/5" />
                    <div className="h-4 w-16 rounded bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="glass space-y-4 p-8 text-center">
            <AlertTriangle size={44} className="mx-auto text-red-accent" aria-hidden="true" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">
                Unable to load paths
              </h3>
              <p className="text-sm text-zinc-400">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setRequestId((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : paths.length === 0 ? (
          <div className="glass space-y-4 p-8 text-center">
            <BookOpen size={44} className="mx-auto text-zinc-700" aria-hidden="true" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">
                No paths match those filters
              </h3>
              <p className="text-sm text-zinc-400">
                Try broadening your category or difficulty selection to surface more options.
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setCategory('all');
                  setDifficulty('all');
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-red-accent/25 bg-red-accent/10 px-4 py-2 text-sm font-medium text-red-accent transition-all hover:bg-red-accent/20"
              >
                Clear filters
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {paths.map((p) => (
              <PathCard key={p.id} path={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
