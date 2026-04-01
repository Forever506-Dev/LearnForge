import { useState } from 'react';
import { LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '../api/errors';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(extractErrorMessage(err, 'Sign in failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <section className="glass w-full overflow-hidden animate-slide-up">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="border-b border-white/10 bg-white/[0.02] p-8 sm:p-10 lg:border-b-0 lg:border-r">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-accent/20 bg-red-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-accent">
                <Sparkles size={14} aria-hidden="true" />
                Account access
              </span>

              <div className="mt-6 max-w-md space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl" aria-hidden="true">🔥</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-400">LearnForge</p>
                    <h1 className="text-3xl font-bold text-white sm:text-4xl">Welcome back</h1>
                  </div>
                </div>
                <p className="text-sm leading-6 text-zinc-300 sm:text-base">
                  Sign in to resume your labs, keep your streak alive, and stay on top of your
                  progress with the same dark LearnForge experience you already know.
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-accent/10 text-red-accent">
                    <LockKeyhole size={18} aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">Secure sign-in</h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Pick up where you left off with your existing credentials and saved account
                    progress.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-green-accent">
                    <ShieldCheck size={18} aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">Track your progress</h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Access your profile, achievements, and leaderboard standing without losing
                    momentum.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 sm:p-10">
              <div className="mx-auto max-w-md">
                <div className="mb-8">
                  <p className="text-sm font-medium text-zinc-400">Sign in</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Access your account</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Enter your account details to continue your learning journey.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div className="space-y-2">
                    <label htmlFor="login-email" className="block text-sm font-medium text-zinc-300">
                      Email
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-glass"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      aria-required="true"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="login-password" className="block text-sm font-medium text-zinc-300">
                        Password
                      </label>
                      <span className="text-xs text-zinc-500">Case-sensitive</span>
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-glass"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      aria-required="true"
                    />
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-2xl border border-red-accent/20 bg-red-accent/10 px-4 py-3 text-sm text-red-accent"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-red w-full"
                    aria-busy={loading}
                  >
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
                  New to LearnForge?{' '}
                  <Link to="/register" className="font-semibold text-red-accent hover:underline">
                    Create an account
                  </Link>{' '}
                  to save XP, streaks, and achievement progress.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
