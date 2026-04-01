import { CheckCircle, XCircle, Trophy, Flame, Star } from 'lucide-react';
import type { SubmitAnswerResponse } from '../types';

interface FeedbackOverlayProps {
  feedback: SubmitAnswerResponse;
  onNext: () => void;
}

export default function FeedbackOverlay({
  feedback,
  onNext,
}: FeedbackOverlayProps) {
  return (
    <div className="mt-6 animate-fade-in" aria-live="assertive">
      <div
        className={`glass border-l-4 p-6 md:p-7 ${
          feedback.correct
            ? 'border-l-green-accent'
            : 'border-l-red-accent'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {feedback.correct ? (
                <CheckCircle className="text-green-accent" size={28} />
              ) : (
                <XCircle className="text-red-accent" size={28} />
              )}
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
                  Quiz feedback
                </p>
                <h3 className="text-lg font-bold">
                  {feedback.correct ? 'Correct!' : 'Not quite…'}
                </h3>
              </div>
            </div>

            {feedback.explanation && (
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-300">
                {feedback.explanation}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
              Total XP
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {feedback.new_xp_total}
            </p>
          </div>
        </div>

        {!feedback.correct && feedback.correct_answer && (
          <div className="mt-5 rounded-2xl border border-red-accent/20 bg-red-accent/5 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-red-accent/80">
              Correct answer
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-100">
              {feedback.correct_answer}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {feedback.xp_earned > 0 && (
            <span className="xp-badge">
              <Star size={12} />+{feedback.xp_earned} XP
            </span>
          )}
          {feedback.streak > 0 && (
            <span className="streak-badge">
              <Flame size={12} />
              {feedback.streak}-day streak
            </span>
          )}
          {feedback.achievements_unlocked.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full border border-amber-accent/20 bg-amber-accent/15 px-2.5 py-0.5 text-xs font-semibold text-amber-accent"
            >
              <Trophy size={12} />
              {name}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">
            Keep moving to build streaks, bank XP, and unlock more guided practice.
          </p>
          <button type="button" onClick={onNext} className="btn-red text-sm">
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
