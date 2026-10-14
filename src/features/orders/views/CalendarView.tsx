import { useState, useMemo } from 'react';
import type { Order, UserProfile } from '../../../shared/types';
import { useUIStore } from '../../../shared/store';
import { Button } from '../../../shared/ui';
import {
  History,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';

interface CalendarViewProps {
  orders: Order[];
  teamUsers: UserProfile[];
  onUpdateOrder: (updated: Partial<Order>) => Promise<void>;
}

export function CalendarView({ orders }: CalendarViewProps) {
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const selectedOrderId = useUIStore((s) => s.selectedOrderId);

  const [isHistoricalMode, setIsHistoricalMode] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [scrubberDaysAgo, setScrubberDaysAgo] = useState<number>(0);

  const effectiveDate = useMemo(() => {
    if (!isHistoricalMode) return currentDate;
    const d = new Date();
    d.setDate(d.getDate() - scrubberDaysAgo);
    return d;
  }, [isHistoricalMode, currentDate, scrubberDaysAgo]);

  const year = effectiveDate.getFullYear();
  const month = effectiveDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayIndex }, (_, i) => i);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getOrdersForDay = (day: number) => {
    return orders.filter((order) => {
      if (isHistoricalMode) {
        const milestoneDate = new Date(
          order.delivered_at || order.completed_at || order.created_at
        );
        return (
          milestoneDate.getFullYear() === year &&
          milestoneDate.getMonth() === month &&
          milestoneDate.getDate() === day
        );
      }

      const targetDate = new Date(order.due_date || order.created_at + 86400000 * 5);
      return (
        targetDate.getFullYear() === year &&
        targetDate.getMonth() === month &&
        targetDate.getDate() === day
      );
    });
  };

  const monthName = effectiveDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F5F7] overflow-hidden select-none pb-24">
      {/* Header */}
      <div className="p-3 border-b border-slate-200/60 bg-white/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:text-[#1C1D21] hover:bg-slate-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-xs text-[#1C1D21] px-1 font-mono">
            {monthName}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:text-[#1C1D21] hover:bg-slate-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCurrentDate(new Date());
              setScrubberDaysAgo(0);
            }}
            className="text-[11px] py-1 ml-2"
          >
            Today
          </Button>
        </div>

        {/* Historical Time-Machine Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setIsHistoricalMode(false)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              !isHistoricalMode
                ? 'bg-white text-[#1C1D21] shadow-xs'
                : 'text-[#6B7280] hover:text-[#1C1D21]'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Deadlines</span>
          </button>

          <button
            onClick={() => setIsHistoricalMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              isHistoricalMode
                ? 'bg-[#1C1D21] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#1C1D21]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Time-Machine</span>
          </button>
        </div>
      </div>

      {isHistoricalMode && (
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-6 py-2 flex items-center justify-between text-xs text-amber-900">
          <span className="font-medium text-[11px]">
            Scrubbing historical status: {scrubberDaysAgo} days ago
          </span>
          <div className="flex items-center gap-2 w-64">
            <span className="text-[10px] text-amber-600 font-mono">0d</span>
            <input
              type="range"
              min="0"
              max="30"
              value={scrubberDaysAgo}
              onChange={(e) => setScrubberDaysAgo(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-[#1C1D21]"
            />
            <span className="text-[10px] text-amber-600 font-mono">-30d</span>
          </div>
        </div>
      )}

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-slate-200/60 bg-white/40 text-[10px] font-mono font-semibold uppercase text-slate-400 text-center py-1.5">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-y-auto divide-x divide-y divide-slate-200/50 bg-white/40">
        {blanksArray.map((b) => (
          <div key={`blank-${b}`} className="p-1.5 bg-slate-100/40 opacity-40 min-h-[80px]" />
        ))}

        {daysArray.map((day) => {
          const dayOrders = getOrdersForDay(day);
          const isToday =
            new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;

          return (
            <div
              key={`day-${day}`}
              className={`p-1.5 flex flex-col justify-between min-h-[90px] transition-colors hover:bg-white/80 ${
                isToday ? 'bg-indigo-50/40' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[11px] font-mono font-semibold px-1 py-0.5 rounded ${
                    isToday ? 'bg-[#1C1D21] text-white' : 'text-slate-500'
                  }`}
                >
                  {day}
                </span>

                {dayOrders.length > 0 && (
                  <span className="text-[9px] text-slate-400 font-mono">
                    {dayOrders.length}
                  </span>
                )}
              </div>

              <div className="space-y-1 overflow-y-auto max-h-20">
                {dayOrders.map((order) => {
                  const isSelected = selectedOrderId === order.id;

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order, 'side')}
                      className={`p-1 rounded-lg border text-[10px] cursor-pointer transition-all flex flex-col ${
                        isSelected
                          ? 'border-[#1C1D21] bg-white ring-1 ring-[#1C1D21]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="font-mono font-bold text-[#1C1D21]">
                        {order.orderNumber}
                      </span>
                      <span className="text-slate-600 truncate">{order.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
