import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  Layers3,
  Play,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';
import LanguageIcon from '../components/LanguageIcon';
import ProgressBar from '../components/ProgressBar';
import type { PathDetail as PathDetailType, Section } from '../types';

const LANG_COLORS: Record<string, string> = {
  python: '#3776ab',
  cpp: '#00599c',
  go: '#00add8',
  rust: '#ce422b',
  lua: '#000080',
  javascript: '#f7df1e',
  tailwind: '#06b6d4',
};

export default function PathDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [path, setPath] = useState<PathDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const modules = path?.modules ?? [];
  const allSections: Section[] = useMemo(
    () => modules.flatMap((module) => module.sections),
    [modules]
  );
  const moduleStartIndexes = useMemo(() => {
    let runningIndex = 0;
    return modules.map((module) => {
      const start = runningIndex;
      runningIndex += module.sections.length;
      return start;
    });
  }, [modules]);
  const totalSections = allSections.length;
  const completedSections = allSections.filter((section) => section.completed).length;
  const totalModules = modules.length;
  const completionPct =
    totalSections > 0
      ? Math.round((completedSections / totalSections) * 100)
      : 0;
  const nextSectionIndex = allSections.findIndex((section) => !section.completed);
  const launchSectionIndex = nextSectionIndex >= 0 ? nextSectionIndex : 0;
  const hasStarted = completedSections > 0;
  const isCompleted = totalSections > 0 && completedSections === totalSections;
  const primaryCtaLabel = isCompleted
    ? 'Review path'
    : hasStarted
      ? 'Continue path'
      : 'Start path';
  const formatLabel = (value: string) => value.replace(/_/g, ' ');

  useEffect(() => {
    if (!slug) {
      navigate('/paths', { replace: true });
      return;
    }

    let isMounted = true;
    setLoading(true);

    api
      .get<PathDetailType>(`/paths/${slug}`)
      .then((r) => {
        if (isMounted) {
          setPath(r.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          navigate('/paths', { replace: true });
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="animate-fade-in mx-auto max-w-5xl space-y-6">
        <div className="glass animate-pulse space-y-6 p-8 md:p-10">
          <div className="h-4 w-32 rounded bg-white/10" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="h-8 w-64 rounded bg-white/10" />
              <div className="h-4 w-full max-w-2xl rounded bg-white/5" />
              <div className="h-4 w-5/6 max-w-xl rounded bg-white/5" />
            </div>
            <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-[320px]">
              <div className="h-28 rounded-2xl border border-white/10 bg-black/20" />
              <div className="h-28 rounded-2xl border border-white/10 bg-black/20" />
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="h-2.5 rounded-full bg-white/10" />
            <div className="flex justify-between gap-3">
              <div className="h-4 w-32 rounded bg-white/5" />
              <div className="h-4 w-20 rounded bg-white/5" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="glass animate-pulse space-y-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="h-5 w-48 rounded bg-white/10" />
                <div className="h-4 w-20 rounded bg-white/5" />
              </div>
              <div className="h-4 w-3/4 rounded bg-white/5" />
              <div className="space-y-2">
                <div className="h-12 rounded-2xl bg-white/[0.03]" />
                <div className="h-12 rounded-2xl bg-white/[0.03]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!path) return null;

  const color = LANG_COLORS[path.language_key ?? ''] ?? '#e53535';

  return (
    <div className="animate-fade-in mx-auto max-w-5xl space-y-8">
      <Link
        to="/paths"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to catalog
      </Link>

      <div
        className="glass overflow-hidden p-8 md:p-10"
        style={{ borderLeftColor: color, borderLeftWidth: '4px' }}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-accent/20 bg-red-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-red-accent/80">
              <Sparkles size={14} aria-hidden="true" />
              Path overview
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-3xl shadow-[0_0_30px_rgba(229,53,53,0.08)]">
                <LanguageIcon languageKey={path.language_key} fallback={path.icon} size={38} />
              </div>
              <div className="space-y-3">
                <div>
                  <h1 className="text-3xl font-bold text-white md:text-4xl">
                    {path.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
                    {path.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-400 capitalize">
                    {path.category}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-400 capitalize">
                    {path.difficulty}
                  </span>
                  {path.language_key && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {path.language_key}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:w-[320px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                Sections
              </p>
              <p className="mt-2 text-3xl font-bold text-white">{totalSections}</p>
              <p className="mt-1 text-sm text-zinc-400">
                Spanning {totalModules} module{totalModules === 1 ? '' : 's'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                Complete
              </p>
              <p className="mt-2 text-3xl font-bold text-white">{completionPct}%</p>
              <p className="mt-1 text-sm text-zinc-400">
                {completedSections} of {totalSections} sections finished
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
                Progress snapshot
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {isCompleted
                  ? 'Everything in this path is unlocked and ready for review.'
                  : hasStarted
                    ? 'You are actively progressing through this guided journey.'
                    : 'Kick off the first module and start banking XP.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={`/learn/${path.slug}/${launchSectionIndex}`}
                className="btn-red inline-flex items-center gap-2"
              >
                <Play size={16} aria-hidden="true" />
                {primaryCtaLabel}
              </Link>
              <Link
                to="/paths"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                Browse more paths
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <ProgressBar value={completedSections} max={totalSections} variant="green" />
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
              Curriculum map
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              Modules and sections
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Jump into any lesson, review completed material, or continue the next recommended step.
            </p>
          </div>
          <p className="text-sm text-zinc-400">
            {completedSections} / {totalSections} section{totalSections === 1 ? '' : 's'} completed
          </p>
        </div>

        <div className="space-y-4">
          {path.modules.map((module, moduleIndex) => {
            const moduleCompleted = module.sections.filter((section) => section.completed).length;
            const moduleTotal = module.sections.length;
            const startIndex = moduleStartIndexes[moduleIndex] ?? 0;

            return (
              <div key={module.id} className="glass overflow-hidden p-6 md:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300">
                        <Layers3 size={18} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                          Module {moduleIndex + 1}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold text-white">
                          {module.title}
                        </h3>
                      </div>
                    </div>

                    {module.description && (
                      <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
                        {module.description}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 lg:min-w-[240px]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                        Module progress
                      </span>
                      <span className="text-sm font-medium text-zinc-300">
                        {moduleCompleted}/{moduleTotal}
                      </span>
                    </div>
                    <ProgressBar
                      value={moduleCompleted}
                      max={moduleTotal}
                      variant="green"
                      size="sm"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {module.sections.map((section, sectionIndex) => {
                    const globalIndex = startIndex + sectionIndex;
                    const isCurrentRecommendation =
                      globalIndex === launchSectionIndex && !isCompleted;

                    return (
                      <Link
                        key={section.id}
                        to={`/learn/${path.slug}/${globalIndex}`}
                        className={`group flex flex-col gap-4 rounded-2xl border p-4 transition-all md:flex-row md:items-center md:justify-between ${
                          section.completed
                            ? 'border-green-accent/15 bg-green-accent/[0.05]'
                            : isCurrentRecommendation
                              ? 'border-red-accent/25 bg-red-accent/[0.06] shadow-[0_0_24px_rgba(229,53,53,0.08)]'
                              : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20">
                            {section.completed ? (
                              <CheckCircle2
                                size={16}
                                className="text-green-accent"
                                aria-hidden="true"
                              />
                            ) : (
                              <Circle
                                size={16}
                                className="text-zinc-600"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                                Section {globalIndex + 1}
                              </span>
                              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                                {formatLabel(section.content_type)}
                              </span>
                              {isCurrentRecommendation && (
                                <span className="rounded-full border border-red-accent/20 bg-red-accent/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-red-accent">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <div>
                              <p
                                className={`text-sm font-medium transition-colors ${
                                  section.completed
                                    ? 'text-zinc-200'
                                    : 'text-white group-hover:text-red-accent'
                                }`}
                              >
                                {section.title}
                              </p>
                              <p className="mt-1 text-sm text-zinc-500">
                                {section.completed
                                  ? 'Completed and ready to review.'
                                  : 'Open this section to keep progressing through the path.'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition-colors group-hover:text-white">
                          {section.completed ? 'Review' : 'Open'}
                          <ChevronRight
                            size={16}
                            className="transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
