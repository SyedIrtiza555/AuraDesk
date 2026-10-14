import { useState } from 'react';
import type { Order } from '../../../shared/types';
import { useUIStore } from '../../../shared/store';
import { Button, IconButton, SegmentedControl, cn } from '../../../shared/ui';
import { useNow } from '../../../shared/hooks';
import { STATUS_META, dueDateOf } from '../../../shared/orderStatus';
import { ChevronLeft, ChevronRight, CalendarClock, History } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_PER_DAY = 2;

/** Due dates, or what happened when (created / delivered / completed). */
type Mode = 'due' | 'milestones';

const milestoneDate = (o: Order) => o.completed_at || o.delivered_at || o.created_at;

export function CalendarView({ orders }: { orders: Order[] }) {
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const selectedOrderId = useUIStore((s) => s.selectedOrderId);
  const now = useNow();

  const [mode, setMode] = useState<Mode>('due');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const today = new Date(now);

  const ordersOn = (day: number) =>
    orders.filter((o) => {
      const d = new Date(mode === 'due' ? dueDateOf(o) : milestoneDate(o));
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  return (
    <div className="h-full border border-line rounded-lg flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-line flex items-center gap-1.5">
        <IconButton label="Previous month" onClick={() => setCursor(new Date(year, month - 1, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </IconButton>
        <h2 className="text-[14px] font-semibold text-ink w-36 text-center">
          {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h2>
        <IconButton label="Next month" onClick={() => setCursor(new Date(year, month + 1, 1))}>
          <ChevronRight className="w-4 h-4" />
        </IconButton>
        <Button
          variant="secondary"
          size="sm"
          className="ml-1"
          onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
        >
          Today
        </Button>
        <SegmentedControl
          size="sm"
          className="ml-auto"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'due', label: 'Due dates', icon: CalendarClock },
            { value: 'milestones', label: 'Milestones', icon: History },
          ]}
        />
      </div>

      <div className="grid grid-cols-7 border-b border-line text-xs font-semibold text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-3 py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
        {Array.from({ length: cells }, (_, i) => {
          const day = i - firstDay + 1;
          const inMonth = day >= 1 && day <= daysInMonth;
          const isToday =
            inMonth && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const dayOrders = inMonth ? ordersOn(day) : [];

          return (
            <div
              key={i}
              className={cn(
                'min-h-[80px] p-1.5 border-r border-b border-line/70 [&:nth-child(7n)]:border-r-0 flex flex-col gap-1',
                !inMonth && 'bg-surface-muted/60'
              )}
            >
              {inMonth && (
                <span
                  className={cn(
                    'self-start text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center',
                    isToday ? 'bg-accent text-white' : 'text-muted'
                  )}
                >
                  {day}
                </span>
              )}
              <div className="space-y-0.5">
                {(expandedDay === day ? dayOrders : dayOrders.slice(0, MAX_PER_DAY)).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    title={`${o.orderNumber} · ${STATUS_META[o.status].label}`}
                    className={cn(
                      'w-full text-left flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] transition-colors',
                      selectedOrderId === o.id ? 'bg-accent text-white' : 'bg-surface-muted hover:bg-accent-soft text-ink'
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_META[o.status].dot)} />
                    <span className="truncate">{o.title}</span>
                  </button>
                ))}
                {dayOrders.length > MAX_PER_DAY && (
                  <button
                    onClick={() => setExpandedDay(expandedDay === day ? null : day)}
                    title={dayOrders.slice(MAX_PER_DAY).map((o) => o.title).join('\n')}
                    className="w-full text-left px-1.5 text-[11px] text-muted hover:text-accent"
                  >
                    {expandedDay === day ? 'Show less' : `+${dayOrders.length - MAX_PER_DAY} more`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
