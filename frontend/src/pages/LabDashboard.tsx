import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Play,
  Server,
  Square,
  XCircle,
} from 'lucide-react';
import api from '../api/client';
import LabTemplateIcon from '../components/LabTemplateIcon';
import type { Lab } from '../types';

const ACTIVE_STATUSES = new Set<Lab['status']>(['queued', 'provisioning', 'running']);
const PAST_STATUSES = new Set<Lab['status']>(['stopped', 'failed']);

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function LabDashboard() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stopError, setStopError] = useState('');

  useEffect(() => {
    api
      .get<Lab[]>('/labs/mine')
      .then((r) => setLabs(r.data))
      .catch(() => setError('Failed to load labs. Please refresh the page.'))
      .finally(() => setLoading(false));
  }, []);

  const handleStop = async (labId: string) => {
    setStopError('');
    try {
      await api.post(`/labs/${labId}/stop`);
      setLabs((prev) =>
        prev.map((lab) => (lab.id === labId ? { ...lab, status: 'stopped' } : lab)),
      );
    } catch {
      setStopError('Failed to stop the lab. Please try again.');
    }
  };

  const active = useMemo(
    () => labs.filter((lab) => ACTIVE_STATUSES.has(lab.status)),
    [labs],
  );
  const past = useMemo(
    () => labs.filter((lab) => PAST_STATUSES.has(lab.status)),
    [labs],
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="glass space-y-6 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-accent/20 bg-red-accent/10 text-red-accent shadow-[0_0_30px_rgba(229,53,53,0.15)]">
                <Server size={24} />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-red-accent/80">
                  Environment control
                </p>
                <h1 className="text-3xl font-bold text-white">My Labs</h1>
              </div>
            </div>
            <p className="max-w-3xl text-zinc-400">
              Track live provisioning, jump back into active sessions, and relaunch
              finished environments without leaving the LearnForge flow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
            <DashboardStat
              label="Active"
              value={active.length}
              tone="success"
              helper="Queued, provisioning, or running"
            />
            <DashboardStat
              label="Past"
              value={past.length}
              tone="neutral"
              helper="Stopped or failed sessions"
            />
            <DashboardStat
              label="Total"
              value={labs.length}
              tone="accent"
              helper="Tracked across this workspace"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            to="/labs"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            Browse lab catalog
            <ExternalLink size={16} />
          </Link>
          <p className="text-zinc-500">
            Active sessions continue updating automatically while this page is open.
          </p>
        </div>
      </section>

      {stopError && (
        <div
          className="glass flex items-start gap-3 border border-red-accent/20 bg-red-accent/[0.06] p-4 text-red-100"
          role="alert"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-accent" aria-hidden="true" />
          <div>
            <p className="font-medium text-white">Couldn&apos;t update the lab state</p>
            <p className="mt-1 text-sm text-red-100/85">{stopError}</p>
          </div>
        </div>
      )}

      {loading ? (
        <section
          className="grid gap-4 lg:grid-cols-2"
          aria-live="polite"
          aria-busy="true"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="glass space-y-4 p-5 animate-pulse">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10" />
                  <div className="space-y-2">
                    <div className="h-4 w-36 rounded bg-white/10" />
                    <div className="h-3 w-28 rounded bg-white/5" />
                  </div>
                </div>
                <div className="h-6 w-24 rounded-full bg-white/5" />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <div className="h-3 w-40 rounded bg-white/5" />
                  <div className="h-3 w-52 rounded bg-white/5" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-24 rounded-lg bg-white/5" />
                  <div className="h-9 w-20 rounded-lg bg-white/5" />
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : error ? (
        <section className="glass space-y-4 p-8 text-center">
          <AlertTriangle size={44} className="mx-auto text-red-accent" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Unable to load your labs</h2>
            <p className="text-sm text-zinc-400">{error}</p>
          </div>
          <Link
            to="/labs"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            Browse lab catalog
            <ExternalLink size={16} />
          </Link>
        </section>
      ) : labs.length === 0 ? (
        <section className="glass space-y-4 p-8 text-center">
          <Server size={48} className="mx-auto text-zinc-700" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">No labs launched yet</h2>
            <p className="text-sm text-zinc-400">
              Start a guided environment to see session health, status, and relaunch
              controls here.
            </p>
          </div>
          <Link
            to="/labs"
            className="inline-flex items-center gap-2 rounded-lg border border-red-accent/25 bg-red-accent/10 px-4 py-2 text-sm font-medium text-red-accent transition-all hover:bg-red-accent/20"
          >
            Browse Labs
            <ExternalLink size={16} />
          </Link>
        </section>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <DashboardSection
              title="Active Labs"
              description="Live environments and sessions still being provisioned."
              count={active.length}
              icon={<CheckCircle2 size={18} className="text-green-accent" />}
              accentClass="border-green-accent/15 bg-green-accent/[0.03]"
            >
              <div className="space-y-3">
                {active.map((lab) => (
                  <LabRow key={lab.id} lab={lab} onStop={() => handleStop(lab.id)} />
                ))}
              </div>
            </DashboardSection>
          )}

          {past.length > 0 && (
            <DashboardSection
              title="Past Labs"
              description="Completed sessions ready to review or relaunch."
              count={past.length}
              icon={<Clock size={18} className="text-zinc-400" />}
            >
              <div className="space-y-3">
                {past.map((lab) => (
                  <LabRow key={lab.id} lab={lab} />
                ))}
              </div>
            </DashboardSection>
          )}
        </div>
      )}
    </div>
  );
}

function DashboardStat({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: 'success' | 'neutral' | 'accent';
}) {
  const toneClass = {
    success: 'border-green-accent/20 bg-green-accent/[0.06] text-green-accent',
    neutral: 'border-white/10 bg-white/[0.03] text-zinc-200',
    accent: 'border-red-accent/20 bg-red-accent/[0.06] text-red-accent',
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-current/75">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function DashboardSection({
  title,
  description,
  count,
  icon,
  accentClass = '',
  children,
}: {
  title: string;
  description: string;
  count: number;
  icon: ReactNode;
  accentClass?: string;
  children: ReactNode;
}) {
  return (
    <section className={`glass space-y-5 p-5 sm:p-6 ${accentClass}`.trim()}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
              {count}
            </span>
          </div>
          <p className="text-sm text-zinc-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function LabRow({
  lab,
  onStop,
}: {
  lab: Lab;
  onStop?: () => void;
}) {
  const isActive = ACTIVE_STATUSES.has(lab.status);

  return (
    <div className="glass-hover group flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl">
          <LabTemplateIcon template={lab.template} size={26} />
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-white transition-colors group-hover:text-red-accent">
              {lab.template?.name || 'Lab'}
            </p>
            <StatusBadge status={lab.status} queuePosition={lab.queue_position} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>Started {formatDate(lab.created_at)}</span>
            {lab.expires_at && isActive && <span>Expires {formatDate(lab.expires_at)}</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {isActive && (
          <Link
            to={`/labs/${lab.template?.slug || lab.template_id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-red-accent/20 bg-red-accent/10 px-3 py-2 text-sm font-medium text-red-accent transition-all hover:bg-red-accent/20"
          >
            <ExternalLink size={14} />
            Open
          </Link>
        )}

        {lab.status === 'running' && onStop && (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <Square size={14} />
            Stop
          </button>
        )}

        {lab.status === 'queued' && onStop && (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-accent/20 bg-amber-accent/10 px-3 py-2 text-sm font-medium text-amber-accent transition-all hover:bg-amber-accent/20 hover:text-white"
          >
            <XCircle size={14} />
            Cancel
          </button>
        )}

        {!isActive && (
          <Link
            to={`/labs/${lab.template?.slug || lab.template_id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <Play size={14} />
            Relaunch
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  queuePosition,
}: {
  status: Lab['status'];
  queuePosition: number | null;
}) {
  const configs: Record<Lab['status'], { icon: ReactNode; className: string; label: string }> = {
    queued: {
      icon: <Clock size={12} />,
      className: 'border-amber-accent/20 bg-amber-accent/10 text-amber-accent',
      label: queuePosition ? `Queued #${queuePosition}` : 'Queued',
    },
    provisioning: {
      icon: <Loader2 size={12} className="animate-spin" />,
      className: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
      label: 'Provisioning',
    },
    running: {
      icon: <CheckCircle2 size={12} />,
      className: 'border-green-accent/20 bg-green-accent/10 text-green-accent',
      label: 'Running',
    },
    stopping: {
      icon: <Loader2 size={12} className="animate-spin" />,
      className: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300',
      label: 'Stopping',
    },
    stopped: {
      icon: <Square size={12} />,
      className: 'border-white/10 bg-white/[0.04] text-zinc-400',
      label: 'Stopped',
    },
    failed: {
      icon: <AlertTriangle size={12} />,
      className: 'border-red-accent/20 bg-red-accent/10 text-red-accent',
      label: 'Failed',
    },
  };

  const config = configs[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
      aria-label={config.label}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
