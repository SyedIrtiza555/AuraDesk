import { useState } from 'react';
import type { Order, UserProfile, OrderStatus } from '../../../shared/types';
import { useUIStore } from '../../../shared/store';
import { Badge } from '../../../shared/ui';
import {
  Users,
  Briefcase,
  Clock,
  MessageSquare,
  PanelRightOpen,
  AppWindow,
  Maximize2,
} from 'lucide-react';

interface KanbanResourceViewProps {
  orders: Order[];
  teamUsers: UserProfile[];
  onUpdateOrder: (updated: Partial<Order>) => Promise<void>;
}

export function KanbanResourceView({
  orders,
  teamUsers,
}: KanbanResourceViewProps) {
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const selectedOrderId = useUIStore((s) => s.selectedOrderId);

  const [resourceTab, setResourceTab] = useState<'designers' | 'agents'>('designers');

  const designers = teamUsers.filter((u) => u.role === 'designer');
  const salesAgents = teamUsers.filter((u) => u.role === 'sales_agent');
  const activeResources = resourceTab === 'designers' ? designers : salesAgents;

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'SUBMITTED_TO_ADMIN':
        return <Badge variant="warning">Submitted</Badge>;
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
      case 'RETURNED_TO_AGENT':
        return <Badge variant="danger">Returned</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F5F7] overflow-hidden select-none pb-24">
      {/* Resource Tab Toggle */}
      <div className="p-3 border-b border-slate-200/60 bg-white/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setResourceTab('designers')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              resourceTab === 'designers'
                ? 'bg-white text-[#1C1D21] shadow-xs'
                : 'text-[#6B7280] hover:text-[#1C1D21]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Designers</span>
          </button>
          <button
            onClick={() => setResourceTab('agents')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              resourceTab === 'agents'
                ? 'bg-white text-[#1C1D21] shadow-xs'
                : 'text-[#6B7280] hover:text-[#1C1D21]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Sales Agents</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Personnel: <span className="font-bold text-[#1C1D21]">{activeResources.length}</span>
        </div>
      </div>

      {/* Lanes */}
      <div className="flex-1 flex overflow-x-auto gap-4 p-4">
        {activeResources.length === 0 ? (
          <div className="w-full h-40 flex items-center justify-center text-xs text-slate-400 italic">
            No active team members registered in this role.
          </div>
        ) : (
          activeResources.map((member) => {
            const memberOrders = orders.filter((o) =>
              resourceTab === 'designers'
                ? o.assigned_designer_id === member.uid
                : o.sales_agent_id === member.uid
            );

            return (
              <div
                key={member.uid}
                className="w-72 shrink-0 flex flex-col bg-white/70 border border-slate-200/70 rounded-2xl overflow-hidden shadow-xs"
              >
                <div className="p-3 border-b border-slate-200/60 bg-white/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold font-mono text-slate-700">
                      {member.initials || member.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-[#1C1D21]">
                      {member.displayName}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    {memberOrders.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                  {memberOrders.length === 0 ? (
                    <div className="h-20 flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs italic">
                      Zero orders
                    </div>
                  ) : (
                    memberOrders.map((order) => {
                      const isSelected = selectedOrderId === order.id;
                      const daysOld = Math.max(
                        1,
                        Math.ceil((Date.now() - order.created_at) / 86400000)
                      );

                      return (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrder(order, 'side')}
                          className={`p-3 rounded-xl border transition-all cursor-pointer bg-white hover:border-slate-300 flex flex-col gap-1.5 shadow-xs group ${
                            isSelected
                              ? 'border-[#1C1D21] ring-1 ring-[#1C1D21]'
                              : 'border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] font-bold text-[#1C1D21]">
                              {order.orderNumber}
                            </span>
                            {getStatusBadge(order.status)}
                          </div>

                          <h5 className="text-xs font-semibold text-[#1C1D21] line-clamp-1">
                            {order.title}
                          </h5>

                          <div className="text-[11px] text-[#6B7280] line-clamp-1">
                            {order.client_name}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{daysOld}d</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              <span>{order.revisions?.length ?? 0}</span>
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
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
