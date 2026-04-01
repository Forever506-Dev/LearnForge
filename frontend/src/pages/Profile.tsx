import { useEffect, useState } from 'react';
import { Calendar, Flame, Mail, Star, Trophy, UserCircle2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import AchievementBadge from '../components/AchievementBadge';
import type { Achievement } from '../types';

export default function Profile() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  useEffect(() => {
    api
      .get<Achievement[]>('/profile/achievements')
      .then((r) => setAchievements(r.data))
      .catch(() => {})
      .finally(() => setAchievementsLoading(false));
  }, []);

  if (!user) return null;

  const unlocked = achievements.filter((a) => a.unlocked_at !== null).length;
  const joinedDate = new Date(user.created_at).toLocaleDateString();
  const statCards = [
    {
      label: 'Total XP',
      value: user.xp_total.toLocaleString(),
      helper: 'Lifetime progress',
      icon: Star,
      iconClass: 'bg-red-accent/10 text-red-accent',
    },
    {
      label: 'Current Streak',
      value: `${user.current_streak}`,
      helper: 'Days in a row',
      icon: Flame,
      iconClass: 'bg-amber-accent/10 text-amber-accent',
    },
    {
      label: 'Longest Streak',
      value: `${user.longest_streak}`,
      helper: 'Personal best',
      icon: Calendar,
      iconClass: 'bg-white/10 text-zinc-300',
    },
    {
      label: 'Achievements',
      value: achievementsLoading ? '…' : `${unlocked}/${achievements.length}`,
      helper: achievementsLoading ? 'Syncing progress' : 'Unlocked so far',
      icon: Trophy,
      iconClass: 'bg-amber-accent/10 text-amber-accent',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-in">
      <section className="glass overflow-hidden">
        <div className="border-b border-white/10 bg-white/[0.02] px-8 py-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-red-accent/20 bg-red-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-accent">
            <UserCircle2 size={14} aria-hidden="true" />
            Account overview
          </span>
        </div>

        <div className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 text-5xl shadow-lg shadow-black/20">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={`${user.display_name} avatar`}
                    className="h-full w-full rounded-3xl object-cover"
                  />
                ) : (
                  '👤'
                )}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-400">Profile</p>
                <h1 className="mt-1 text-3xl font-bold text-white">{user.display_name}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Review your LearnForge progress, personal streaks, and achievement milestones in
                  one place.
                </p>
              </div>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <dt className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-400">
                  <Mail size={16} className="text-red-accent" aria-hidden="true" />
                  Email
                </dt>
                <dd className="break-all text-sm font-semibold text-white">{user.email}</dd>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <dt className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-400">
                  <Calendar size={16} className="text-zinc-300" aria-hidden="true" />
                  Joined
                </dt>
                <dd className="text-sm font-semibold text-white">{joinedDate}</dd>
              </div>
            </dl>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-black/20 p-6">
            <h2 className="text-lg font-semibold text-white">Progress snapshot</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Your account activity updates here automatically as you complete lessons, quizzes,
              and labs.
            </p>

            <div className="mt-6 grid gap-3">
              {statCards.map(({ label, value, helper, icon: Icon, iconClass }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
                      <Icon size={18} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-white">{value}</p>
                      <p className="mt-1 text-sm text-zinc-400">{helper}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Trophy size={20} className="text-amber-accent" aria-hidden="true" />
              Achievements
            </h2>
            <p className="text-sm text-zinc-400">
              Track badges you have unlocked and see what is still ahead.
            </p>
          </div>

          {!achievementsLoading && achievements.length > 0 && (
            <p className="text-sm text-zinc-500">
              {unlocked} unlocked of {achievements.length}
            </p>
          )}
        </div>

        {achievementsLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="glass flex items-center gap-4 rounded-3xl p-5 animate-pulse"
              >
                <div className="h-14 w-14 shrink-0 rounded-2xl bg-white/10" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-1/2 rounded bg-white/10" />
                  <div className="h-3 w-4/5 rounded bg-white/5" />
                  <div className="h-3 w-1/3 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : achievements.length === 0 ? (
          <div className="glass rounded-3xl px-8 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-3xl">
              🏆
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">No achievements available yet</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Achievements will appear here automatically once they are available for your account.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {achievements.map((a) => (
              <AchievementBadge
                key={a.id}
                icon={a.icon}
                name={a.name}
                description={a.description}
                unlocked={a.unlocked_at !== null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
