import { useState } from 'react';
import type { Order, UserProfile, OrderStatus } from '../../../shared/types';
import { useUIStore } from '../../../shared/store';
import {
  AlertTriangle,
  User,
  Clock,
  MessageSquare,
  DollarSign,
  PanelRightOpen,
  AppWindow,
  Maximize2,
} from 'lucide-react';

interface KanbanStatusViewProps {
  orders: Order[];
  teamUsers: UserProfile[];
  onUpdateOrder: (updated: Partial<Order>) => Promise<void>;
}

interface ColumnConfig {
  status: OrderStatus;
  label: string;
}

const STATUS_COLUMNS: ColumnConfig[] = [
  { status: 'SUBMITTED_TO_ADMIN', label: 'Submitted' },
  { status: 'ASSIGNED_TO_DESIGNER', label: 'Assigned' },
  { status: 'IN_PRODUCTION', label: 'Production' },
  { status: 'ADMIN_REVIEW', label: 'Review' },
  { status: 'IN_REVISION', label: 'Revision' },
  { status: 'DELIVERED', label: 'Delivered' },
  { status: 'COMPLETED', label: 'Completed' },
];

export function KanbanStatusView({ orders, onUpdateOrder }: KanbanStatusViewProps) {
  const currentUser = useUIStore((s) => s.currentUser);
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const selectedOrderId = useUIStore((s) => s.selectedOrderId);

  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner';
  const isDesigner = currentUser?.role === 'designer';

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    if (!isAdmin) return;
    setDraggedOrderId(orderId);
    e.dataTransfer.setData('text/plain', orderId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: OrderStatus) => {
    if (!isAdmin || !draggedOrderId) return;
    e.preventDefault();

    const targetOrder = orders.find((o) => o.id === draggedOrderId);
    if (!targetOrder || targetOrder.status === targetStatus) return;

    await onUpdateOrder({
      id: targetOrder.id,
      status: targetStatus,
      updated_at: Date.now(),
    });
    setDraggedOrderId(null);
  };

  return (
    <div className="flex-1 flex overflow-x-auto gap-3.5 p-4 pb-24 h-full bg-[#F5F5F7] select-none">
      {STATUS_COLUMNS.map((col) => {
        const columnOrders = orders.filter((o) => o.status === col.status);

        return (
          <div
            key={col.status}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.status)}
            className="w-72 shrink-0 flex flex-col bg-white/60 border border-slate-200/70 rounded-2xl overflow-hidden shadow-xs"
          >
            {/* Column Header */}
            <div className="p-3 border-b border-slate-200/60 bg-white/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1C1D21]">
                {col.label}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                {columnOrders.length}
              </span>
            </div>

            {/* Orders list */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
              {columnOrders.length === 0 ? (
                <div className="h-24 flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-[11px] italic">
                  Empty
                </div>
              ) : (
                columnOrders.map((order) => {
                  const isSelected = selectedOrderId === order.id;
                  const isEscalated =
                    order.status === 'RETURNED_TO_AGENT' ||
                    Boolean(order.escalation_note && order.status === 'SUBMITTED_TO_ADMIN');
                  const daysOld = Math.max(1, Math.ceil((Date.now() - order.created_at) / 86400000));

                  return (
                    <div
                      key={order.id}
                      draggable={isAdmin}
                      onDragStart={(e) => handleDragStart(e, order.id)}
                      onClick={() => setSelectedOrder(order, 'side')}
                      className={`p-3 rounded-xl border transition-all cursor-pointer bg-white hover:border-slate-300 flex flex-col gap-2 shadow-xs group ${
                        isSelected
                          ? 'border-[#1C1D21] ring-1 ring-[#1C1D21]'
                          : 'border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-[#1C1D21]">
                          {order.orderNumber}
                        </span>

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

                      {isEscalated && (
                        <div className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Action Required</span>
                        </div>
                      )}

                      <h4 className="text-xs font-semibold text-[#1C1D21] line-clamp-1">
                        {order.title}
                      </h4>

                      <div className="text-[11px] text-[#6B7280] flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{order.client_name}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{daysOld}d</span>
                        </div>

                        {(order.revisions?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <MessageSquare className="w-3 h-3" />
                            <span>{order.revisions?.length}</span>
                          </div>
                        )}

                        {!isDesigner && (
                          <div className="text-emerald-700 font-bold flex items-center">
                            <DollarSign className="w-2.5 h-2.5" />
                            {(order.agreed_price || 0).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
