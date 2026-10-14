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
    <div className="h-full flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {ALL_STATUSES.map((status) => {
        const meta = STATUS_META[status];
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
              'w-[260px] shrink-0 flex flex-col rounded-lg bg-surface-muted border border-line transition-colors',
              isTarget && 'bg-accent-soft ring-2 ring-accent/30'
            )}
          >
            <div className="px-3 pt-2.5 pb-2" title={meta.hint}>
              
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', meta.dot)} />
                <span className="text-[13px] font-medium text-ink flex-1">{meta.label}</span>
                <span className="text-xs text-faint tabular-nums">
                  {columnOrders.length}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 scrollbar-thin">
              {columnOrders.length === 0 ? (
                <div className="h-14 rounded-md border border-dashed border-line flex items-center justify-center text-xs text-faint">
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
