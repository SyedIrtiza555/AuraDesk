import { useId } from 'react';
import { cn } from './primitives';

/** The Aura Desk mark: a faceted gem set inside a glowing aura ring. */
export function LogoMark({ className, glow = false }: { className?: string; glow?: boolean }) {
  const id = useId();
  return (
    <span className={cn('relative inline-flex items-center justify-center w-9 h-9', className)}>
      {glow && <span className="absolute inset-[-30%] rounded-full bg-aura/50 blur-xl animate-aura-pulse" />}
      <svg viewBox="0 0 40 40" className="relative w-full h-full" aria-hidden>
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#CEE269" />
            <stop offset="100%" stopColor="#DA8F65" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="12" fill="#17161B" />
        <circle cx="20" cy="20" r="12.5" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="2.5" />
        <path d="M20 12.5 L26 18 L20 27.5 L14 18 Z" fill="#CEE269" />
        <path d="M14 18 L26 18 L20 27.5 Z" fill="#9DB33A" />
        <path d="M17 18 L20 12.5 L23 18 Z" fill="#E6F2A6" />
      </svg>
    </span>
  );
}

export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={cn('font-display text-[19px] leading-none', inverse ? 'text-white' : 'text-ink')}>
        Aura <span className="italic text-copper">Desk</span>
      </span>
    </span>
  );
}
