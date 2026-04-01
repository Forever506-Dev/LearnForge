import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Code2,
  Layers3,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../api/client';
import LanguageIcon from '../components/LanguageIcon';
import { useQuiz } from '../hooks/useQuiz';
import QuizCard from '../components/QuizCard';
import CodeEditor from '../components/CodeEditor';
import FeedbackOverlay from '../components/FeedbackOverlay';
import ProgressBar from '../components/ProgressBar';
import type { PathDetail, Section, CodeExecuteResponse } from '../types';
import { LANGUAGES } from '../types';

type SectionWithContext = Section & {
  moduleId: string;
  moduleTitle: string;
  moduleIndex: number;
  sectionIndexInModule: number;
};

export default function LearnView() {
  const { slug, sectionIndex } = useParams<{
    slug: string;
    sectionIndex: string;
  }>();
  const navigate = useNavigate();
  const [path, setPath] = useState<PathDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    api
      .get<PathDetail>(`/paths/${slug}`)
      .then((r) => {
        if (isMounted) {
          setPath(r.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Failed to load content. Please try again.');
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
  }, [slug]);

  const allSections = useMemo<SectionWithContext[]>(
    () =>
      path
        ? path.modules.flatMap((module, moduleIndex) =>
            module.sections.map((section, sectionIndexInModule) => ({
              ...section,
              moduleId: module.id,
              moduleTitle: module.title,
              moduleIndex,
              sectionIndexInModule,
            }))
          )
        : [],
    [path]
  );

  const quiz = useQuiz(allSections);
  const requestedIndex = Number.parseInt(sectionIndex ?? '0', 10);

  useEffect(() => {
    if (allSections.length === 0 || !slug) return;

    const normalizedIndex = Number.isFinite(requestedIndex) ? requestedIndex : 0;
    const boundedIndex = Math.min(
      Math.max(normalizedIndex, 0),
      allSections.length - 1
    );

    if (boundedIndex !== normalizedIndex) {
      navigate(`/learn/${slug}/${boundedIndex}`, { replace: true });
      return;
    }

    if (boundedIndex !== quiz.currentIndex) {
      quiz.goToSection(boundedIndex);
    }
  }, [
    requestedIndex,
    allSections.length,
    slug,
    navigate,
    quiz.currentIndex,
    quiz.goToSection,
  ]);

  if (loading) {
    return (
      <div className="animate-fade-in mx-auto max-w-6xl space-y-6">
        <div className="glass animate-pulse space-y-6 p-8 md:p-10">
          <div className="h-4 w-40 rounded bg-white/10" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="h-8 w-72 rounded bg-white/10" />
              <div className="h-4 w-full max-w-2xl rounded bg-white/5" />
              <div className="h-4 w-4/5 max-w-xl rounded bg-white/5" />
            </div>
            <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-[300px]">
              <div className="h-24 rounded-2xl border border-white/10 bg-black/20" />
              <div className="h-24 rounded-2xl border border-white/10 bg-black/20" />
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-white/10" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="glass animate-pulse space-y-4 p-6 md:p-7">
            <div className="h-5 w-40 rounded bg-white/10" />
            <div className="h-4 w-full rounded bg-white/5" />
            <div className="h-4 w-5/6 rounded bg-white/5" />
            <div className="h-48 rounded-2xl bg-black/20" />
          </div>
          <div className="glass animate-pulse space-y-3 p-5">
            <div className="h-5 w-32 rounded bg-white/10" />
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 rounded-2xl bg-white/[0.03]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in mx-auto max-w-3xl">
        <div className="glass space-y-4 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-accent/20 bg-red-accent/10 text-red-accent">
            <BookOpen size={24} aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Unable to open this lesson</h1>
            <p className="text-sm text-zinc-400">{error}</p>
          </div>
          <Link
            to="/paths"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Back to paths
          </Link>
        </div>
      </div>
    );
  }

  if (!path || allSections.length === 0) {
    return (
      <div className="animate-fade-in mx-auto max-w-3xl">
        <div className="glass space-y-4 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400">
            <Layers3 size={24} aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">No learning content found</h1>
            <p className="text-sm text-zinc-400">
              This path does not have any sections available yet.
            </p>
          </div>
          <Link
            to="/paths"
            className="inline-flex items-center gap-2 text-sm font-medium text-red-accent transition-colors hover:text-white"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Back to paths
          </Link>
        </div>
      </div>
    );
  }

  const section = quiz.currentSection;
  if (!section) return null;

  const langKey = path.language_key ?? 'python';
  const hasFeedback = quiz.feedback !== null;
  const completedSections = allSections.filter((item) => item.completed).length;
  const currentProgressValue = quiz.currentIndex + 1;
  const progressPct = Math.round((currentProgressValue / quiz.totalSections) * 100);
  const currentSectionContext = allSections[quiz.currentIndex] ?? null;
  const currentModule = path.modules.find((module) =>
    module.sections.some((item) => item.id === section.id)
  );
  const currentModuleIndex = currentModule
    ? path.modules.findIndex((module) => module.id === currentModule.id)
    : -1;
  const contentLabel =
    section.content_type === 'coding_challenge'
      ? 'Coding challenge'
      : section.content_type === 'quiz'
        ? 'Knowledge check'
        : 'Lesson';
  const introCopy =
    section.content_type === 'coding_challenge'
      ? 'Read the challenge brief, then run your solution against the included checks.'
      : section.content_type === 'quiz'
        ? 'Choose the best answer and submit to receive immediate coaching feedback.'
        : 'Work through the lesson content and use the navigator to stay oriented in the path.';
  const renderMarkdown = (content: string) => (
    <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-zinc-300 prose-li:text-zinc-300 prose-strong:text-white prose-a:text-red-accent prose-code:text-amber-accent prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/40">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );

  const goNav = (newIdx: number) => {
    navigate(`/learn/${slug}/${newIdx}`, { replace: true });
  };

  const handleCodeExecute = async (code: string): Promise<CodeExecuteResponse> => {
    const lang = LANGUAGES[langKey];
    return quiz.submitCode({
      language: lang?.pistonId ?? langKey,
      version: lang?.pistonVersion ?? '*',
      code,
      section_id: section.id,
    });
  };

  return (
    <div className="animate-fade-in mx-auto max-w-6xl space-y-6">
      <section className="glass overflow-hidden p-8 md:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Link
              to={`/paths/${slug}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Back to {path.title}
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full border border-red-accent/20 bg-red-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-red-accent/80">
              <Sparkles size={14} aria-hidden="true" />
              Learning session
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {contentLabel}
                </span>
                {currentModule && (
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Module {currentModuleIndex + 1}
                  </span>
                )}
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Step {currentProgressValue}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                {section.title}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-zinc-400">
                {introCopy}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:w-[320px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                Progress
              </p>
              <p className="mt-2 text-3xl font-bold text-white">{progressPct}%</p>
              <p className="mt-1 text-sm text-zinc-400">
                Step {currentProgressValue} of {quiz.totalSections}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                Completed
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                {completedSections}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Finished sections in this path
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
                Path progress
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {currentModule
                  ? `${currentModule.title} is your current focus.`
                  : 'Keep moving through the guided curriculum.'}
              </p>
            </div>
            <p className="text-sm text-zinc-400">
              {completedSections} completed · {quiz.totalSections - completedSections} remaining
            </p>
          </div>
          <ProgressBar
            value={currentProgressValue}
            max={quiz.totalSections}
            variant="red"
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <section className="glass p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
                  Current section
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {section.title}
                </h2>
                {currentSectionContext && (
                  <p className="mt-2 text-sm text-zinc-400">
                    {currentSectionContext.moduleTitle} · Section {currentProgressValue}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                {contentLabel}
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {section.content_type === 'quiz' && (
                <>
                  <QuizCard
                    section={section}
                    selectedAnswer={quiz.selectedAnswer}
                    onSelect={quiz.selectAnswer}
                    onSubmit={quiz.submitQuizAnswer}
                    isSubmitting={quiz.isSubmitting}
                    disabled={hasFeedback}
                  />
                  {quiz.feedback && (
                    <FeedbackOverlay
                      feedback={quiz.feedback}
                      onNext={() => {
                        if (quiz.currentIndex < quiz.totalSections - 1) {
                          goNav(quiz.currentIndex + 1);
                        } else {
                          navigate(`/paths/${slug}`);
                        }
                      }}
                    />
                  )}
                </>
              )}

              {section.content_type === 'coding_challenge' && (
                <>
                  {section.body_markdown && (
                    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-green-accent/20 bg-green-accent/10 text-green-accent">
                          <Code2 size={18} aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                            Challenge brief
                          </p>
                          <p className="mt-1 text-sm text-zinc-400">
                            Review the instructions and run your code when ready.
                          </p>
                        </div>
                      </div>
                      {renderMarkdown(section.body_markdown)}
                    </div>
                  )}
                  <CodeEditor
                    languageKey={langKey}
                    sectionId={section.id}
                    onExecute={handleCodeExecute}
                    isSubmitting={quiz.isSubmitting}
                    output={quiz.codeOutput}
                  />
                </>
              )}

              {section.content_type === 'lesson' && (
                <div className="space-y-5">
                  {section.body_markdown && (
                    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300">
                          <BookOpen size={18} aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                            Lesson notes
                          </p>
                          <p className="mt-1 text-sm text-zinc-400">
                            Read through the material before moving to the next step.
                          </p>
                        </div>
                      </div>
                      {renderMarkdown(section.body_markdown)}
                    </div>
                  )}
                  {section.code_snippet && (
                    <div className="rounded-3xl border border-white/10 bg-black/30 p-5 md:p-6">
                      <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                        Reference snippet
                      </p>
                      <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-zinc-200">
                        <code>{section.code_snippet}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="glass p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
                  Navigation
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  Move through the path one section at a time, or finish to return to the overview.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => goNav(quiz.currentIndex - 1)}
                  disabled={quiz.currentIndex === 0}
                  className="btn-ghost flex items-center gap-2 disabled:opacity-30"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (quiz.currentIndex < quiz.totalSections - 1) {
                      goNav(quiz.currentIndex + 1);
                    } else {
                      navigate(`/paths/${slug}`);
                    }
                  }}
                  className="btn-red flex items-center gap-2"
                >
                  {quiz.currentIndex < quiz.totalSections - 1 ? 'Next section' : 'Finish path'}
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="glass p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl">
                <LanguageIcon languageKey={path.language_key} fallback={path.icon} size={24} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                  Path
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">{path.title}</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {path.description}
                </p>
              </div>
            </div>
          </section>

          <section className="glass p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-accent/20 bg-red-accent/10 text-red-accent">
                <ListChecks size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                  Section navigator
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Jump to any section in this path.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {allSections.map((item, index) => {
                const isActive = index === quiz.currentIndex;

                return (
                  <Link
                    key={item.id}
                    to={`/learn/${slug}/${index}`}
                    className={`flex items-start gap-3 rounded-2xl border p-3 transition-all ${
                      isActive
                        ? 'border-red-accent/25 bg-red-accent/10'
                        : item.completed
                          ? 'border-green-accent/15 bg-green-accent/[0.05] hover:border-green-accent/25'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-xs font-semibold text-zinc-300">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-medium ${
                          isActive ? 'text-white' : 'text-zinc-200'
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                        {item.moduleTitle} · {item.content_type.replace('_', ' ')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
