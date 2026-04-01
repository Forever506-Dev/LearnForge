import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor,
  RefreshCw,
  Search,
  Server,
  Shield,
  Terminal,
  Globe,
  Star,
  ChevronRight,
} from 'lucide-react';
import api from '../api/client';
import { extractErrorMessage } from '../api/errors';
import LabTemplateIcon from '../components/LabTemplateIcon';
import { useAuth } from '../hooks/useAuth';
import type { LabCategory, LabDifficulty, LabTemplateSummary } from '../types';

const DIFFICULTY_COLORS: Record<LabDifficulty, string> = {
  beginner: 'text-green-accent bg-green-accent/10',
  intermediate: 'text-amber-accent bg-amber-accent/10',
  advanced: 'text-red-accent bg-red-accent/10',
};

const CATEGORY_LABELS: Record<LabCategory, string> = {
  web_hacking: 'Web Hacking',
  linux: 'Linux',
  privilege_escalation: 'Privilege Escalation',
  cve_exploitation: 'CVE Exploitation',
  network: 'Network',
  vm: 'Virtual Machine',
};

const CATEGORY_ORDER: LabCategory[] = [
  'web_hacking',
  'linux',
  'privilege_escalation',
  'cve_exploitation',
  'network',
];

const LAB_HIGHLIGHTS = [
  'Launch isolated environments in a few clicks',
  'Filter by skill track, protocol, or difficulty',
  'Keep a cohesive path into VM workstations when you need more tooling',
] as const;

const PROTOCOL_ICONS: Record<string, React.ReactNode> = {
  ssh: <Terminal size={14} />,
  vnc: <Server size={14} />,
  rdp: <Server size={14} />,
  web: <Globe size={14} />,
  novnc: <Server size={14} />,
};

function isVmTemplate(template: LabTemplateSummary) {
  return template.category === 'vm' || template.protocol === 'novnc';
}

function sortTemplates(templates: LabTemplateSummary[]) {
  return [...templates].sort((left, right) => left.name.localeCompare(right.name));
}

export default function LabCatalog() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<LabTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | LabCategory>('all');
  const [search, setSearch] = useState('');

  const loadTemplates = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<LabTemplateSummary[]>('/labs/templates', { signal });
      setTemplates(sortTemplates(response.data));
    } catch (err) {
      if (signal?.aborted) {
        return;
      }

      setError(extractErrorMessage(err, 'Failed to load labs. Please try again.'));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadTemplates(controller.signal);
    return () => controller.abort();
  }, [loadTemplates]);

  const labTemplates = useMemo(
    () => sortTemplates(templates.filter((template) => !isVmTemplate(template))),
    [templates],
  );
  const vmTemplates = useMemo(
    () => sortTemplates(templates.filter(isVmTemplate)),
    [templates],
  );
  const normalizedSearch = search.trim().toLowerCase();
  const categories = useMemo(() => {
    const presentCategories = new Set(labTemplates.map((template) => template.category));
    const ordered = CATEGORY_ORDER.filter((category) => presentCategories.has(category));
    const remaining = [...presentCategories]
      .filter((category) => !ordered.includes(category))
      .sort((left, right) =>
        (CATEGORY_LABELS[left] ?? left).localeCompare(CATEGORY_LABELS[right] ?? right),
      );

    return ['all', ...ordered, ...remaining] as Array<'all' | LabCategory>;
  }, [labTemplates]);
  const filtered = useMemo(() => {
    return labTemplates.filter((template) => {
      const matchesCategory = filter === 'all' || template.category === filter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        template.name.toLowerCase().includes(normalizedSearch) ||
        template.description.toLowerCase().includes(normalizedSearch) ||
        (CATEGORY_LABELS[template.category] ?? template.category)
          .toLowerCase()
          .includes(normalizedSearch) ||
        template.protocol.toLowerCase().includes(normalizedSearch) ||
        template.difficulty.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [filter, labTemplates, normalizedSearch]);
  const hasActiveFilters = filter !== 'all' || normalizedSearch.length > 0;
  const vmBrowseTarget = user ? '/vms' : '/login';

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="glass space-y-6 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-accent/20 bg-red-accent/10 text-red-accent shadow-[0_0_30px_rgba(229,53,53,0.15)]">
                <Shield size={24} />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-red-accent/80">
                  Hands-on practice
                </p>
                <h1 className="text-3xl font-bold text-white">Cyber Labs</h1>
              </div>
            </div>
            <p className="max-w-3xl text-zinc-400">
              Launch vulnerable environments, drill into attack paths, and build
              repeatable offensive security instincts in a safe sandbox.
            </p>
            <div className="flex flex-wrap gap-2">
              {LAB_HIGHLIGHTS.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-zinc-300">
                {labTemplates.length} guided lab{labTemplates.length === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-zinc-300">
                {categories.length - 1} track{categories.length - 1 === 1 ? '' : 's'} to
                explore
              </span>
              {vmTemplates.length > 0 && (
                <span className="rounded-full border border-red-accent/20 bg-red-accent/10 px-3 py-1.5 text-red-accent">
                  {vmTemplates.length} VM environment{vmTemplates.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>

          {vmTemplates.length > 0 && (
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/20 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-red-accent">
                  <Monitor size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Need a full desktop?</h2>
                  <p className="text-sm text-zinc-500">Launch a browser-based VM workstation.</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                VM environments are ideal when you want a polished Linux desktop,
                bundled tooling, and a smoother attack-box experience.
              </p>
              <Link
                to={vmBrowseTarget}
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                {user ? 'Browse VM environments' : 'Sign in to explore VMs'}
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="glass space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="block w-full max-w-xl">
            <span className="mb-2 block text-sm font-medium text-zinc-300">
              Search labs
            </span>
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input-glass pl-11"
                placeholder="Search by name, protocol, category, or difficulty"
                aria-label="Search labs"
              />
            </div>
          </label>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400 sm:min-w-[260px]">
            <div>
              <p aria-live="polite">
                Showing <span className="font-semibold text-white">{filtered.length}</span> of{' '}
                <span className="font-semibold text-white">{labTemplates.length}</span> lab
                {labTemplates.length === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Filter by attack surface or search by skill area.
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilter('all');
                  setSearch('');
                }}
                className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Filter labs by category">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                filter === category
                  ? 'border-red-accent/30 bg-red-accent/10 text-red-accent shadow-[0_0_20px_rgba(229,53,53,0.12)]'
                  : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {category === 'all' ? 'All Labs' : CATEGORY_LABELS[category] ?? category}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          aria-live="polite"
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="glass space-y-4 p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-2xl bg-white/10" />
                <div className="h-6 w-20 rounded-full bg-white/5" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-20 rounded-full bg-white/5" />
                <div className="h-5 w-3/4 rounded bg-white/10" />
                <div className="h-4 w-full rounded bg-white/5" />
                <div className="h-4 w-2/3 rounded bg-white/5" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="h-5 w-24 rounded-full bg-white/5" />
                <div className="h-5 w-16 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <section className="glass space-y-4 p-8 text-center">
          <Shield size={44} className="mx-auto text-red-accent" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Unable to load labs</h2>
            <p className="text-sm text-zinc-400">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadTemplates()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </section>
      ) : labTemplates.length === 0 ? (
        <section className="glass space-y-4 p-8 text-center">
          <Shield size={48} className="mx-auto text-zinc-700" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">No direct labs yet</h2>
            <p className="text-sm text-zinc-400">
              Lab templates have not been seeded in this environment yet.
            </p>
          </div>
          {vmTemplates.length > 0 && (
            <Link
              to={vmBrowseTarget}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              {user ? 'Browse VM environments' : 'Sign in to explore VMs'}
              <ChevronRight size={16} />
            </Link>
          )}
        </section>
      ) : filtered.length === 0 ? (
        <section className="glass space-y-4 p-8 text-center">
          <Shield size={48} className="mx-auto text-zinc-700" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">No labs match those filters</h2>
            <p className="text-sm text-zinc-400">
              Try a broader search or switch categories to surface more labs.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilter('all');
                  setSearch('');
                }}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                Clear filters
              </button>
            )}
            {vmTemplates.length > 0 && (
              <Link
                to={vmBrowseTarget}
                className="rounded-lg border border-red-accent/25 bg-red-accent/10 px-4 py-2 text-sm font-medium text-red-accent transition-all hover:bg-red-accent/20"
              >
                {user ? 'Browse VM environments' : 'Sign in to explore VMs'}
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section
          aria-label="Available labs"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((template) => (
            <Link
              key={template.id}
              to={`/labs/${template.slug}`}
              aria-label={`Open ${template.name} lab`}
              className="glass-hover group flex h-full flex-col gap-5 rounded-2xl p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-3xl">
                  <LabTemplateIcon template={template} size={28} />
                </div>
                <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  {PROTOCOL_ICONS[template.protocol]}
                  {template.protocol.toUpperCase()}
                </span>
              </div>

              <div className="space-y-3">
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  {CATEGORY_LABELS[template.category] ?? template.category}
                </span>
                <h2 className="text-lg font-bold text-white transition-colors group-hover:text-red-accent">
                  {template.name}
                </h2>
                <p className="line-clamp-3 flex-1 text-sm text-zinc-400">
                  {template.description}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                Guided environment with browser-accessible workflow and clear session
                controls.
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      DIFFICULTY_COLORS[template.difficulty]
                    }`}
                  >
                    {template.difficulty}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-amber-accent">
                    <Star size={12} />
                    {template.xp_reward} XP
                  </span>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-zinc-300 transition-colors group-hover:text-white">
                  Open
                  <ChevronRight
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {loading && (
        <div className="sr-only" aria-live="polite">
          Loading labs.
        </div>
      )}

      {!loading && !error && labTemplates.length > 0 && (
        <div className="sr-only" aria-live="polite">
          Loaded {filtered.length} lab{filtered.length === 1 ? '' : 's'}.
        </div>
      )}
    </div>
  );
}
