import type { CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import {
  SiCplusplus,
  SiGo,
  SiJavascript,
  SiLua,
  SiPython,
  SiRust,
  SiTailwindcss,
} from 'react-icons/si';

type SupportedLanguageKey = 'cpp' | 'go' | 'javascript' | 'lua' | 'python' | 'rust' | 'tailwind';

const LANGUAGE_ICONS: Record<SupportedLanguageKey, { icon: IconType; color: string; label: string }> = {
  cpp: { icon: SiCplusplus, color: '#659AD2', label: 'C++' },
  go: { icon: SiGo, color: '#00ADD8', label: 'Go' },
  javascript: { icon: SiJavascript, color: '#F7DF1E', label: 'JavaScript' },
  lua: { icon: SiLua, color: '#2C2D72', label: 'Lua' },
  python: { icon: SiPython, color: '#3776AB', label: 'Python' },
  rust: { icon: SiRust, color: '#DEA584', label: 'Rust' },
  tailwind: { icon: SiTailwindcss, color: '#06B6D4', label: 'Tailwind CSS' },
};

interface LanguageIconProps {
  languageKey?: string | null;
  fallback?: string | null;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export default function LanguageIcon({
  languageKey,
  fallback = '📘',
  size = 28,
  className,
  style,
}: LanguageIconProps) {
  const entry = languageKey ? LANGUAGE_ICONS[languageKey as SupportedLanguageKey] : undefined;

  if (!entry) {
    return (
      <span aria-hidden="true" className={className} style={style}>
        {fallback}
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