import { useState, useMemo, useEffect } from 'react';
import type { Order } from '../../../shared/types';
import { useUIStore } from '../../../shared/store';
import { Avatar, Kbd, cn } from '../../../shared/ui';
import { copyToClipboard } from '../../../shared/notifications';
import { useNow } from '../../../shared/hooks';
import { ALL_STATUSES, StatusPill, dueDateOf, formatMoney, needsAttentionFrom } from '../../../shared/orderStatus';
import { ArrowUp, ArrowDown, Copy, Check } from 'lucide-react';

type SortField = 'orderNumber' | 'client_name' | 'assigned_designer_name' | 'status' | 'due' | 'agreed_price';

const relativeDue = (due: number, now: number) => {
  const days = Math.round((due - now) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return days > 0 ? `In ${days} days` : `${-days} days late`;
};

export function TableView({ orders }: { orders: Order[] }) {
  const currentUser = useUIStore((s) => s.currentUser);
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const selectedOrderId = useUIStore((s) => s.selectedOrderId);
  const now = useNow();

  const [sortField, setSortField] = useState<SortField>('due');
  const [sortAsc, setSortAsc] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isDesigner = currentUser?.role === 'designer';

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedOrders = useMemo(() => {
    const value = (o: Order): string | number => {
      switch (sortField) {
        case 'due':
          return dueDateOf(o);
        case 'status':
          return ALL_STATUSES.indexOf(o.status);
        case 'agreed_price':
          return o.agreed_price || 0;
        default:
          return (o[sortField] || '').toString().toLowerCase();
      }
    };
    const closed = (o: Order) => o.status === 'COMPLETED' || o.status === 'DELIVERED';
    return [...orders].sort((a, b) => {
      // By due date, finished work sinks below open work
      if (sortField === 'due' && closed(a) !== closed(b)) return closed(a) ? 1 : -1;
      const av = value(a);
      const bv = value(b);
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [orders, sortField, sortAsc]);

  // ↑/↓ moves through the list and opens each order in the detail panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (document.querySelector('[role=dialog]') || sortedOrders.length === 0) return;
      e.preventDefault();
      const idx = sortedOrders.findIndex((o) => o.id === selectedOrderId);
      const next =
        idx < 0 ? 0 : Math.min(sortedOrders.length - 1, Math.max(0, idx + (e.key === 'ArrowDown' ? 1 : -1)));
      setSelectedOrder(sortedOrders[next]);
      document.getElementById(`order-row-${sortedOrders[next].id}`)?.scrollIntoView({ block: 'nearest' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sortedOrders, selectedOrderId, setSelectedOrder]);

  const handleCopy = async (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    await copyToClipboard(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="h-full bg-surface border border-line rounded-lg overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-surface-muted/95 backdrop-blur border-b border-line text-xs text-muted">
            <tr>
              <SortHeader field="orderNumber" label="Order" className="pl-4" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
              <SortHeader field="client_name" label="Client" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
              <SortHeader field="status" label="Status" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
              <SortHeader field="assigned_designer_name" label="Designer" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
              <SortHeader field="due" label="Due" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
              {!isDesigner && <SortHeader field="agreed_price" label="Value" className="text-right pr-4" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />}
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => {
              const isSelected = selectedOrderId === order.id;
              const mine = needsAttentionFrom(order, currentUser);
              const due = dueDateOf(order);
              const open = order.status !== 'COMPLETED' && order.status !== 'DELIVERED';
              const late = open && due < now;

              return (
                <tr
                  key={order.id}
                  id={`order-row-${order.id}`}
                  onClick={() => setSelectedOrder(order)}
                  className={cn(
                    'group border-b border-line/70 last:border-0 cursor-pointer transition-colors',
                    isSelected ? 'bg-accent-soft/60' : 'hover:bg-surface-muted'
                  )}
                >
                  <td className="py-2 pl-4 pr-3 relative w-full min-w-[180px]">
                    {isSelected && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-accent" />}
                    <div className="flex items-center gap-1.5 text-[11px] text-faint tabular-nums">
                      {mine && <span className="w-1.5 h-1.5 rounded-full bg-accent" title="Waiting on you" />}
                      {order.orderNumber}
                      <button
                        onClick={(e) => handleCopy(e, order.orderNumber)}
                        className="opacity-0 group-hover:opacity-100 hover:text-ink transition-opacity"
                        title="Copy order number"
                      >
                        {copiedId === order.orderNumber ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="font-medium text-ink line-clamp-1">{order.title}</div>
                  </td>
                  <td className="py-2 px-3 text-ink-muted whitespace-nowrap">{order.client_name}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <StatusPill status={order.status} size="sm" />
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {order.assigned_designer_name ? (
                      <span className="inline-flex items-center gap-2 text-ink-muted">
                        <Avatar size="xs" name={order.assigned_designer_name} initials={order.assigned_designer_initials} />
                        <span className="hidden xl:inline">{order.assigned_designer_name}</span>
                      </span>
                    ) : (
                      <span className="text-faint">Not assigned</span>
                    )}
                  </td>
                  <td className={cn('py-2 px-3 whitespace-nowrap', late ? 'text-rose-600 font-semibold' : 'text-muted')}>
                    {open
                      ? relativeDue(due, now)
                      : new Date(due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </td>
                  {!isDesigner && (
                    <td className="py-2 pl-3 pr-4 text-right font-medium text-ink tabular-nums whitespace-nowrap">
                      {formatMoney(order.agreed_price)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="h-8 shrink-0 px-4 border-t border-line flex items-center justify-between text-[11px] text-faint">
        <span>
          {sortedOrders.length} order{sortedOrders.length === 1 ? '' : 's'}
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> to browse · <Kbd>Esc</Kbd> to close
        </span>
      </div>
    </div>
  );
}

function SortHeader({
  field,
  label,
  className,
  sortField,
  sortAsc,
  onSort,
}: {
  field: SortField;
  label: string;
  className?: string;
  sortField: SortField;
  sortAsc: boolean;
  onSort: (field: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <th className={cn('py-2 px-3 font-medium', className)}>
      <button onClick={() => onSort(field)} className={cn('inline-flex items-center gap-1 hover:text-ink transition-colors', active && 'text-ink')}>
        {label}
        {active && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    </th>
  );
}
