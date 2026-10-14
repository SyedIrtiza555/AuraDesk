import { useState, useMemo } from 'react';
import type { Order, UserProfile, OrderStatus } from '../../../shared/types';
import { useUIStore } from '../../../shared/store';
import { Badge } from '../../../shared/ui';
import { copyToClipboard } from '../../../shared/notifications';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Calendar,
  DollarSign,
  Maximize2,
  PanelRightOpen,
  AppWindow,
} from 'lucide-react';

interface TableViewProps {
  orders: Order[];
  teamUsers: UserProfile[];
  onUpdateOrder: (updated: Partial<Order>) => Promise<void>;
}

type SortField =
  | 'orderNumber'
  | 'title'
  | 'client_name'
  | 'assigned_designer_name'
  | 'sales_agent_name'
  | 'status'
  | 'created_at'
  | 'agreed_price';

export function TableView({ orders }: TableViewProps) {
  const currentUser = useUIStore((s) => s.currentUser);
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const selectedOrderId = useUIStore((s) => s.selectedOrderId);

  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isDesigner = currentUser?.role === 'designer';

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedOrders = useMemo(() => {
    const list = [...orders];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'agreed_price' && isDesigner) return 0;

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = ((bVal as string) || '').toLowerCase();
      }

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [orders, sortField, sortAsc, isDesigner]);

  const handleCopy = async (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    await copyToClipboard(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-[#1C1D21]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#1C1D21]" />
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/60 overflow-hidden rounded-2xl border border-slate-200/70 shadow-xs">
      <div className="flex-1 overflow-auto pb-20">
        <table className="w-full text-left border-collapse text-xs select-none">
          <thead className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md border-b border-slate-200 text-[#6B7280] font-mono tracking-wider text-[10px] uppercase">
            <tr>
              <th
                onClick={() => handleSort('orderNumber')}
                className="py-3 px-4 font-semibold cursor-pointer group hover:text-[#1C1D21] transition-colors w-32"
              >
                <div className="flex items-center gap-1.5">
                  <span>Order Code</span>
                  {renderSortIcon('orderNumber')}
                </div>
              </th>
              <th
                onClick={() => handleSort('title')}
                className="py-3 px-4 font-semibold cursor-pointer group hover:text-[#1C1D21] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Title</span>
                  {renderSortIcon('title')}
                </div>
              </th>
              <th
                onClick={() => handleSort('client_name')}
                className="py-3 px-4 font-semibold cursor-pointer group hover:text-[#1C1D21] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Client</span>
                  {renderSortIcon('client_name')}
                </div>
              </th>
              <th
                onClick={() => handleSort('assigned_designer_name')}
                className="py-3 px-4 font-semibold cursor-pointer group hover:text-[#1C1D21] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Designer</span>
                  {renderSortIcon('assigned_designer_name')}
                </div>
              </th>
              <th
                onClick={() => handleSort('sales_agent_name')}
                className="py-3 px-4 font-semibold cursor-pointer group hover:text-[#1C1D21] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Agent</span>
                  {renderSortIcon('sales_agent_name')}
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="py-3 px-4 font-semibold cursor-pointer group hover:text-[#1C1D21] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {renderSortIcon('status')}
                </div>
              </th>
              <th
                onClick={() => handleSort('created_at')}
                className="py-3 px-4 font-semibold cursor-pointer group hover:text-[#1C1D21] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  {renderSortIcon('created_at')}
                </div>
              </th>
              <th
                onClick={() => handleSort('agreed_price')}
                className="py-3 px-4 font-semibold cursor-pointer group hover:text-[#1C1D21] transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Financials</span>
                  {!isDesigner && renderSortIcon('agreed_price')}
                </div>
              </th>
              <th className="py-3 px-4 font-semibold text-center w-24">
                <span>View</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white/40 text-[#1C1D21]">
            {sortedOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400 italic">
                  No orders found. Create a new intake to begin.
                </td>
              </tr>
            ) : (
              sortedOrders.map((order) => {
                const isSelected = selectedOrderId === order.id;

                return (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order, 'side')}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer group ${
                      isSelected ? 'bg-slate-100/70 border-l-2 border-[#1C1D21]' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-[#1C1D21] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span>{order.orderNumber}</span>
                        <button
                          onClick={(e) => handleCopy(e, order.orderNumber)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-opacity"
                        >
                          {copiedId === order.orderNumber ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="font-medium text-[#1C1D21] line-clamp-1">
                        {order.title}
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-[#4B5563] whitespace-nowrap">
                      {order.client_name}
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {order.assigned_designer_name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold font-mono">
                            {order.assigned_designer_initials ||
                              order.assigned_designer_name.slice(0, 2).toUpperCase()}
                          </span>
                          <span>{order.assigned_designer_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-[#4B5563] whitespace-nowrap">
                      {order.sales_agent_name}
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>

                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(order.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono font-medium">
                      {isDesigner ? (
                        <span className="text-slate-400 italic text-[11px]">
                          [Masked]
                        </span>
                      ) : (
                        <span className="text-emerald-700 flex items-center justify-end gap-0.5">
                          <DollarSign className="w-3 h-3" />
                          {(order.agreed_price || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelectedOrder(order, 'side')}
                          title="Side Peek"
                          className="p-1 rounded text-slate-400 hover:text-[#1C1D21]"
                        >
                          <PanelRightOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedOrder(order, 'center')}
                          title="Center Modal"
                          className="p-1 rounded text-slate-400 hover:text-[#1C1D21]"
                        >
                          <AppWindow className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedOrder(order, 'full')}
                          title="Fullscreen"
                          className="p-1 rounded text-slate-400 hover:text-[#1C1D21]"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
