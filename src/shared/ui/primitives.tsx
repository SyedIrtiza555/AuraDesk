import React, { useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-ink text-white hover:bg-ink-soft',
  accent: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-muted shadow-card',
  outline: 'border border-line-strong text-ink hover:bg-surface-muted',
  ghost: 'text-muted hover:text-ink hover:bg-ink/[0.04]',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500',
};

const BUTTON_SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  lg: 'h-9 px-4 text-[13px] gap-2 rounded-md',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors select-none disabled:opacity-45',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner className="w-3.5 h-3.5" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

// ---------------------------------------------------------------------------
// IconButton
// ---------------------------------------------------------------------------
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: 'default' | 'danger' | 'success';
  size?: 'sm' | 'md';
  active?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, tone = 'default', size = 'md', active, className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors shrink-0 disabled:opacity-40',
        size === 'sm' ? 'w-6 h-6' : 'w-7 h-7',
        tone === 'default' && 'text-muted hover:text-ink hover:bg-ink/[0.05]',
        tone === 'danger' && 'text-muted hover:text-rose-600 hover:bg-rose-50',
        tone === 'success' && 'text-muted hover:text-emerald-700 hover:bg-emerald-50',
        active && 'bg-ink/[0.06] text-ink',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
IconButton.displayName = 'IconButton';

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------
const FIELD_BASE =
  'w-full bg-surface border border-line-strong rounded-md text-ink placeholder:text-faint text-[13px] transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:bg-surface-muted disabled:text-muted';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, ...props }, ref) => (
    <div className="w-full">
      <div className="relative">
        {icon && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none [&>svg]:w-3.5 [&>svg]:h-3.5">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            FIELD_BASE,
            'h-8 px-2.5',
            icon && 'pl-8',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(FIELD_BASE, 'px-2.5 py-2 leading-relaxed resize-none', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(FIELD_BASE, 'h-8 px-2 pr-7 cursor-pointer', className)} {...props} />
  )
);
Select.displayName = 'Select';

export function Field({
  label,
  hint,
  icon,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted mb-1 [&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:text-faint">
        {icon}
        {label}
      </span>
      {children}
      {hint && <span className="block mt-1 text-xs text-muted">{hint}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'accent' | 'ink';
}

const BADGE_STYLES: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-surface-muted text-ink-muted ring-line',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200',
  accent: 'bg-accent-soft text-accent-deep ring-accent/20',
  ink: 'bg-ink/[0.06] text-ink ring-transparent',
};

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', children, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-1.5 py-px rounded text-[11px] font-medium ring-1 ring-inset whitespace-nowrap',
      BADGE_STYLES[variant],
      className
    )}
    {...props}
  >
    {children}
  </span>
);

// ---------------------------------------------------------------------------
// Surfaces & feedback
// ---------------------------------------------------------------------------
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-surface border border-line rounded-lg', className)} {...props} />;
}

export function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted [&>svg]:w-3.5 [&>svg]:h-3.5">
      {icon}
      {children}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin opacity-70', className)}
    />
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center h-[18px] px-1 rounded border border-line bg-surface-muted text-[10px] font-medium text-faint font-sans">
      {children}
    </kbd>
  );
}

const AVATAR_TONES = [
  'bg-indigo-100 text-indigo-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
];

export function Avatar({
  name,
  initials,
  size = 'md',
  className,
}: {
  name?: string;
  initials?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const label = (initials || name || '?').slice(0, 2).toUpperCase();
  const seed = (name || label).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return (
    <span
      title={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold shrink-0',
        AVATAR_TONES[seed % AVATAR_TONES.length],
        size === 'xs' && 'w-5 h-5 text-[9px]',
        size === 'sm' && 'w-6 h-6 text-[10px]',
        size === 'md' && 'w-7 h-7 text-[11px]',
        size === 'lg' && 'w-9 h-9 text-xs',
        className
      )}
    >
      {label}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      {icon && <div className="text-faint mb-3 [&>svg]:w-6 [&>svg]:h-6">{icon}</div>}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 text-[13px] text-muted max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SegmentedControl
// ---------------------------------------------------------------------------
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-px p-0.5 rounded-md bg-ink/[0.05]', className)} role="tablist">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={opt.label || undefined}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded font-medium transition-colors whitespace-nowrap',
              size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-[13px]',
              active ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
const MODAL_TONES = {
  default: 'text-muted',
  accent: 'text-accent',
  warning: 'text-amber-600',
  success: 'text-emerald-600',
  danger: 'text-rose-600',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  tone = 'default',
  size = 'md',
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: keyof typeof MODAL_TONES;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-ink/20 animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full bg-surface rounded-xl border border-line shadow-pop flex flex-col max-h-[80vh] overflow-hidden animate-rise-in',
          size === 'sm' && 'max-w-sm',
          size === 'md' && 'max-w-md',
          size === 'lg' && 'max-w-xl',
          size === 'xl' && 'max-w-3xl'
        )}
      >
        <div className="flex items-start gap-2.5 px-5 pt-4 pb-3">
          {icon && <div className={cn('mt-0.5 shrink-0 [&>svg]:w-4 [&>svg]:h-4', MODAL_TONES[tone])}>{icon}</div>}
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-ink leading-tight">{title}</h2>
            {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-1.5 -mt-0.5">
            <X className="w-4 h-4" />
          </IconButton>
        </div>
        {children && <div className="px-5 pb-4 overflow-y-auto">{children}</div>}
        {footer && (
          <div className="px-5 py-3 border-t border-line flex items-center justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
