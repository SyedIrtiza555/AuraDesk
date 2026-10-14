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
  variant?: 'primary' | 'aura' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-ink text-white hover:bg-ink-soft shadow-sm',
  aura: 'bg-aura text-ink hover:brightness-95 shadow-sm font-semibold',
  secondary: 'bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-muted shadow-xs',
  outline: 'border border-line-strong text-ink hover:bg-surface',
  ghost: 'text-muted hover:text-ink hover:bg-ink/5',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm',
};

const BUTTON_SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-all select-none active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100',
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
  tone?: 'default' | 'danger' | 'success' | 'inverse';
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
        'inline-flex items-center justify-center rounded-lg transition-colors shrink-0 disabled:opacity-40',
        size === 'sm' ? 'w-7 h-7' : 'w-8 h-8',
        tone === 'default' && 'text-muted hover:text-ink hover:bg-ink/5',
        tone === 'danger' && 'text-muted hover:text-rose-600 hover:bg-rose-50',
        tone === 'success' && 'text-muted hover:text-emerald-700 hover:bg-emerald-50',
        tone === 'inverse' && 'text-white/60 hover:text-white hover:bg-white/10',
        active && 'bg-surface text-ink shadow-xs',
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
  'w-full bg-surface border border-line rounded-xl text-ink placeholder:text-faint text-sm transition-colors focus:outline-none focus:border-ink focus:ring-2 focus:ring-aura/60 disabled:bg-surface-muted disabled:text-muted';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, ...props }, ref) => (
    <div className="w-full">
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none [&>svg]:w-4 [&>svg]:h-4">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            FIELD_BASE,
            'h-10 px-3.5',
            icon && 'pl-9.5',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-200',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(FIELD_BASE, 'px-3.5 py-2.5 leading-relaxed resize-none', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(FIELD_BASE, 'h-10 px-3 pr-8 cursor-pointer', className)} {...props} />
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
      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted mb-1.5 [&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:text-faint">
        {icon}
        {label}
      </span>
      {children}
      {hint && <span className="block mt-1.5 text-xs text-muted">{hint}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'aura' | 'ink';
}

const BADGE_STYLES: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-surface-muted text-ink-muted ring-line',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  purple: 'bg-violet-50 text-violet-800 ring-violet-200',
  aura: 'bg-aura-soft text-aura-deep ring-aura',
  ink: 'bg-ink text-white ring-ink',
};

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', children, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap',
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
  return <div className={cn('bg-surface border border-line rounded-2xl shadow-card', className)} {...props} />;
}

export function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wide [&>svg]:w-3.5 [&>svg]:h-3.5">
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
    <kbd className="inline-flex items-center h-5 px-1.5 rounded-md border border-line bg-surface-muted text-[10px] font-semibold text-muted font-sans">
      {children}
    </kbd>
  );
}

const AVATAR_TONES = [
  'bg-aura text-ink',
  'bg-copper text-white',
  'bg-amber-200 text-amber-900',
  'bg-sky-200 text-sky-900',
  'bg-violet-200 text-violet-900',
  'bg-emerald-200 text-emerald-900',
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
        size === 'sm' && 'w-7 h-7 text-[10px]',
        size === 'md' && 'w-9 h-9 text-xs',
        size === 'lg' && 'w-12 h-12 text-sm',
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
    <div className={cn('flex flex-col items-center justify-center text-center py-14 px-6', className)}>
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-aura-soft text-aura-deep flex items-center justify-center mb-4 [&>svg]:w-6 [&>svg]:h-6">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
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
    <div className={cn('inline-flex items-center gap-0.5 p-1 rounded-xl bg-ink/[0.05]', className)} role="tablist">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg font-medium transition-all whitespace-nowrap',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
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
  default: 'bg-ink text-aura',
  aura: 'bg-aura text-ink',
  warning: 'bg-amber-100 text-amber-700',
  success: 'bg-emerald-100 text-emerald-700',
  danger: 'bg-rose-100 text-rose-700',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full bg-surface rounded-3xl shadow-pop flex flex-col max-h-[88vh] overflow-hidden animate-rise-in',
          size === 'sm' && 'max-w-md',
          size === 'md' && 'max-w-lg',
          size === 'lg' && 'max-w-2xl',
          size === 'xl' && 'max-w-4xl'
        )}
      >
        <div className="flex items-start gap-3.5 px-6 pt-6 pb-4">
          {icon && (
            <div
              className={cn(
                'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5',
                MODAL_TONES[tone]
              )}
            >
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="font-display text-xl text-ink leading-tight">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
            <X className="w-4.5 h-4.5" />
          </IconButton>
        </div>
        {children && <div className="px-6 pb-5 overflow-y-auto">{children}</div>}
        {footer && (
          <div className="px-6 py-4 bg-surface-muted border-t border-line flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
