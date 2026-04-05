import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clipboard,
  ClipboardCheck,
  Clock,
  Globe,
  Loader2,
  Monitor,
  Play,
  RefreshCw,
  Square,
  Terminal,
  XCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import api from '../api/client';
import { extractErrorMessage } from '../api/errors';
import LabTemplateIcon from '../components/LabTemplateIcon';
import type { Lab, LabStatus, LabStatusEvent, LabTemplate } from '../types';

type VmFrameState = 'idle' | 'loading' | 'ready' | 'error';
type NoticeTone = 'info' | 'success' | 'error';
type BannerTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type SessionState = LabStatus | 'idle';
type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface SessionBannerCopy {
  tone: BannerTone;
  title: string;
  description: string;
  tips: string[];
}

interface NoticeMessage {
  tone: NoticeTone;
  message: string;
}

interface XtermTerminalProps {
  labId: string;
  accessToken: string;
}

const WEB_PROTOCOLS = new Set<LabTemplate['protocol']>(['web', 'novnc']);
const TERMINAL_STATUSES = new Set<LabStatus>([
  'running',
  'stopping',
  'stopped',
  'failed',
]);

function isWebProtocol(protocol: LabTemplate['protocol']) {
  return WEB_PROTOCOLS.has(protocol);
}

function mergeLabStatus(current: Lab | null, update: LabStatusEvent) {
  if (!current) return current;

  return {
    ...current,
    status: update.status,
    web_url: update.web_url ?? current.web_url,
    queue_position: update.queue_position,
    expires_at: update.expires_at,
  };
}

function formatTtl(expiresAt: string) {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return 'Expired';

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function buildAuthedLabUrl(baseUrl: string, accessToken: string) {
  if (!accessToken) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}token=${encodeURIComponent(accessToken)}`;
}

function buildNoVncUrl(baseUrl: string, labId: string, accessToken: string, resize: 'scale' | 'remote' | 'off' = 'off') {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const resizeParam = resize !== 'off' ? `&resize=${resize}` : '';
  return `${normalizedBase}vnc.html?token=${encodeURIComponent(accessToken)}&path=api/labs/${labId}/proxy/websockify${resizeParam}`;
}

function getReadableStatus(status: LabStatus) {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'provisioning':
      return 'Provisioning';
    case 'running':
      return 'Running';
    case 'stopping':
      return 'Stopping';
    case 'failed':
      return 'Failed';
    case 'stopped':
    default:
      return 'Stopped';
  }
}

function getProtocolPresentation(protocol: LabTemplate['protocol']) {
  switch (protocol) {
    case 'novnc':
      return {
        label: 'VM Desktop',
        badgeClass:
          'bg-violet-500/10 text-violet-300 border-violet-500/20',
        launchLabel: 'Launch VM',
      };
    case 'web':
      return {
        label: 'Browser App',
        badgeClass:
          'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        launchLabel: 'Launch Lab',
      };
    case 'vnc':
      return {
        label: 'VNC',
        badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
        launchLabel: 'Launch Lab',
      };
    case 'rdp':
      return {
        label: 'RDP',
        badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
        launchLabel: 'Launch Lab',
      };
    case 'ssh':
    default:
      return {
        label: 'SSH',
        badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
        launchLabel: 'Launch Lab',
      };
  }
}

function getSessionBannerCopy({
  state,
  protocol,
  frameState,
  queuePosition,
  progressStage,
  hasWebUrl,
}: {
  state: SessionState;
  protocol: LabTemplate['protocol'];
  frameState: VmFrameState;
  queuePosition: number | null | undefined;
  progressStage: string;
  hasWebUrl: boolean;
}): SessionBannerCopy {
  if (state === 'idle' || state === 'stopped') {
    return {
      tone: 'neutral',
      title: 'Ready when you are',
      description:
        protocol === 'novnc'
          ? 'Launching a VM desktop usually takes 60–90 seconds while infrastructure spins up and the desktop boots.'
          : 'Launch the lab to provision the environment and open the interactive workspace.',
      tips: [
        'Keep this page open while the lab starts.',
        'You can stop and relaunch if a session becomes unresponsive.',
      ],
    };
  }

  if (state === 'queued') {
    return {
      tone: 'warning',
      title: 'Waiting for lab capacity',
      description: `Your session is in the queue${queuePosition ? ` at position ${queuePosition}` : ''}. Once a slot is free, provisioning will begin automatically.`,
      tips: [
        'No action is required; this page updates as the queue advances.',
        'VM labs usually take a little longer than standard browser labs.',
      ],
    };
  }

  if (state === 'provisioning') {
    return {
      tone: 'info',
      title: 'Preparing your workspace',
      description:
        progressStage ||
        'We are creating the lab environment, wiring networking, and getting the browser entry point ready.',
      tips: [
        'A short gray or loading screen can still happen after provisioning completes.',
        'Refresh status if the session looks stuck for an extended period.',
      ],
    };
  }

  if (state === 'running' && isWebProtocol(protocol)) {
    if (!hasWebUrl || frameState === 'loading') {
      return {
        tone: 'info',
        title: protocol === 'novnc' ? 'Connecting to your VM desktop' : 'Opening lab workspace',
        description:
          protocol === 'novnc'
            ? 'The browser client is loading. If the desktop stays gray for longer than about 90 seconds, the VM may still be finishing boot on the backend.'
            : 'The lab is running and the browser client is still attaching.',
        tips: [
          'Use Refresh status before giving up on the session.',
          'If it remains blank, stop and relaunch the lab to request a fresh instance.',
        ],
      };
    }

    if (frameState === 'error') {
      return {
        tone: 'danger',
        title: 'Workspace failed to attach',
        description:
          'The lab is marked as running, but the embedded client could not finish loading.',
        tips: [
          'Refresh the session status to retry the browser connection.',
          'If the problem persists, stop and relaunch the lab.',
        ],
      };
    }

    return {
      tone: 'success',
      title: protocol === 'novnc' ? 'VM desktop is ready' : 'Lab workspace is ready',
      description:
        protocol === 'novnc'
          ? 'The browser desktop client is connected. Clipboard helpers are available above the VM view.'
          : 'The browser-based lab is connected and ready for interaction.',
      tips: [
        'If the desktop itself still looks mid-boot, give it a few more seconds.',
        'Use the status refresh button if the session stops responding.',
      ],
    };
  }

  if (state === 'running') {
    return {
      tone: 'success',
      title: 'Interactive shell is live',
      description:
        'The lab is running. Terminal connectivity is managed in the workspace pane below.',
      tips: [
        'If the shell disconnects, use the reconnect control from the terminal bar.',
        'Some labs also expose a browser preview beneath the terminal.',
      ],
    };
  }

  if (state === 'stopping') {
    return {
      tone: 'warning',
      title: 'Shutting down lab',
      description:
        'We are cleaning up the running environment and releasing infrastructure resources.',
      tips: [
        'This usually finishes quickly, but network cleanup can take a moment.',
      ],
    };
  }

  return {
    tone: 'danger',
    title: 'Lab failed to start cleanly',
    description:
      'The backend reported a failure while starting or connecting the session.',
    tips: [
      'Refresh the session status for the latest state.',
      'If needed, launch a fresh instance from the action bar.',
    ],
  };
}

export default function LabSession() {
  const { slug } = useParams<{ slug: string }>();

  const [template, setTemplate] = useState<LabTemplate | null>(null);
  const [lab, setLab] = useState<Lab | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [ttl, setTtl] = useState('');
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [progressStage, setProgressStage] = useState('');
  const [webPreviewOpen, setWebPreviewOpen] = useState(true);
  const [vmClipboard, setVmClipboard] = useState('');
  const [clipboardNotice, setClipboardNotice] = useState<NoticeMessage | null>(null);
  const [vmFrameState, setVmFrameState] = useState<VmFrameState>('idle');

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const clipboardNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTimedClipboardNotice = useCallback((notice: NoticeMessage) => {
    setClipboardNotice(notice);

    if (clipboardNoticeTimerRef.current) {
      clearTimeout(clipboardNoticeTimerRef.current);
    }

    clipboardNoticeTimerRef.current = setTimeout(() => {
      setClipboardNotice(null);
      clipboardNoticeTimerRef.current = null;
    }, 2500);
  }, []);

  const connectSSE = useCallback((labId: string) => {
    eventSourceRef.current?.close();

    const token = localStorage.getItem('access_token') ?? '';
    const source = new EventSource(`/api/labs/${labId}/events?token=${token}`);
    eventSourceRef.current = source;

    source.addEventListener('status', (event) => {
      const data = JSON.parse((event as MessageEvent).data) as LabStatusEvent;

      setLab((current) => mergeLabStatus(current, data));
      setProgressPct(data.progress_pct);
      setProgressStage(data.progress_stage || '');

      if (TERMINAL_STATUSES.has(data.status)) {
        source.close();
        if (eventSourceRef.current === source) {
          eventSourceRef.current = null;
        }
      }
    });

    source.addEventListener('error', () => {
      source.close();
      if (eventSourceRef.current === source) {
        eventSourceRef.current = null;
      }
    });
  }, []);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    void (async () => {
      try {
        const [templateResponse, mineResponse] = await Promise.all([
          api.get<LabTemplate>(`/labs/templates/${slug}`),
          api.get<Lab[]>('/labs/mine'),
        ]);

        if (cancelled) return;

        const nextTemplate = templateResponse.data;
        const existingLab = mineResponse.data.find(
          (entry) =>
            entry.template_id === nextTemplate.id &&
            ['queued', 'provisioning', 'running'].includes(entry.status)
        );

        setTemplate(nextTemplate);
        setLab(existingLab ?? null);
        setProgressPct(existingLab?.status === 'running' ? 100 : null);
        setProgressStage(existingLab?.status === 'running' ? 'Lab ready' : '');

        if (existingLab && existingLab.status !== 'running') {
          connectSSE(existingLab.id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(extractErrorMessage(err, 'Lab template not found'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, connectSSE]);

  useEffect(() => {
    if (!lab?.expires_at || lab.status !== 'running') {
      setTtl('');
      return;
    }

    setTtl(formatTtl(lab.expires_at));
    const interval = setInterval(() => {
      setTtl(formatTtl(lab.expires_at!));
    }, 1000);

    return () => clearInterval(interval);
  }, [lab?.expires_at, lab?.status]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'clipboard-vm' && typeof event.data.text === 'string') {
        setVmClipboard(event.data.text);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!lab || !['queued', 'provisioning'].includes(lab.status)) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get<LabStatusEvent>(`/labs/${lab.id}/status`);
        setLab((current) => mergeLabStatus(current, data));
        setProgressPct(data.progress_pct);
        setProgressStage(data.progress_stage || '');

        if (TERMINAL_STATUSES.has(data.status)) {
          clearInterval(interval);
        }
      } catch {
        // Ignore transient polling failures.
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [lab?.id, lab?.status]);

  useEffect(() => {
    if (!lab || lab.status !== 'running' || !template) return;

    const needsWebUrl = isWebProtocol(template.protocol) && !lab.web_url;
    if (!needsWebUrl) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;

      try {
        const { data } = await api.get<LabStatusEvent>(`/labs/${lab.id}/status`);
        setLab((current) => mergeLabStatus(current, data));

        if (data.web_url || data.status !== 'running') {
          clearInterval(interval);
        }
      } catch {
        // Ignore transient fetch failures.
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [lab?.id, lab?.status, lab?.web_url, template]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      if (clipboardNoticeTimerRef.current) {
        clearTimeout(clipboardNoticeTimerRef.current);
      }
    };
  }, []);

  const accessToken = localStorage.getItem('access_token') ?? '';
  const protocolPresentation = template
    ? getProtocolPresentation(template.protocol)
    : null;

  const isRunning = lab?.status === 'running';
  const isWebLab = template ? isWebProtocol(template.protocol) : false;
  const hasWebPreview = Boolean(template && !isWebLab && lab?.web_url);

  const vmEmbedUrl = useMemo(() => {
    if (!template || !lab?.web_url || !isWebProtocol(template.protocol)) {
      return '';
    }

    if (template.protocol === 'novnc') {
      const resize = template.slug === 'windows11' ? 'scale' : 'off';
      return buildNoVncUrl(lab.web_url, lab.id, accessToken, resize);
    }

    return buildAuthedLabUrl(lab.web_url, accessToken);
  }, [accessToken, lab?.id, lab?.web_url, template]);

  useEffect(() => {
    if (!template || !isWebProtocol(template.protocol) || lab?.status !== 'running') {
      setVmFrameState('idle');
      return;
    }

    setVmFrameState('loading');
  }, [lab?.status, template?.protocol, vmEmbedUrl]);

  const bannerCopy = template
    ? getSessionBannerCopy({
        state: lab?.status ?? 'idle',
        protocol: template.protocol,
        frameState: vmFrameState,
        queuePosition: lab?.queue_position,
        progressStage,
        hasWebUrl: Boolean(lab?.web_url),
      })
    : null;

  const handleStart = async () => {
    if (!template) return;

    setStarting(true);
    setError('');
    setProgressPct(null);
    setProgressStage('');
    setVmFrameState(isWebProtocol(template.protocol) ? 'loading' : 'idle');

    try {
      const { data } = await api.post<Lab>('/labs/start', {
        template_id: template.id,
      });

      setLab(data);
      if (data.status !== 'running') {
        connectSSE(data.id);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to start lab'));
      setVmFrameState('error');
    } finally {
      setStarting(false);
    }
  };

  const handleRefresh = async () => {
    if (!lab) return;

    setRefreshing(true);
    setError('');

    if (template && isWebProtocol(template.protocol) && lab.status === 'running') {
      setVmFrameState('loading');
    }

    try {
      const { data } = await api.get<LabStatusEvent>(`/labs/${lab.id}/status`);
      setLab((current) => mergeLabStatus(current, data));
      setProgressPct(data.progress_pct);
      setProgressStage(data.progress_stage || '');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to refresh lab status'));
      if (template && isWebProtocol(template.protocol) && lab.status === 'running') {
        setVmFrameState('error');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleStop = async () => {
    if (!lab) return;

    setStopping(true);
    setError('');

    try {
      const { data } = await api.post<Lab>(`/labs/${lab.id}/stop`);
      setLab((current) => (current ? { ...current, status: data.status } : current));
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to stop lab'));
    } finally {
      setStopping(false);
    }
  };

  const handlePasteToVm = async () => {
    try {
      const text = await navigator.clipboard.readText();
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'clipboard-paste', text },
        '*',
      );
      setTimedClipboardNotice({
        tone: 'success',
        message: 'Clipboard text was sent to the VM.',
      });
    } catch {
      setTimedClipboardNotice({
        tone: 'info',
        message:
          'Clipboard access was blocked. Click inside the VM and use the noVNC clipboard button if needed.',
      });
    }
  };

  const handleCopyVmClipboard = async () => {
    if (!vmClipboard) return;

    try {
      await navigator.clipboard.writeText(vmClipboard);
      setTimedClipboardNotice({
        tone: 'success',
        message: 'Copied VM clipboard contents to your system clipboard.',
      });
    } catch {
      setTimedClipboardNotice({
        tone: 'error',
        message: 'Unable to copy automatically. Select the text manually from the VM clipboard preview.',
      });
    }
  };

  if (loading) {
    return (
      <div className="glass mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 px-6 py-20 text-center animate-fade-in" aria-live="polite">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-accent/20 bg-red-accent/10 text-red-accent shadow-[0_0_30px_rgba(229,53,53,0.12)]">
          <Loader2 className="animate-spin" size={28} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-white">Loading lab session</h1>
          <p className="max-w-md text-sm text-zinc-400">
            Pulling the latest template, session, and workspace details for this lab.
          </p>
        </div>
      </div>
    );
  }

  if (!template || !protocolPresentation) {
    return (
      <div className="glass mx-auto max-w-2xl space-y-4 px-6 py-16 text-center animate-fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-accent/20 bg-amber-accent/10 text-amber-accent">
          <AlertTriangle size={28} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-white">Lab unavailable</h1>
          <p className="text-sm text-zinc-400">{error || 'Lab not found'}</p>
        </div>
        <Link
          to="/labs"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Labs
        </Link>
      </div>
    );
  }

  const launchButtonLabel = template.protocol === 'novnc' ? 'Launch VM' : protocolPresentation.launchLabel;

  const renderWorkspace = () => {
    if (!lab || lab.status === 'stopped') {
      return (
        <WorkspacePlaceholder
          icon={template.protocol === 'web' ? <Globe size={44} /> : <Monitor size={44} />}
          title="Lab session not running"
          description={
            template.protocol === 'novnc'
              ? 'Launch the VM to provision a browser desktop. Initial startup can take around a minute.'
              : 'Launch the lab to provision the environment and open the workspace.'
          }
        />
      );
    }

    if (lab.status === 'failed') {
      return (
        <WorkspacePlaceholder
          tone="danger"
          icon={<AlertTriangle size={44} />}
          title="Lab failed to start"
          description="The environment did not come up cleanly. Refresh the status or launch a fresh instance from the action bar."
          actions={
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh status
            </button>
          }
        />
      );
    }

    if (lab.status === 'queued' || lab.status === 'provisioning') {
      return (
        <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(229,53,53,0.08),transparent_45%)] p-6">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/30 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-red-accent/20 bg-red-accent/10 p-3 text-red-accent">
                {lab.status === 'queued' ? (
                  <Clock size={26} />
                ) : (
                  <Loader2 size={26} className="animate-spin" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <h2 className="text-lg font-semibold text-white">
                  {lab.status === 'queued'
                    ? `Queued${lab.queue_position ? ` · position ${lab.queue_position}` : ''}`
                    : 'Provisioning lab environment'}
                </h2>
                <p className="text-sm text-zinc-400">
                  {lab.status === 'queued'
                    ? 'We are waiting for VM capacity. This page will continue to update automatically.'
                    : progressStage || 'Setting up the workspace, networking, and browser access.'}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div
                className="h-2.5 overflow-hidden rounded-full bg-zinc-800"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-accent to-amber-accent transition-all duration-700 ease-out"
                  style={{ width: `${progressPct ?? (lab.status === 'queued' ? 10 : 0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{lab.status === 'queued' ? 'Waiting for capacity' : 'Provisioning in progress'}</span>
                <span>{progressPct != null ? `${progressPct}%` : lab.status === 'queued' ? 'Queued' : 'Starting'}</span>
              </div>
            </div>

            <ol className="mt-6 space-y-3 text-sm text-zinc-400">
              <ProvisioningStep
                complete={lab.status !== 'queued'}
                label="Reserve backend capacity"
              />
              <ProvisioningStep
                complete={lab.status === 'provisioning' && (progressPct ?? 0) >= 60}
                active={lab.status === 'provisioning'}
                label="Boot environment and attach networking"
              />
              <ProvisioningStep
                complete={lab.status === 'provisioning' && Boolean(lab.web_url)}
                active={
                  lab.status === 'provisioning' &&
                  !lab.web_url &&
                  (progressPct ?? 0) >= 60
                }
                label="Deliver browser connection details"
              />
            </ol>
          </div>
        </div>
      );
    }

    if (isRunning && isWebLab) {
      return (
        <div className="flex flex-1 min-h-0 flex-col">
          {template.protocol === 'novnc' && (
            <div className="border-b border-white/10 bg-zinc-950/80 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                  VM Clipboard
                </span>
                <button
                  type="button"
                  onClick={() => void handlePasteToVm()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:bg-zinc-800 hover:text-white"
                  title="Read from your clipboard and send it into the VM"
                >
                  {clipboardNotice?.tone === 'success' &&
                  clipboardNotice.message.includes('sent') ? (
                    <>
                      <ClipboardCheck size={12} className="text-green-400" />
                      Pasted to VM
                    </>
                  ) : (
                    <>
                      <Clipboard size={12} />
                      Paste to VM
                    </>
                  )}
                </button>

                {vmClipboard && (
                  <button
                    type="button"
                    onClick={() => void handleCopyVmClipboard()}
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-left text-xs text-zinc-400 transition hover:border-white/20 hover:bg-zinc-800 hover:text-white"
                    title="Copy the VM clipboard text to your system clipboard"
                  >
                    <span className="mr-2 text-zinc-500">VM copied:</span>
                    <span className="truncate">{vmClipboard}</span>
                  </button>
                )}
              </div>

              {clipboardNotice && (
                <InlineNotice tone={clipboardNotice.tone} className="mt-2">
                  {clipboardNotice.message}
                </InlineNotice>
              )}
            </div>
          )}

          <div className="border-b border-white/10 bg-black/30 px-4 py-2.5 text-xs text-zinc-400">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    vmFrameState === 'ready'
                      ? 'bg-green-400'
                      : vmFrameState === 'error'
                      ? 'bg-red-400'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <span>
                  {vmFrameState === 'ready'
                    ? 'Browser client loaded'
                    : vmFrameState === 'error'
                    ? 'Browser client failed to load'
                    : 'Connecting browser client'}
                </span>
              </div>
              <span className="text-zinc-500">
                If the screen stays gray for too long, refresh status before relaunching.
              </span>
            </div>
          </div>

            <div className="relative flex-1 min-h-[520px] bg-[#09090b]">
            {vmEmbedUrl ? (
              <iframe
                ref={iframeRef}
                src={vmEmbedUrl}
                className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${
                  vmFrameState === 'ready' ? 'opacity-100' : 'opacity-30'
                }`}
                title={`${template.name} workspace`}
                allow="clipboard-read; clipboard-write"
                aria-busy={vmFrameState !== 'ready'}
                onLoad={() => setVmFrameState('ready')}
                onError={() => setVmFrameState('error')}
              />
            ) : null}

            {vmFrameState !== 'ready' && (
              <div className="absolute inset-0 flex items-center justify-center px-6">
                <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/75 p-6 text-center shadow-2xl backdrop-blur">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-accent/20 bg-red-accent/10 text-red-accent">
                    {vmFrameState === 'error' ? (
                      <AlertTriangle size={26} />
                    ) : (
                      <Loader2 size={26} className="animate-spin" />
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    {vmFrameState === 'error'
                      ? 'Unable to attach browser session'
                      : template.protocol === 'novnc'
                      ? 'Connecting to your VM desktop'
                      : 'Loading lab workspace'}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    {vmFrameState === 'error'
                      ? 'The lab may still be booting in the background. Refresh the status first, then relaunch if needed.'
                      : template.protocol === 'novnc'
                      ? 'The client is loading and the VM may still be completing its startup sequence.'
                      : 'The browser workspace is starting. This can take a moment while the backend finishes booting.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleRefresh()}
                    disabled={refreshing}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {refreshing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    Refresh status
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (isRunning) {
      return (
        <div className="flex flex-1 min-h-0 flex-col">
          <div className={`min-h-0 ${hasWebPreview && webPreviewOpen ? 'h-[60%]' : 'flex-1'}`}>
            <XtermTerminal labId={lab.id} accessToken={accessToken} />
          </div>

          {hasWebPreview && (
            <div className="flex flex-col border-t border-white/10">
              <button
                    type="button"
                    onClick={() => setWebPreviewOpen((open) => !open)}
                    aria-expanded={webPreviewOpen}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-zinc-400 transition hover:bg-white/5 hover:text-white"
                  >
                    {webPreviewOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    <Globe size={14} />
                    Web Preview
                    <span className="text-zinc-600 ml-1">(target service)</span>
              </button>

              {webPreviewOpen && lab.web_url && (
                <iframe
                  src={buildAuthedLabUrl(lab.web_url, accessToken)}
                  className="w-full border-0"
                  style={{ height: '40vh', minHeight: '220px' }}
                  title="Web Preview"
                />
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <WorkspacePlaceholder
        icon={<Loader2 size={40} className="animate-spin" />}
        title="Stopping lab environment"
        description="Cleaning up running services, containers, and networks."
      />
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="glass overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Link
              to="/labs"
              className="mt-0.5 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              aria-label="Back to labs"
            >
              <ArrowLeft size={20} />
            </Link>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-accent/20 bg-red-accent/10 text-2xl shadow-[0_0_30px_rgba(229,53,53,0.12)]">
              <LabTemplateIcon template={template} size={30} />
            </div>

            <div className="min-w-0 space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-accent/80">
                  Lab workspace
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold text-white sm:text-2xl">
                    {template.name}
                  </h1>
                  <ProtocolBadge
                    label={protocolPresentation.label}
                    className={protocolPresentation.badgeClass}
                  />
                </div>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-zinc-300">
                  {template.protocol === 'novnc'
                    ? 'Browser-connected VM desktop'
                    : 'Interactive guided lab workspace'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-zinc-300">
                  {template.xp_reward} XP reward
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-zinc-400">
                  Session status refreshes automatically
                </span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[320px]">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <SessionMetric
                label="Protocol"
                value={protocolPresentation.label}
                muted={false}
              />
              <SessionMetric label="Reward" value={`${template.xp_reward} XP`} muted={false} />
              <SessionMetric
                label="Session"
                value={lab ? getReadableStatus(lab.status) : 'Not started'}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {lab && (
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Refresh
                </button>
              )}

              {isRunning && ttl && (
                <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-300">
                  <Clock size={14} />
                  {ttl}
                </span>
              )}

              {lab && (
                <StatusBadge status={lab.status} queuePosition={lab.queue_position} />
              )}

              {!lab || lab.status === 'stopped' || lab.status === 'failed' ? (
                <button
                  type="button"
                  onClick={() => void handleStart()}
                  disabled={starting}
                  className="btn-red inline-flex items-center gap-2 !px-4 !py-2 text-sm"
                >
                  {starting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Play size={16} />
                  )}
                  {starting ? 'Starting…' : launchButtonLabel}
                </button>
              ) : lab.status === 'queued' || lab.status === 'provisioning' ? (
                <button
                  type="button"
                  onClick={() => void handleStop()}
                  disabled={stopping}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {stopping ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleStop()}
                  disabled={stopping}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {stopping ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Square size={16} />
                  )}
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {bannerCopy && (
        <StatusBanner tone={bannerCopy.tone} title={bannerCopy.title}>
          <p>{bannerCopy.description}</p>
          {bannerCopy.tips.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-zinc-400">
              {bannerCopy.tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </StatusBanner>
      )}

      {error && <InlineNotice tone="error">{error}</InlineNotice>}

      {template.default_credentials &&
        Object.keys(template.default_credentials).length > 0 && (
          <section className="glass p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  Default credentials
                </h2>
                <p className="text-sm text-zinc-500">
                  Use these seeded credentials inside the lab if the scenario calls for
                  them.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(template.default_credentials).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-300 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                  >
                    <span className="text-zinc-500">{key}:</span>{' '}
                    <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs font-mono text-zinc-100">
                      {value}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      <section
        className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]"
        style={{ minHeight: '78vh' }}
      >
        <div className="glass max-h-[80vh] overflow-y-auto p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                <BookOpen size={14} />
                Tutorial
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Step-by-step guidance, hints, and reference material for this lab.
              </p>
            </div>
          </div>
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-a:text-red-accent prose-code:text-amber-accent prose-code:bg-white/5 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {template.tutorial_markdown}
            </ReactMarkdown>
          </div>
        </div>

        <div className="glass flex min-h-[78vh] flex-col overflow-hidden">
          <div className="border-b border-white/10 bg-white/[0.02] px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Workspace
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {template.protocol === 'novnc'
                    ? 'Browser-connected VM desktop with clearer session status feedback.'
                    : 'Interactive lab workspace and connection status.'}
                </p>
              </div>

              {lab && (
                <div className="flex items-center gap-2 text-xs text-zinc-400" aria-live="polite">
                  <span className="text-zinc-500">Live status</span>
                  <StatusBadge status={lab.status} queuePosition={lab.queue_position} />
                </div>
              )}
            </div>
          </div>

          {renderWorkspace()}
        </div>
      </section>
    </div>
  );
}

function XtermTerminal({ labId, accessToken }: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountingRef = useRef(false);

  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const connectWs = useCallback(() => {
    if (unmountingRef.current) return;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setWsStatus('connecting');
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${window.location.host}/ws/ssh/${labId}?token=${encodeURIComponent(accessToken)}`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      if (unmountingRef.current) {
        socket.close();
        return;
      }

      setWsStatus('connected');
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      termRef.current?.writeln('\r\x1b[32mConnected.\x1b[0m');

      if (termRef.current) {
        const { cols, rows } = termRef.current;
        socket.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    };

    socket.onmessage = (event) => {
      termRef.current?.write(event.data);
    };

    socket.onerror = () => {
      if (!unmountingRef.current) {
        setWsStatus('error');
      }
    };

    socket.onclose = () => {
      if (unmountingRef.current) return;

      setWsStatus('disconnected');
      const attempts = reconnectAttemptsRef.current;

      if (attempts < 3) {
        const nextAttempt = attempts + 1;
        const delay = Math.pow(2, attempts) * 1000;

        reconnectAttemptsRef.current = nextAttempt;
        setReconnectAttempts(nextAttempt);
        termRef.current?.writeln(
          `\r\n\x1b[33mDisconnected. Reconnecting in ${delay / 1000}s… (attempt ${nextAttempt}/3)\x1b[0m`,
        );

        reconnectTimerRef.current = setTimeout(connectWs, delay);
      } else {
        setReconnectAttempts(attempts);
        termRef.current?.writeln(
          '\r\n\x1b[31mConnection lost. Max reconnect attempts reached.\x1b[0m',
        );
      }
    };
  }, [accessToken, labId]);

  useEffect(() => {
    unmountingRef.current = false;

    if (containerRef.current && !termRef.current) {
      const term = new XTerm({
        theme: {
          background: '#09090b',
          foreground: '#e4e4e7',
          cursor: '#e4e4e7',
          black: '#18181b',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#f59e0b',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#e4e4e7',
          brightBlack: '#3f3f46',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#fbbf24',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#fafafa',
        },
        fontFamily:
          'JetBrains Mono, Cascadia Code, Fira Code, Consolas, monospace',
        fontSize: 14,
        cursorBlink: true,
        scrollback: 1000,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.open(containerRef.current);
      fitAddon.fit();

      termRef.current = term;
      fitAddonRef.current = fitAddon;

      term.onData((data: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(data);
        }
      });
    }

    connectWs();

    return () => {
      unmountingRef.current = true;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      wsRef.current?.close();
      termRef.current?.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      wsRef.current = null;
    };
  }, [connectWs]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      try {
        fitAddonRef.current?.fit();
        if (termRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          const { cols, rows } = termRef.current;
          wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      } catch {
        // Ignore resize errors during teardown.
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const statusConfig: Record<WsStatus, { dot: string; label: string; detail: string }> = {
    connecting: {
      dot: 'bg-amber-400 animate-pulse',
      label: 'Connecting',
      detail: 'Opening WebSocket session',
    },
    connected: {
      dot: 'bg-green-400',
      label: 'Connected',
      detail: 'Shell input is live',
    },
    disconnected: {
      dot: 'bg-red-500',
      label: 'Disconnected',
      detail: 'Trying to recover terminal connection',
    },
    error: {
      dot: 'bg-red-500',
      label: 'Error',
      detail: 'The terminal client hit a connection problem',
    },
  };

  const status = statusConfig[wsStatus];
  const showReconnectButton =
    (wsStatus === 'disconnected' || wsStatus === 'error') && reconnectAttempts >= 3;

  const handleManualReconnect = () => {
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    wsRef.current?.close();
    connectWs();
  };

  return (
    <div className="flex h-full flex-col bg-[#09090b]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/5 bg-black/50 px-3 py-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
        <span className="text-xs font-medium text-zinc-300">{status.label}</span>
        <span className="text-xs text-zinc-500">{status.detail}</span>

        {showReconnectButton && (
          <button
            type="button"
            onClick={handleManualReconnect}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <RefreshCw size={11} />
            Reconnect
          </button>
        )}
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden" />
    </div>
  );
}

function StatusBadge({
  status,
  queuePosition,
}: {
  status: string;
  queuePosition: number | null;
}) {
  const configs: Record<string, { icon: ReactNode; color: string; label: string }> = {
    queued: {
      icon: <Clock size={12} />,
      color: 'border-amber-500/20 text-amber-300 bg-amber-500/10',
      label: `Queued${queuePosition ? ` #${queuePosition}` : ''}`,
    },
    provisioning: {
      icon: <Loader2 size={12} className="animate-spin" />,
      color: 'border-blue-500/20 text-blue-300 bg-blue-500/10',
      label: 'Provisioning',
    },
    running: {
      icon: <CheckCircle2 size={12} />,
      color: 'border-green-500/20 text-green-300 bg-green-500/10',
      label: 'Running',
    },
    stopping: {
      icon: <Loader2 size={12} className="animate-spin" />,
      color: 'border-zinc-500/20 text-zinc-300 bg-zinc-500/10',
      label: 'Stopping',
    },
    stopped: {
      icon: <Square size={12} />,
      color: 'border-white/10 text-zinc-400 bg-zinc-500/10',
      label: 'Stopped',
    },
    failed: {
      icon: <AlertTriangle size={12} />,
      color: 'border-red-500/20 text-red-300 bg-red-500/10',
      label: 'Failed',
    },
  };

  const config = configs[status] || configs.stopped;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function ProtocolBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  );
}

function StatusBanner({
  tone,
  title,
  children,
}: {
  tone: BannerTone;
  title: string;
  children: ReactNode;
}) {
  const toneClasses: Record<BannerTone, string> = {
    neutral: 'border-white/10 bg-black/20',
    info: 'border-blue-500/20 bg-blue-500/5',
    success: 'border-green-500/20 bg-green-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    danger: 'border-red-500/20 bg-red-500/5',
  };

  return (
    <section className={`glass border p-4 sm:p-5 ${toneClasses[tone]}`} aria-live="polite">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">{title}</h2>
      <div className="mt-2 text-sm text-zinc-300">{children}</div>
    </section>
  );
}

function InlineNotice({
  tone,
  children,
  className = '',
}: {
  tone: NoticeTone;
  children: ReactNode;
  className?: string;
}) {
  const toneClasses: Record<NoticeTone, string> = {
    info: 'border-blue-500/20 bg-blue-500/10 text-blue-100',
    success: 'border-green-500/20 bg-green-500/10 text-green-100',
    error: 'border-red-500/20 bg-red-500/10 text-red-100',
  };

  return (
    <div
      className={`glass rounded-xl border px-3 py-2.5 text-sm ${toneClasses[tone]} ${className}`.trim()}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

function WorkspacePlaceholder({
  icon,
  title,
  description,
  tone = 'neutral',
  actions,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: BannerTone;
  actions?: ReactNode;
}) {
  const toneClasses: Record<BannerTone, string> = {
    neutral: 'text-zinc-500',
    info: 'text-blue-300',
    success: 'text-green-300',
    warning: 'text-amber-300',
    danger: 'text-red-300',
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(229,53,53,0.06),transparent_45%)] p-6">
      <div className="max-w-md rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] ${toneClasses[tone]}`}>
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{description}</p>
        {actions ? <div className="mt-5">{actions}</div> : null}
      </div>
    </div>
  );
}

function SessionMetric({
  label,
  value,
  muted = true,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>
      <p className={`mt-2 text-sm font-medium ${muted ? 'text-zinc-300' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

function ProvisioningStep({
  label,
  complete = false,
  active = false,
}: {
  label: string;
  complete?: boolean;
  active?: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          complete
            ? 'bg-green-400'
            : active
            ? 'bg-amber-400 animate-pulse'
            : 'bg-zinc-700'
        }`}
      />
      <span className={complete ? 'text-zinc-200' : 'text-zinc-400'}>{label}</span>
    </li>
  );
}
