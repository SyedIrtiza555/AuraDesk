import type { Order } from '../../../shared/types';
import { useUIStore } from '../../../shared/store';
import { Avatar, cn } from '../../../shared/ui';
import { useNow } from '../../../shared/hooks';
import { STATUS_META, StatusPill, daysSince, formatMoney, needsAttentionFrom } from '../../../shared/orderStatus';
import { Clock } from 'lucide-react';

export function CardsGridView({ orders }: { orders: Order[] }) {
  const currentUser = useUIStore((s) => s.currentUser);
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const selectedOrderId = useUIStore((s) => s.selectedOrderId);
  const now = useNow();
  const isDesigner = currentUser?.role === 'designer';

  return (
    <div className="h-full overflow-y-auto scrollbar-thin -mx-1 px-1 pb-2">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {orders.map((order) => {
          const isSelected = selectedOrderId === order.id;
          const mine = needsAttentionFrom(order, currentUser);

          return (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order, 'side')}
              className={cn(
                'group relative text-left bg-surface rounded-2xl border overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-pop',
                isSelected ? 'border-ink ring-2 ring-aura' : mine ? 'border-aura ring-1 ring-aura' : 'border-line shadow-card'
              )}
            >
              <div className={cn('h-1.5', STATUS_META[order.status].bar)} />
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-faint tabular-nums">{order.orderNumber}</span>
                  <StatusPill status={order.status} size="sm" />
                </div>
                <h3 className="mt-2.5 font-display text-lg leading-snug text-ink line-clamp-2">{order.title}</h3>
                <p className="mt-0.5 text-[13px] text-muted">{order.client_name}</p>
                <p className="mt-3 text-[13px] text-ink-muted leading-relaxed line-clamp-3 flex-1">{order.project_brief}</p>

                <div className="mt-4 pt-3 border-t border-line/70 flex items-center gap-2.5 text-xs text-muted">
                  {order.assigned_designer_name ? (
                    <>
                      <Avatar size="xs" name={order.assigned_designer_name} initials={order.assigned_designer_initials} />
                      <span className="truncate">{order.assigned_designer_name}</span>
                    </>
                  ) : (
                    <span className="text-faint">No designer yet</span>
                  )}
                  <span className="flex items-center gap-1 ml-auto shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {daysSince(order.created_at, now)}d
                  </span>
                  {!isDesigner && (
                    <span className="font-semibold text-ink tabular-nums shrink-0">{formatMoney(order.agreed_price)}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
