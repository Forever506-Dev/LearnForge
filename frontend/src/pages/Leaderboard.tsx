import { useEffect, useMemo, useState } from 'react';
import { Flame, Medal, Sparkles, Star, Trophy, Users } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { LeaderboardEntry } from '../types';

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<LeaderboardEntry[]>('/leaderboard/')
      .then((r) => setEntries(r.data))
      .finally(() => setLoading(false));
  }, []);

  const medalIcons = ['🥇', '🥈', '🥉'];
  const myEntry = useMemo(
    () => entries.find((entry) => user && entry.user_id === user.id),
    [entries, user]
  );
  const topScore = entries[0]?.xp_total ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      <section className="glass overflow-hidden">
        <div className="border-b border-white/10 bg-white/[0.02] px-8 py-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-red-accent/20 bg-red-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-accent">
            <Sparkles size={14} aria-hidden="true" />
            Community standings
          </span>
        </div>

        <div className="space-y-8 p-8">
          <div className="space-y-3">
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <Trophy className="text-amber-accent" size={28} aria-hidden="true" />
              Leaderboard
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Compare progress with other learners, keep an eye on your current rank, and push for
              the next milestone in the LearnForge community.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-accent/10 text-red-accent">
                <Users size={18} aria-hidden="true" />
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ranked learners</p>
              <p className="mt-2 font-mono text-2xl font-bold text-white">{entries.length}</p>
              <p className="mt-1 text-sm text-zinc-400">Visible on the current board</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-accent/10 text-amber-accent">
                <Medal size={18} aria-hidden="true" />
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Your position</p>
              <p className="mt-2 font-mono text-2xl font-bold text-white">
                {loading ? '…' : myEntry ? `#${myEntry.rank}` : '—'}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {myEntry ? 'Highlighted in the list below' : 'Sign in and climb the board'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-zinc-200">
                <Star size={18} aria-hidden="true" />
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Top XP</p>
              <p className="mt-2 font-mono text-2xl font-bold text-white">
                {loading ? '…' : topScore.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-zinc-400">Current benchmark to beat</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Rankings</h2>
            <p className="text-sm text-zinc-400">Top learners are ordered by total XP.</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="glass rounded-3xl p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-2xl bg-white/10" />
                  <div className="h-12 w-12 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-1/3 rounded bg-white/10" />
                    <div className="h-3 w-1/4 rounded bg-white/5" />
                  </div>
                  <div className="h-7 w-20 rounded-full bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="glass rounded-3xl px-8 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-3xl">
              🏆
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">Leaderboard coming soon</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              No learners have been ranked yet. Once activity starts rolling in, standings will
              appear here automatically.
            </p>
          </div>
        ) : (
          <ol className="space-y-3" aria-label="Leaderboard rankings">
            {entries.map((entry) => {
              const isMe = user && user.id === entry.user_id;
              const isTopThree = entry.rank <= 3;

              return (
                <li
                  key={entry.rank}
                  className={`glass rounded-3xl p-5 transition-all ${
                    isMe ? 'ring-1 ring-red-accent/30 shadow-[0_0_0_1px_rgba(229,53,53,0.12)]' : ''
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-center ${
                          isTopThree
                            ? 'border-amber-accent/20 bg-amber-accent/10 text-xl'
                            : 'border-white/10 bg-white/[0.03] text-sm font-mono text-zinc-400'
                        }`}
                        aria-label={`Rank ${entry.rank}`}
                      >
                        {isTopThree ? medalIcons[entry.rank - 1] : `#${entry.rank}`}
                      </div>

                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg">
                        {entry.avatar_url ? (
                          <img
                            src={entry.avatar_url}
                            alt={`${entry.display_name} avatar`}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          '👤'
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-base font-semibold ${isMe ? 'text-red-accent' : 'text-white'}`}>
                        {entry.display_name}
                        {isMe && <span className="ml-2 text-xs text-zinc-400">(you)</span>}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {entry.current_streak > 0 && (
                          <span className="streak-badge">
                            <Flame size={12} aria-hidden="true" />
                            {entry.current_streak}d streak
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-zinc-300">
                          <Trophy size={12} aria-hidden="true" />
                          {entry.achievement_count} achievements
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-start sm:justify-end">
                      <span className="xp-badge">
                        <Star size={12} aria-hidden="true" />
                        {entry.xp_total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
