import {
  Inbox,
  Undo2,
  UserCheck,
  Hammer,
  Eye,
  RotateCcw,
  Send,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react';
import type { Order, OrderStatus, UserProfile, UserRole } from './types';
import { cn } from './ui';

type Actor = 'admin' | 'sales_agent' | 'designer' | null;

export interface StatusMeta {
  label: string;
  /** One line telling people what this stage means and who moves it forward. */
  hint: string;
  icon: LucideIcon;
  /** Who acts next on an order in this status. */
  actor: Actor;
  pill: string;
  dot: string;
  bar: string;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  SUBMITTED_TO_ADMIN: {
    label: 'New intake',
    hint: 'Waiting for an admin to assign a designer.',
    icon: Inbox,
    actor: 'admin',
    pill: 'bg-sky-50 text-sky-800 ring-sky-200',
    dot: 'bg-sky-500',
    bar: 'bg-sky-400',
  },
  RETURNED_TO_AGENT: {
    label: 'Needs info',
    hint: 'Sent back to the sales agent to clarify with the client.',
    icon: Undo2,
    actor: 'sales_agent',
    pill: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
    bar: 'bg-rose-400',
  },
  ASSIGNED_TO_DESIGNER: {
    label: 'Assigned',
    hint: 'A designer has it and can start production.',
    icon: UserCheck,
    actor: 'designer',
    pill: 'bg-violet-50 text-violet-800 ring-violet-200',
    dot: 'bg-violet-500',
    bar: 'bg-violet-400',
  },
  IN_PRODUCTION: {
    label: 'In production',
    hint: 'The designer is working on the CAD.',
    icon: Hammer,
    actor: 'designer',
    pill: 'bg-copper-soft text-copper-deep ring-copper/40',
    dot: 'bg-copper',
    bar: 'bg-copper',
  },
  ADMIN_REVIEW: {
    label: 'In review',
    hint: 'An admin is checking the design.',
    icon: Eye,
    actor: 'admin',
    pill: 'bg-amber-50 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
    bar: 'bg-amber-400',
  },
  IN_REVISION: {
    label: 'Revision',
    hint: 'Changes requested; back with the designer.',
    icon: RotateCcw,
    actor: 'designer',
    pill: 'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200',
    dot: 'bg-fuchsia-500',
    bar: 'bg-fuchsia-400',
  },
  DELIVERED: {
    label: 'Delivered',
    hint: 'Sent to the client on WhatsApp; an admin closes it out.',
    icon: Send,
    actor: 'admin',
    pill: 'bg-teal-50 text-teal-800 ring-teal-200',
    dot: 'bg-teal-500',
    bar: 'bg-teal-400',
  },
  COMPLETED: {
    label: 'Completed',
    hint: 'Done and closed.',
    icon: BadgeCheck,
    actor: null,
    pill: 'bg-aura-soft text-aura-deep ring-aura',
    dot: 'bg-aura-deep',
    bar: 'bg-aura',
  },
};

/** The main path an order travels (RETURNED_TO_AGENT is a detour off intake). */
export const PIPELINE: OrderStatus[] = [
  'SUBMITTED_TO_ADMIN',
  'ASSIGNED_TO_DESIGNER',
  'IN_PRODUCTION',
  'ADMIN_REVIEW',
  'IN_REVISION',
  'DELIVERED',
  'COMPLETED',
];

export const ALL_STATUSES: OrderStatus[] = [
  'SUBMITTED_TO_ADMIN',
  'RETURNED_TO_AGENT',
  'ASSIGNED_TO_DESIGNER',
  'IN_PRODUCTION',
  'ADMIN_REVIEW',
  'IN_REVISION',
  'DELIVERED',
  'COMPLETED',
];

export const isAdminRole = (role?: UserRole) => role === 'admin' || role === 'owner';

/** True when the order is waiting on this user specifically. */
export function needsAttentionFrom(order: Order, user: UserProfile | null): boolean {
  if (!user) return false;
  const actor = STATUS_META[order.status].actor;
  if (actor === 'admin') return isAdminRole(user.role);
  if (actor === 'sales_agent') return user.role === 'sales_agent' && order.sales_agent_id === user.uid;
  if (actor === 'designer') return user.role === 'designer' && order.assigned_designer_id === user.uid;
  return false;
}

export function StatusPill({
  status,
  size = 'md',
  className,
}: {
  status: OrderStatus;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      title={meta.hint}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        meta.pill,
        className
      )}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {meta.label}
    </span>
  );
}

export const daysSince = (ts: number, now: number) => Math.max(0, Math.floor((now - ts) / 86400000));

export const formatMoney = (amount?: number) =>
  (amount || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const dueDateOf = (order: Order) => order.due_date || order.created_at + 86400000 * 5;
