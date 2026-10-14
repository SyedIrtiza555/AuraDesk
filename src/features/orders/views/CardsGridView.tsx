import type { Order } from '../../../shared/types';
import { useUIStore } from '../../../shared/store';
import { Avatar, cn } from '../../../shared/ui';
import { useNow } from '../../../shared/hooks';
import { StatusPill, daysSince, formatMoney, needsAttentionFrom } from '../../../shared/orderStatus';
import { Clock } from 'lucide-react';

export function CardsGridView({ orders }: { orders: Order[] }) {
  const currentUser = useUIStore((s) => s.currentUser);
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const selectedOrderId = useUIStore((s) => s.selectedOrderId);
  const now = useNow();
  const isDesigner = currentUser?.role === 'designer';

  return (
    <div className="h-full overflow-y-auto scrollbar-thin -mx-1 px-1 pb-2">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
        {orders.map((order) => {
          const isSelected = selectedOrderId === order.id;
          const mine = needsAttentionFrom(order, currentUser);

          return (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order, 'side')}
              className={cn(
                'group relative text-left bg-surface rounded-lg border overflow-hidden flex flex-col transition-all hover:border-line-strong',
                isSelected ? 'border-accent ring-2 ring-accent/15' : mine ? 'border-accent/40' : 'border-line'
              )}
            >
              
              <div className="p-3.5 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-faint tabular-nums">{order.orderNumber}</span>
                  <StatusPill status={order.status} size="sm" />
                </div>
                <h3 className="mt-2 text-[14px] font-semibold leading-snug text-ink line-clamp-2">{order.title}</h3>
                <p className="mt-0.5 text-[13px] text-muted">{order.client_name}</p>
                <p className="mt-2 text-xs text-muted leading-relaxed line-clamp-3 flex-1">{order.project_brief}</p>

                <div className="mt-3 pt-2.5 border-t border-line flex items-center gap-2.5 text-xs text-muted">
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
                    <span className="font-medium text-ink tabular-nums shrink-0">{formatMoney(order.agreed_price)}</span>
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
