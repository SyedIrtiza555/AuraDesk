import { cn } from './primitives';

/** The Aura Desk mark: a simple gem outline on an indigo tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-md bg-accent text-white shrink-0', className)}>
      <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
        <path d="M6 4h12l4 5-10 11L2 9z" />
        <path d="M2 9h20M9 4l3 16 3-16" strokeWidth="1.6" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="text-[14px] font-semibold tracking-tight text-ink">Aura Desk</span>
    </span>
  );
}
