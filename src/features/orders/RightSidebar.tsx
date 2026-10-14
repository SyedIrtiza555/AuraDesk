import { useUIStore } from '../../shared/store';
import { Badge } from '../../shared/ui';
import {
  PanelRightClose,
  PanelRightOpen,
  PieChart,
  Activity,
  Zap,
} from 'lucide-react';

interface RightSidebarProps {
  ordersCount: number;
  inProductionCount: number;
  adminReviewCount: number;
  deliveredCount: number;
}

export function RightSidebar({
  ordersCount,
  inProductionCount,
  adminReviewCount,
  deliveredCount,
}: RightSidebarProps) {
  const isRightSidebarOpen = useUIStore((s) => s.isRightSidebarOpen);
  const toggleRightSidebar = useUIStore((s) => s.toggleRightSidebar);
  const activeViewMode = useUIStore((s) => s.activeViewMode);

  if (!isRightSidebarOpen) {
    return (
      <div className="w-12 bg-slate-900 border-l border-slate-800 flex flex-col items-center py-4 justify-start shrink-0 select-none">
        <button
          onClick={toggleRightSidebar}
          title="Expand Analytics & Feed Sidebar"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-72 bg-slate-900/90 border-l border-slate-800 flex flex-col shrink-0 select-none backdrop-blur-md">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            Live Agency Telemetry
          </span>
        </div>
        <button
          onClick={toggleRightSidebar}
          title="Collapse Sidebar"
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
        {/* Active Mode Pill */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
            Active Multi-View
          </span>
          <div className="flex items-center justify-between">
            <span className="font-bold text-white uppercase text-xs font-mono">
              {activeViewMode.replace('_', ' ')}
            </span>
            <Badge variant="purple" className="text-[9px] font-mono">
              Live
            </Badge>
          </div>
        </div>

        {/* Pipeline Throughput Stats */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-slate-400" /> Pipeline Throughput
          </span>

          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-500">Total Volume</span>
              <div className="text-base font-bold text-white mt-0.5">{ordersCount}</div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-500">In Production</span>
              <div className="text-base font-bold text-indigo-400 mt-0.5">{inProductionCount}</div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-500">Admin Review</span>
              <div className="text-base font-bold text-amber-400 mt-0.5">{adminReviewCount}</div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-500">Delivered</span>
              <div className="text-base font-bold text-emerald-400 mt-0.5">{deliveredCount}</div>
            </div>
          </div>
        </div>

        {/* Live Agency Activity Log */}
        <div className="space-y-2 pt-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Operational Feed
          </span>

          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>WhatsApp Gate</span>
                <span>Active</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Safety Friction verification active for all designer dispatches.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Time-Machine</span>
                <span>Synced</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Historical snapshot scrubbing enabled across calendar & order drawers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
