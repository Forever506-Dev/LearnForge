import { useState } from 'react';
import { ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '../api/errors';

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
      setError('Username must be 3–32 characters: letters, numbers, _ or -');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }
    if (!PASSWORD_RE.test(password)) {
      setError('Password must be at least 8 characters with an uppercase letter, lowercase letter, and a digit');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim(), username.trim());
      navigate('/');
    } catch (err) {
      setError(extractErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="glass w-full overflow-hidden animate-slide-up">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-white/10 bg-white/[0.02] p-8 sm:p-10 lg:border-b-0 lg:border-r">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-accent/20 bg-red-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-accent">
                <Sparkles size={14} aria-hidden="true" />
                Join LearnForge
              </span>

              <div className="mt-6 max-w-md space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl" aria-hidden="true">🔥</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-400">Build your account</p>
                    <h1 className="text-3xl font-bold text-white sm:text-4xl">Create your profile</h1>
                  </div>
                </div>
                <p className="text-sm leading-6 text-zinc-300 sm:text-base">
                  Start tracking your XP, streaks, and achievements with an account that keeps your
                  progress synced across quizzes, learning paths, and labs.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-accent/10 text-red-accent">
                    <UserPlus size={18} aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">Set up your public identity</h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Choose a username and display name that will appear across your profile and on
                    the leaderboard.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-green-accent">
                    <ShieldCheck size={18} aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">Password requirements</h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Use at least 8 characters with uppercase, lowercase, and a digit to meet the
                    existing account rules.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 sm:p-10">
              <div className="mx-auto max-w-lg">
                <div className="mb-8">
                  <p className="text-sm font-medium text-zinc-400">Registration</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Create your account</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Fill in your details below to unlock saved progress, achievements, and profile
                    stats.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="reg-username" className="block text-sm font-medium text-zinc-300">
                        Username
                      </label>
                      <input
                        id="reg-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="input-glass"
                        placeholder="cool_hacker"
                        autoComplete="username"
                        required
                        aria-required="true"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="reg-display-name" className="block text-sm font-medium text-zinc-300">
                        Display Name
                      </label>
                      <input
                        id="reg-display-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="input-glass"
                        placeholder="Your name"
                        autoComplete="name"
                        required
                        aria-required="true"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="reg-email" className="block text-sm font-medium text-zinc-300">
                      Email
                    </label>
                    <input
                      id="reg-email"
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

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="reg-password" className="block text-sm font-medium text-zinc-300">
                        Password
                      </label>
                      <input
                        id="reg-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-glass"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                        aria-required="true"
                        aria-describedby="password-hint"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="reg-confirm" className="block text-sm font-medium text-zinc-300">
                        Confirm Password
                      </label>
                      <input
                        id="reg-confirm"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="input-glass"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                        aria-required="true"
                      />
                    </div>
                  </div>

                  <div id="password-hint" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-zinc-400">
                    Min 8 characters with uppercase, lowercase, and a digit.
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
                    {loading ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-red-accent hover:underline">
                    Sign in instead
                  </Link>
                  .
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
