import { Outlet, Link, NavLink, matchPath, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  User,
  LogOut,
  Flame,
  Star,
  Shield,
  Server,
  Monitor,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type NavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  requiresAuth?: boolean;
  isActive?: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', requiresAuth: true },
  {
    to: '/paths',
    icon: BookOpen,
    label: 'Paths',
    isActive: (pathname) =>
      pathname.startsWith('/paths') || pathname.startsWith('/learn/'),
  },
  {
    to: '/labs',
    icon: Shield,
    label: 'Labs',
    isActive: (pathname) =>
      pathname === '/labs' ||
      (matchPath('/labs/:slug', pathname) !== null && pathname !== '/labs/dashboard'),
  },
  {
    to: '/labs/dashboard',
    icon: Server,
    label: 'My Labs',
    requiresAuth: true,
  },
  { to: '/vms', icon: Monitor, label: 'VM', requiresAuth: true },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/profile', icon: User, label: 'Profile', requiresAuth: true },
];

const MOBILE_NAV_AUTHENTICATED = ['/', '/paths', '/labs', '/labs/dashboard', '/vms'];
const MOBILE_NAV_PUBLIC = ['/paths', '/labs', '/leaderboard'];

function isNavItemActive(item: NavItem, pathname: string) {
  if (item.isActive) {
    return item.isActive(pathname);
  }

  return matchPath({ path: item.to, end: true }, pathname) !== null;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const hasStreak = (user?.current_streak ?? 0) > 0;
  const desktopNavItems = NAV_ITEMS.filter((item) => !item.requiresAuth || user);
  const mobileNavItems = NAV_ITEMS.filter((item) =>
    user
      ? MOBILE_NAV_AUTHENTICATED.includes(item.to)
      : MOBILE_NAV_PUBLIC.includes(item.to),
  );
  const isImmersiveLabRoute =
    matchPath('/labs/:slug', location.pathname) !== null &&
    location.pathname !== '/labs/dashboard';
  const userInitial = user?.display_name?.trim().charAt(0).toUpperCase() ?? 'U';

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(229,53,53,0.16),transparent_58%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-8rem] top-28 z-0 h-72 w-72 rounded-full bg-red-accent/10 blur-3xl"
      />

      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="relative sticky top-0 z-50 border-b border-white/10 bg-[rgba(10,10,15,0.7)] backdrop-blur-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-accent/35 to-transparent"
        />

        <div className="mx-auto flex min-h-[88px] w-full max-w-[112rem] items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-3 lg:px-6 xl:gap-4 xl:px-8">
          <Link
            to="/"
            className="header-shell group flex h-14 min-w-0 shrink-0 items-center gap-3 rounded-[1.45rem] px-3.5 pr-4 transition-all duration-300 hover:border-white/15 hover:shadow-[0_18px_40px_rgba(0,0,0,0.3),0_0_0_1px_rgba(229,53,53,0.08)] lg:max-w-[11.75rem] lg:justify-self-start xl:max-w-[13.5rem] 2xl:max-w-none"
          >
            <span className="flex h-11 w-[3.35rem] shrink-0 items-center justify-center rounded-[1.1rem] border border-red-accent/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.015)),rgba(229,53,53,0.14)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_28px_rgba(229,53,53,0.14)] transition-transform duration-300 group-hover:-translate-y-0.5">
              <Flame size={20} className="text-red-accent" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold uppercase tracking-[0.18em] text-red-accent/90">
                LearnForge
              </span>
              <span className="hidden truncate text-sm text-zinc-400 2xl:block">
                Cyber labs and guided practice
              </span>
            </span>
          </Link>

          <nav
            className="header-shell hidden h-14 min-w-0 items-center justify-center gap-1 rounded-full px-1.5 lg:inline-flex lg:w-full lg:justify-self-center"
            aria-label="Main navigation"
          >
            {desktopNavItems.map((item) => {
              const active = isNavItemActive(item, location.pathname);
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-all duration-300 xl:px-3.5 ${
                    active
                      ? 'border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(229,53,53,0.14)]'
                      : 'border border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[0.055] hover:text-white'
                  }`}
                >
                  <Icon size={16} aria-hidden="true" className={active ? 'text-red-accent' : ''} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3 lg:justify-self-end">
            {user ? (
              <>
                <div className="header-shell hidden h-14 items-center gap-2 rounded-full px-2.5 2xl:flex">
                  <span className="xp-badge">
                    <Star size={12} />
                    {user.xp_total} XP
                  </span>
                  {hasStreak && (
                    <span className="streak-badge">
                      <Flame size={12} />
                      {user.current_streak}d
                    </span>
                  )}
                </div>

                <Link
                  to="/profile"
                  className="header-shell hidden h-14 min-w-0 items-center gap-3 rounded-full pl-2.5 pr-3 text-left transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06] hover:shadow-[0_18px_40px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.03)] sm:flex lg:max-w-[9.5rem] xl:max-w-[11rem] 2xl:max-w-none 2xl:pr-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-accent/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015)),rgba(229,53,53,0.12)] text-sm font-semibold text-red-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_20px_rgba(229,53,53,0.1)]">
                    {userInitial}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">
                      {user.display_name}
                    </span>
                    <span className="hidden truncate text-xs text-zinc-500 2xl:block 2xl:text-zinc-400">
                      Continue your progress
                    </span>
                  </span>
                </Link>

                <Link
                  to="/profile"
                  className="header-shell flex h-11 w-11 items-center justify-center rounded-full text-zinc-300 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06] hover:text-white sm:hidden"
                  aria-label="Open profile"
                >
                  <User size={16} aria-hidden="true" />
                </Link>

                <button
                  onClick={logout}
                  type="button"
                  className="header-shell flex h-12 w-12 items-center justify-center rounded-full text-zinc-400 transition-all duration-300 hover:border-red-accent/20 hover:bg-red-accent/10 hover:text-white lg:h-14 lg:w-14"
                  aria-label="Logout"
                >
                  <LogOut size={16} aria-hidden="true" />
                </button>
              </>
            ) : (
              <div className="header-shell flex h-14 items-center gap-2 rounded-full px-1.5">
                <Link to="/login" className="btn-red text-sm !px-4 !py-2">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white sm:inline-flex"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {user && (
          <div className="mx-auto hidden max-w-7xl items-center gap-3 px-4 pb-4 sm:flex lg:hidden sm:px-6">
            <span className="xp-badge">
              <Star size={12} />
              {user.xp_total} XP
            </span>
            {hasStreak && (
              <span className="streak-badge">
                <Flame size={12} />
                {user.current_streak}d
              </span>
            )}
            <span className="text-xs text-zinc-500">Pick up where you left off.</span>
          </div>
        )}
      </header>

      <nav
        className="safe-bottom fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto flex max-w-lg items-center justify-around gap-1 rounded-[1.75rem] border border-white/10 bg-[rgba(13,13,20,0.88)] p-2 shadow-[0_18px_45px_rgba(0,0,0,0.42)] backdrop-blur-2xl [background-image:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))]">
          {mobileNavItems.map((item) => {
            const active = isNavItemActive(item, location.pathname);
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-medium transition-all duration-300 ${
                  active
                    ? 'bg-red-accent/10 text-white shadow-[0_10px_24px_rgba(229,53,53,0.08)] [background-image:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))]'
                    : 'text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200'
                }`}
              >
                <Icon
                  size={18}
                  aria-hidden="true"
                  className={active ? 'text-red-accent' : undefined}
                />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <main
        id="main-content"
        className={`relative z-10 mx-auto flex w-full flex-1 flex-col py-8 pb-32 md:pb-12 ${
          isImmersiveLabRoute ? 'max-w-[95vw] px-4' : 'max-w-7xl px-4 sm:px-6 lg:px-8'
        }`}
      >
        {!user && (
          <div className="glass mb-6 rounded-[1.75rem] px-4 py-4 text-sm text-zinc-300 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-white">
                  Explore the platform before you launch.
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Sign in to start labs, save progress, and access your VM workstations.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-red text-sm !px-4 !py-2">
                  Sign In
                </Link>
                <Link
                  to="/paths"
                  className="btn-ghost text-sm !px-4 !py-2"
                >
                  Browse Paths
                </Link>
              </div>
            </div>
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}
