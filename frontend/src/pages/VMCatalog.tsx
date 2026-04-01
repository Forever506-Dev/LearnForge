import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  Cpu,
  Loader2,
  Monitor,
  RefreshCw,
  Shield,
  Star,
} from 'lucide-react';
import api from '../api/client';
import { extractErrorMessage } from '../api/errors';
import LabTemplateIcon from '../components/LabTemplateIcon';
import type { LabDifficulty, LabTemplateSummary } from '../types';

const DIFFICULTY_STYLES: Record<LabDifficulty, string> = {
  beginner: 'text-green-accent bg-green-accent/10',
  intermediate: 'text-amber-accent bg-amber-accent/10',
  advanced: 'text-red-accent bg-red-accent/10',
};

const VM_HIGHLIGHTS = [
  {
    icon: <Monitor size={16} className="text-red-accent" />,
    label: 'Full desktop in the browser',
  },
  {
    icon: <Clock3 size={16} className="text-amber-accent" />,
    label: 'Typical boot time: 60–90 seconds',
  },
  {
    icon: <Shield size={16} className="text-emerald-400" />,
    label: 'Ready-made attack workstation for labs',
  },
] satisfies Array<{ icon: JSX.Element; label: string }>;

const VM_PILLARS = [
  'Consistent browser desktop delivery',
  'Bundled offensive tooling for guided labs',
  'A cleaner handoff from catalog to active session',
] as const;

function isVmTemplate(template: LabTemplateSummary) {
  return template.category === 'vm' || template.protocol === 'novnc';
}

function sortVmTemplates(templates: LabTemplateSummary[]) {
  return [...templates].sort((left, right) => left.name.localeCompare(right.name));
}

export default function VMCatalog() {
  const [templates, setTemplates] = useState<LabTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<LabTemplateSummary[]>('/labs/templates');
      setTemplates(sortVmTemplates(response.data.filter(isVmTemplate)));
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load VM environments right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="glass p-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-accent/20 bg-red-accent/10 text-red-accent shadow-[0_0_30px_rgba(229,53,53,0.15)]">
              <Monitor size={24} />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-red-accent/80">
                Browser workstation
              </p>
              <h1 className="text-3xl font-bold text-white">Virtual Machines</h1>
            </div>
          </div>
          <p className="max-w-3xl text-zinc-400">
            Launch a complete browser-based Linux workstation for offensive
            security labs. These VM sessions are ideal when you need a polished
            desktop, bundled tooling, and network access without configuring a
            local attack box.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {VM_PILLARS.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {VM_HIGHLIGHTS.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300"
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <span>{item.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/labs"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            Browse direct labs
            <ChevronRight size={16} />
          </Link>
          <p className="text-sm text-zinc-500">
            Prefer a faster container workflow? Explore guided labs instead.
          </p>
        </div>
      </section>

      <section className="glass rounded-xl border border-amber-accent/20 p-4">
        <div className="flex items-start gap-3">
          <Cpu className="mt-0.5 shrink-0 text-amber-accent" size={20} />
          <div className="space-y-2 text-sm text-zinc-300">
            <p>
              <span className="font-semibold text-amber-accent">Heads up:</span>{' '}
              VM labs can take a little longer than container labs to feel ready.
              A short wait while infrastructure provisions and the desktop boots
              is expected.
            </p>
            <p className="text-zinc-400">
              If the desktop view is still blank after provisioning completes,
              refresh the session status from inside the lab page before retrying.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <section
          aria-live="polite"
          aria-busy="true"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="glass rounded-2xl p-6 animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/5" />
                <div className="h-6 w-20 rounded-full bg-white/5" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-2/3 rounded bg-white/5" />
                <div className="h-4 w-full rounded bg-white/5" />
                <div className="h-4 w-5/6 rounded bg-white/5" />
              </div>
              <div className="flex items-center justify-between pt-3">
                <div className="h-5 w-28 rounded-full bg-white/5" />
                <div className="h-5 w-14 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </section>
      ) : error ? (
        <section className="glass p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-accent/20 bg-red-accent/10 text-red-accent">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-semibold text-white">Unable to load VM labs</h2>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
          <button
            type="button"
            onClick={() => void loadTemplates()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </section>
      ) : templates.length === 0 ? (
        <section className="glass p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-500">
            <Monitor size={24} />
          </div>
          <h2 className="text-lg font-semibold text-white">No VM environments yet</h2>
          <p className="mt-2 text-sm text-zinc-400">
            VM templates have not been seeded in this environment yet.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Once the backend catalog is populated, browser desktops will appear here.
          </p>
        </section>
      ) : (
        <section
          aria-label="Available virtual machine labs"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {templates.map((template) => (
            <Link
              key={template.id}
              to={`/labs/${template.slug}`}
              aria-label={`Open ${template.name} VM session`}
              className="glass-hover group flex h-full flex-col gap-5 rounded-2xl p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl">
                  <LabTemplateIcon template={template} size={28} />
                </div>
                <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  <Monitor size={12} />
                  Desktop
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white transition-colors group-hover:text-red-accent">
                  {template.name}
                </h2>
                <p className="line-clamp-3 text-sm text-zinc-400">
                  {template.description}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                Browser desktop delivery with a guided VM launch flow and stronger
                session-status visibility.
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      DIFFICULTY_STYLES[template.difficulty]
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
                  <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {loading && (
        <div className="sr-only" aria-live="polite">
          Loading VM environments.
        </div>
      )}

      {!loading && !error && templates.length > 0 && (
        <div className="sr-only" aria-live="polite">
          Loaded {templates.length} virtual machine environments.
        </div>
      )}
    </div>
  );
}
