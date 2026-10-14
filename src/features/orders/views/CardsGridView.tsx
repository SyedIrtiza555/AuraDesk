import type { Order, UserProfile, OrderStatus } from '../../../shared/types';
import { useUIStore } from '../../../shared/store';
import { Badge } from '../../../shared/ui';
import {
  User,
  DollarSign,
  Clock,
  PanelRightOpen,
  AppWindow,
  Maximize2,
} from 'lucide-react';

interface CardsGridViewProps {
  orders: Order[];
  teamUsers: UserProfile[];
  onUpdateOrder: (updated: Partial<Order>) => Promise<void>;
}

export function CardsGridView({ orders }: CardsGridViewProps) {
  const currentUser = useUIStore((s) => s.currentUser);
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const selectedOrderId = useUIStore((s) => s.selectedOrderId);

  const isDesigner = currentUser?.role === 'designer';

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'SUBMITTED_TO_ADMIN':
        return <Badge variant="warning">Submitted</Badge>;
      case 'RETURNED_TO_AGENT':
        return <Badge variant="danger">Returned</Badge>;
      case 'ASSIGNED_TO_DESIGNER':
        return <Badge variant="info">Assigned</Badge>;
      case 'IN_PRODUCTION':
        return <Badge variant="purple">Production</Badge>;
      case 'ADMIN_REVIEW':
        return <Badge variant="warning">Review</Badge>;
      case 'IN_REVISION':
        return <Badge variant="danger">Revision</Badge>;
      case 'DELIVERED':
        return <Badge variant="info">Delivered</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 pb-24 bg-[#F5F5F7] select-none">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.map((order) => {
          const isSelected = selectedOrderId === order.id;
          const daysOld = Math.max(1, Math.ceil((Date.now() - order.created_at) / 86400000));

          return (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order, 'side')}
              className={`p-4 rounded-3xl border transition-all cursor-pointer bg-white/80 hover:bg-white hover:border-slate-300 flex flex-col justify-between shadow-xs group ${
                isSelected
                  ? 'border-[#1C1D21] ring-1 ring-[#1C1D21]'
                  : 'border-slate-200/80'
              }`}
            >
              <div className="space-y-2.5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#1C1D21]">
                    {order.orderNumber}
                  </span>
                  {getStatusBadge(order.status)}
                </div>

                <h4 className="text-sm font-semibold text-[#1C1D21] line-clamp-1">
                  {order.title}
                </h4>

                <div className="text-xs text-[#6B7280] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{order.client_name}</span>
                </div>

                <p className="text-xs text-[#4B5563] line-clamp-3 leading-relaxed bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100">
                  {order.project_brief}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {order.assigned_designer_name ? (
                      <div
                        title={`Designer: ${order.assigned_designer_name}`}
                        className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold font-mono"
                      >
                        {order.assigned_designer_initials ||
                          order.assigned_designer_name.slice(0, 2).toUpperCase()}
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[9px]">
                        ?
                      </div>
                    )}
                    <span className="text-[11px] text-[#6B7280]">
                      {order.assigned_designer_name || 'Unassigned'}
                    </span>
                  </div>

                  {!isDesigner ? (
                    <span className="font-bold text-emerald-700 flex items-center font-mono">
                      <DollarSign className="w-3 h-3" />
                      {(order.agreed_price || 0).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">[Masked]</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{daysOld}d</span>
                  </div>

                  <div
                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setSelectedOrder(order, 'side')}
                      className="p-0.5 text-slate-400 hover:text-[#1C1D21]"
                    >
                      <PanelRightOpen className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setSelectedOrder(order, 'center')}
                      className="p-0.5 text-slate-400 hover:text-[#1C1D21]"
                    >
                      <AppWindow className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setSelectedOrder(order, 'full')}
                      className="p-0.5 text-slate-400 hover:text-[#1C1D21]"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
