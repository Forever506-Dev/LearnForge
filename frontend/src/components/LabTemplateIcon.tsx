import type { CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import { FaLinux, FaUbuntu, FaWindows } from 'react-icons/fa';
import { SiKalilinux } from 'react-icons/si';
import { Globe, KeyRound, ShieldAlert } from 'lucide-react';
import type { LabTemplateSummary } from '../types';

type TemplateIconEntry = {
  icon: IconType | typeof Globe;
  color: string;
  label: string;
};

const TEMPLATE_ICON_MAP: Record<string, TemplateIconEntry> = {
  windows11: { icon: FaWindows, color: '#3B82F6', label: 'Windows 11' },
  'ubuntu-desktop': { icon: FaUbuntu, color: '#E95420', label: 'Ubuntu Desktop' },
  'kali-linux': { icon: SiKalilinux, color: '#5FA2DB', label: 'Kali Linux' },
  'parrot-os': { icon: FaLinux, color: '#14B8A6', label: 'Parrot OS' },
  dvwa: { icon: Globe, color: '#38BDF8', label: 'DVWA' },
  'juice-shop': { icon: Globe, color: '#F97316', label: 'OWASP Juice Shop' },
  shellshock: { icon: ShieldAlert, color: '#EF4444', label: 'ShellShock' },
  'vuln-ssh': { icon: KeyRound, color: '#A78BFA', label: 'Privilege Escalation' },
};

interface LabTemplateIconProps {
  template?: Pick<LabTemplateSummary, 'slug' | 'name' | 'icon'> | null;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export default function LabTemplateIcon({
  template,
  size = 28,
  className,
  style,
}: LabTemplateIconProps) {
  const entry = template?.slug ? TEMPLATE_ICON_MAP[template.slug] : undefined;

  if (!entry) {
    return (
      <span aria-hidden="true" className={className} style={style}>
        {template?.icon || '🔬'}
      </span>
    );
  }

  const Icon = entry.icon;

  return (
    <Icon
      aria-hidden="true"
      size={size}
      className={className}
      style={{ color: entry.color, ...style }}
      title={entry.label}
    />
  );
}
