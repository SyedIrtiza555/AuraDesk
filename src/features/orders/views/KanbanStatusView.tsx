import { useState } from 'react';
import type { Order, OrderStatus } from '../../../shared/types';
import { useUIStore } from '../../../shared/store';
import { cn } from '../../../shared/ui';
import { useNow } from '../../../shared/hooks';
import { ALL_STATUSES, STATUS_META, isAdminRole } from '../../../shared/orderStatus';
import { OrderCard } from './OrderCard';

interface KanbanStatusViewProps {
  orders: Order[];
  onUpdateOrder: (updated: Partial<Order>) => Promise<void>;
}

export function KanbanStatusView({ orders, onUpdateOrder }: KanbanStatusViewProps) {
  const currentUser = useUIStore((s) => s.currentUser);
  const now = useNow();
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<OrderStatus | null>(null);

  const canDrag = isAdminRole(currentUser?.role);

  const handleDrop = async (targetStatus: OrderStatus) => {
    setDropTarget(null);
    if (!canDrag || !draggedOrderId) return;
    const order = orders.find((o) => o.id === draggedOrderId);
    setDraggedOrderId(null);
    if (!order || order.status === targetStatus) return;
    await onUpdateOrder({ id: order.id, status: targetStatus, updated_at: Date.now() });
  };

  return (
    <div className="h-full flex gap-3.5 overflow-x-auto pb-2 scrollbar-thin">
      {ALL_STATUSES.map((status) => {
        const meta = STATUS_META[status];
        const Icon = meta.icon;
        const columnOrders = orders.filter((o) => o.status === status);
        const isTarget = dropTarget === status;

        return (
          <div
            key={status}
            onDragOver={(e) => {
              if (!canDrag) return;
              e.preventDefault();
              setDropTarget(status);
            }}
            onDragLeave={() => setDropTarget((t) => (t === status ? null : t))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(status);
            }}
            className={cn(
              'w-[280px] shrink-0 flex flex-col rounded-2xl bg-ink/[0.035] transition-colors',
              isTarget && 'bg-aura-soft ring-2 ring-aura'
            )}
          >
            <div className="px-3.5 pt-3.5 pb-2.5" title={meta.hint}>
              <div className={cn('h-1 rounded-full mb-3', meta.bar)} />
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted" />
                <span className="text-sm font-semibold text-ink flex-1">{meta.label}</span>
                <span className="text-xs font-semibold text-muted bg-surface rounded-full px-2 py-0.5 tabular-nums">
                  {columnOrders.length}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-2.5 scrollbar-thin">
              {columnOrders.length === 0 ? (
                <div className="h-20 rounded-xl border-2 border-dashed border-line flex items-center justify-center text-xs text-faint">
                  {canDrag ? 'Drop an order here' : 'Nothing here'}
                </div>
              ) : (
                columnOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    now={now}
                    draggable={canDrag}
                    onDragStart={(e) => {
                      setDraggedOrderId(order.id);
                      e.dataTransfer.setData('text/plain', order.id);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
