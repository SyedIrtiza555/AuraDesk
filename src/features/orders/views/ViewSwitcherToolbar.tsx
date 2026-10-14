import React from 'react';
import { useUIStore } from '../../../shared/store';
import type { OrderViewMode } from '../../../shared/types';
import {
  Table2,
  Kanban,
  Users2,
  LayoutGrid,
  Calendar,
} from 'lucide-react';

interface ViewOption {
  id: OrderViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const VIEW_OPTIONS: ViewOption[] = [
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'kanban_status', label: 'Pipeline', icon: Kanban },
  { id: 'kanban_resource', label: 'Workload', icon: Users2 },
  { id: 'cards', label: 'Bento Grid', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

export function ViewSwitcherToolbar() {
  const activeViewMode = useUIStore((s) => s.activeViewMode);
  const setActiveViewMode = useUIStore((s) => s.setActiveViewMode);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
      {/* Glassmorphic floating navigation pill dock just above the bottom edge */}
      <nav className="glass-floating px-2 py-1.5 rounded-full shadow-2xl flex items-center gap-1 border border-white/90">
        {VIEW_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = activeViewMode === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => setActiveViewMode(opt.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all select-none cursor-pointer ${
                isActive
                  ? 'bg-[#1C1D21] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#1C1D21] hover:bg-white/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
