import type React from 'react';
import type { Order } from '../../../shared/types';
import { useUIStore } from '../../../shared/store';
import { Avatar, cn } from '../../../shared/ui';
import { StatusPill, daysSince, dueDateOf, formatMoney, needsAttentionFrom } from '../../../shared/orderStatus';
import { AlertTriangle, Clock, MessageSquare, CalendarClock } from 'lucide-react';

/** Compact order card used by the Pipeline and Workload boards. */
export function OrderCard({
  order,
  now,
  showStatus = false,
  draggable,
  onDragStart,
}: {
  order: Order;
  now: number;
  showStatus?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const currentUser = useUIStore((s) => s.currentUser);
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const selectedOrderId = useUIStore((s) => s.selectedOrderId);

  const isDesigner = currentUser?.role === 'designer';
  const isSelected = selectedOrderId === order.id;
  const mine = needsAttentionFrom(order, currentUser);
  const overdue = order.status !== 'COMPLETED' && order.status !== 'DELIVERED' && dueDateOf(order) < now;
  const revisions = order.revisions?.length ?? 0;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={() => setSelectedOrder(order, 'side')}
      className={cn(
        'group relative p-2.5 rounded-md bg-surface border cursor-pointer transition-colors hover:border-line-strong',
        isSelected ? 'border-accent ring-2 ring-accent/15' : mine ? 'border-accent/40' : 'border-line',
        draggable && 'active:cursor-grabbing'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-faint tabular-nums">{order.orderNumber}</span>
        {mine && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-accent-deep bg-accent-soft px-1.5 py-0.5 rounded">
            Your move
          </span>
        )}
      </div>

      <h4 className="mt-0.5 text-[13px] font-medium text-ink leading-snug line-clamp-2">{order.title}</h4>
      <p className="text-xs text-muted truncate">{order.client_name}</p>

      {order.status === 'RETURNED_TO_AGENT' && order.escalation_note && (
        <div className="mt-2 flex gap-1.5 text-xs text-rose-700 bg-rose-50 rounded-lg px-2 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span className="line-clamp-2">{order.escalation_note}</span>
        </div>
      )}

      {showStatus && (
        <div className="mt-2.5">
          <StatusPill status={order.status} size="sm" />
        </div>
      )}

      <div className="mt-2 flex items-center gap-2.5 text-[11px] text-muted">
        {order.assigned_designer_name ? (
          <Avatar size="xs" name={order.assigned_designer_name} initials={order.assigned_designer_initials} />
        ) : (
          <span className="w-5 h-5 rounded-full border border-dashed border-line-strong" title="No designer yet" />
        )}
        <span className={cn('flex items-center gap-1', overdue && 'text-rose-600 font-semibold')} title="Due date">
          {overdue ? <CalendarClock className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          {overdue ? 'Overdue' : `${daysSince(order.created_at, now)}d`}
        </span>
        {revisions > 0 && (
          <span className="flex items-center gap-1" title="Revision notes">
            <MessageSquare className="w-3.5 h-3.5" />
            {revisions}
          </span>
        )}
        {!isDesigner && <span className="ml-auto font-medium text-ink-muted tabular-nums">{formatMoney(order.agreed_price)}</span>}
      </div>
    </div>
  );
}
