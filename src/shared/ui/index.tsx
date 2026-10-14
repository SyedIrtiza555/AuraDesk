import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Button
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none select-none active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary:
        'bg-[#1C1D21] hover:bg-[#2D2E33] text-white shadow-sm shadow-black/10',
      secondary:
        'bg-white/80 hover:bg-white text-[#1C1D21] border border-slate-200/80 shadow-xs',
      outline:
        'border border-slate-300/80 hover:bg-white text-[#1C1D21] hover:border-slate-400',
      danger:
        'bg-rose-600 hover:bg-rose-500 text-white shadow-xs',
      ghost:
        'hover:bg-slate-200/50 text-[#6B7280] hover:text-[#1C1D21]',
    };

    const sizes = {
      sm: 'px-2.5 py-1 text-xs gap-1.5',
      md: 'px-3.5 py-1.5 text-xs gap-2',
      lg: 'px-4 py-2 text-sm gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// Input
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-1.5 bg-white/80 border border-slate-200/80 rounded-xl text-[#1C1D21] placeholder:text-[#9CA3AF] text-xs focus:outline-none focus:border-[#1C1D21] focus:ring-1 focus:ring-[#1C1D21] transition-all',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-[11px] text-rose-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// Badge
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const styles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
    purple: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border select-none',
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
