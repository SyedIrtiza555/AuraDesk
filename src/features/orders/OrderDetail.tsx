import { useState, useEffect } from 'react';
import type { Order, UserProfile, OrderStatus } from '../../shared/types';
import { useUIStore } from '../../shared/store';
import { Badge, Button } from '../../shared/ui';
import { copyToClipboard } from '../../shared/notifications';
import { TimeMachineSlider } from './TimeMachineSlider';
import { InvoicePanel } from '../invoices/InvoicePanel';
import {
  X,
  Copy,
  Check,
  User,
  Phone,
  DollarSign,
  Send,
  MessageSquare,
  Play,
  RotateCcw,
  CheckCircle,
  Truck,
  AlertTriangle,
  PanelRightClose,
  AppWindow,
  Maximize2,
  Calendar,
  History,
} from 'lucide-react';

interface OrderDetailProps {
  order: Order;
  teamUsers: UserProfile[];
  onUpdateOrder: (updated: Partial<Order>) => Promise<void>;
  onClose: () => void;
}

export function OrderDetail({
  order,
  teamUsers,
  onUpdateOrder,
  onClose,
}: OrderDetailProps) {
  const currentUser = useUIStore((s) => s.currentUser);
  const peekMode = useUIStore((s) => s.peekMode);
  const setPeekMode = useUIStore((s) => s.setPeekMode);
  const openDeliveryModal = useUIStore((s) => s.openDeliveryModal);
  const openEscalateModal = useUIStore((s) => s.openEscalateModal);

  const [copiedId, setCopiedId] = useState(false);
  const [revisionText, setRevisionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Directly editable fields with instant auto-save on blur / change
  const [orderNumber, setOrderNumber] = useState(order.orderNumber);
  const [title, setTitle] = useState(order.title);
  const [clientName, setClientName] = useState(order.client_name);
  const [clientPhone, setClientPhone] = useState(order.client_phone || '');
  const [agreedPrice, setAgreedPrice] = useState(String(order.agreed_price || ''));
  const [projectBrief, setProjectBrief] = useState(order.project_brief);
  const [dueDate, setDueDate] = useState(
    order.due_date
      ? new Date(order.due_date).toISOString().split('T')[0]
      : new Date(order.created_at + 86400000 * 5).toISOString().split('T')[0]
  );
  const [assignedDesignerId, setAssignedDesignerId] = useState(
    order.assigned_designer_id || ''
  );
  const [salesAgentId, setSalesAgentId] = useState(order.sales_agent_id || '');

  // Keep state synced with incoming order prop
  useEffect(() => {
    setOrderNumber(order.orderNumber);
    setTitle(order.title);
    setClientName(order.client_name);
    setClientPhone(order.client_phone || '');
    setAgreedPrice(String(order.agreed_price || ''));
    setProjectBrief(order.project_brief);
    setDueDate(
      order.due_date
        ? new Date(order.due_date).toISOString().split('T')[0]
        : new Date(order.created_at + 86400000 * 5).toISOString().split('T')[0]
    );
    setAssignedDesignerId(order.assigned_designer_id || '');
    setSalesAgentId(order.sales_agent_id || '');
  }, [order]);

  const isDesigner = currentUser?.role === 'designer';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner';
  const isAgent = currentUser?.role === 'sales_agent';

  const availableDesigners = teamUsers.filter(
    (u) => u.role === 'designer' && u.status === 'active'
  );
  const availableAgents = teamUsers.filter(
    (u) => u.role === 'sales_agent' && u.status === 'active'
  );

  // Instant inline persistence helper without needing 'edit' or 'save' button
  const triggerAutoSave = async (fieldsToUpdate: Partial<Order>) => {
    try {
      await onUpdateOrder({
        ...fieldsToUpdate,
        updated_at: Date.now(),
      });
    } catch (err) {
      console.warn('Auto-save error:', err);
    }
  };

  const handleCopyCode = async (text: string) => {
    await copyToClipboard(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDesignerSelect = async (newDesignerId: string) => {
    setAssignedDesignerId(newDesignerId);
    const designer = availableDesigners.find((d) => d.uid === newDesignerId);
    await triggerAutoSave({
      assigned_designer_id: designer?.uid || '',
      assigned_designer_name: designer?.displayName || '',
      assigned_designer_initials: designer?.initials || '',
      status: order.status === 'SUBMITTED_TO_ADMIN' ? 'ASSIGNED_TO_DESIGNER' : order.status,
    });
  };

  const handleAgentSelect = async (newAgentId: string) => {
    setSalesAgentId(newAgentId);
    const agent = availableAgents.find((a) => a.uid === newAgentId);
    await triggerAutoSave({
      sales_agent_id: agent?.uid || '',
      sales_agent_name: agent?.displayName || '',
    });
  };

  const handleStatusTransition = async (nextStatus: OrderStatus) => {
    setIsSubmitting(true);
    try {
      await onUpdateOrder({
        status: nextStatus,
        updated_at: Date.now(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionText.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      const newRev = {
        id: `rev-${Date.now()}`,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        authorRole: currentUser.role,
        message: revisionText.trim(),
        timestamp: Date.now(),
      };

      const existingRevisions = order.revisions || [];
      await onUpdateOrder({
        revisions: [...existingRevisions, newRev],
        status: 'IN_REVISION',
        admin_feedback: revisionText.trim(),
        updated_at: Date.now(),
      });
      setRevisionText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'SUBMITTED_TO_ADMIN':
        return <Badge variant="warning">Submitted</Badge>;
      case 'RETURNED_TO_AGENT':
        return <Badge variant="danger">Returned to Agent</Badge>;
      case 'ASSIGNED_TO_DESIGNER':
        return <Badge variant="info">Assigned</Badge>;
      case 'IN_PRODUCTION':
        return <Badge variant="purple">In Production</Badge>;
      case 'ADMIN_REVIEW':
        return <Badge variant="warning">Admin Review</Badge>;
      case 'IN_REVISION':
        return <Badge variant="danger">In Revision</Badge>;
      case 'DELIVERED':
        return <Badge variant="info">Delivered (WhatsApp)</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
    }
  };

  const containerStyle =
    peekMode === 'full'
      ? 'fixed inset-0 z-50 bg-[#F5F5F7] overflow-hidden flex flex-col'
      : peekMode === 'center'
      ? 'fixed inset-4 sm:inset-12 md:inset-16 z-50 bg-[#F5F5F7] border border-white/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl'
      : 'fixed inset-y-0 right-0 z-40 w-full max-w-xl bg-[#F5F5F7] border-l border-slate-200/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200';

  return (
    <>
      {peekMode !== 'side' && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <div className={containerStyle}>
        {/* Header */}
        <div className="p-4 border-b border-slate-200/60 flex items-center justify-between bg-white/70 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5">
            <input
              value={orderNumber}
              disabled={isDesigner}
              onChange={(e) => setOrderNumber(e.target.value)}
              onBlur={() => triggerAutoSave({ orderNumber })}
              className="font-mono text-xs font-bold text-[#1C1D21] bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#1C1D21] focus:outline-none w-28"
            />
            <button
              onClick={() => handleCopyCode(order.orderNumber)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
              title="Copy"
            >
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            {getStatusBadge(order.status)}
          </div>

          {/* Peek Switcher Controls & Close */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setPeekMode('side')}
                title="Side Peek"
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  peekMode === 'side'
                    ? 'bg-white text-[#1C1D21] shadow-xs'
                    : 'text-slate-400 hover:text-[#1C1D21]'
                }`}
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPeekMode('center')}
                title="Center Modal"
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  peekMode === 'center'
                    ? 'bg-white text-[#1C1D21] shadow-xs'
                    : 'text-slate-400 hover:text-[#1C1D21]'
                }`}
              >
                <AppWindow className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPeekMode('full')}
                title="Fullscreen"
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  peekMode === 'full'
                    ? 'bg-white text-[#1C1D21] shadow-xs'
                    : 'text-slate-400 hover:text-[#1C1D21]'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-[#1C1D21] rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Editable Title */}
          <div>
            <input
              value={title}
              disabled={isDesigner}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => triggerAutoSave({ title })}
              placeholder="Order Title"
              className="w-full text-lg sm:text-xl font-semibold text-[#1C1D21] bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#1C1D21] focus:outline-none transition-colors"
            />
            <div className="flex items-center gap-4 text-xs text-[#6B7280] mt-1 font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Due:
                <input
                  type="date"
                  value={dueDate}
                  disabled={isDesigner}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    triggerAutoSave({ due_date: new Date(e.target.value).getTime() });
                  }}
                  className="bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none ml-1 cursor-pointer"
                />
              </span>
              <span>
                Created: {new Date(order.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Escalation Alert */}
          {order.status === 'RETURNED_TO_AGENT' && order.escalation_note && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-1 text-xs">
              <div className="flex items-center gap-2 text-amber-800 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Admin Escalation Notice:</span>
              </div>
              <p className="text-amber-700 leading-relaxed pl-5">
                {order.escalation_note}
              </p>
            </div>
          )}

          {/* Client & Financial Cards (Editable In-Place) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="glass-panel p-3.5 rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Client Contact
              </span>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  value={clientName}
                  disabled={isDesigner}
                  onChange={(e) => setClientName(e.target.value)}
                  onBlur={() => triggerAutoSave({ client_name: clientName })}
                  className="w-full font-medium text-xs text-[#1C1D21] bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#1C1D21] focus:outline-none"
                  placeholder="Client Name"
                />
              </div>

              {isDesigner ? (
                <div className="text-[11px] text-slate-400 italic">
                  [Phone Redacted for Designer]
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    onBlur={() => triggerAutoSave({ client_phone: clientPhone })}
                    className="w-full text-xs text-[#6B7280] bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#1C1D21] focus:outline-none"
                    placeholder="Phone (WhatsApp)"
                  />
                </div>
              )}
            </div>

            <div className="glass-panel p-3.5 rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Financials
              </span>
              {isDesigner ? (
                <div className="text-[11px] text-slate-400 italic py-1">
                  [Price Redacted for Designer]
                </div>
              ) : (
                <div className="flex items-center gap-1 font-mono font-bold text-base text-[#1C1D21]">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <input
                    type="number"
                    value={agreedPrice}
                    onChange={(e) => setAgreedPrice(e.target.value)}
                    onBlur={() =>
                      triggerAutoSave({ agreed_price: parseFloat(agreedPrice) || 0 })
                    }
                    className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#1C1D21] focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Resources Workload Allocation */}
          <div className="glass-panel p-3.5 rounded-2xl space-y-3 text-xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Assigned Personnel
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 mb-1 text-[11px]">
                  CAD Designer
                </label>
                {isAdmin ? (
                  <select
                    value={assignedDesignerId}
                    onChange={(e) => handleDesignerSelect(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs px-2.5 py-1.5 text-slate-700"
                  >
                    <option value="">Select Designer...</option>
                    {availableDesigners.map((d) => (
                      <option key={d.uid} value={d.uid}>
                        {d.displayName} ({d.initials || 'DS'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs font-medium text-[#1C1D21]">
                    {order.assigned_designer_name || 'Unassigned'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-500 mb-1 text-[11px]">
                  Intake Sales Agent
                </label>
                {isAdmin ? (
                  <select
                    value={salesAgentId}
                    onChange={(e) => handleAgentSelect(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs px-2.5 py-1.5 text-slate-700"
                  >
                    <option value="">Select Agent...</option>
                    {availableAgents.map((a) => (
                      <option key={a.uid} value={a.uid}>
                        {a.displayName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs font-medium text-[#1C1D21]">
                    {order.sales_agent_name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Project Brief */}
          <div className="glass-panel p-3.5 rounded-2xl space-y-2 text-xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Project Brief & Notes
            </span>
            <textarea
              rows={4}
              value={projectBrief}
              disabled={isDesigner}
              onChange={(e) => setProjectBrief(e.target.value)}
              onBlur={() => triggerAutoSave({ project_brief: projectBrief })}
              placeholder="Detail metal alloy, dimensions, stones..."
              className="w-full bg-white/60 border border-slate-200/80 rounded-xl p-3 text-xs text-[#1C1D21] focus:outline-none focus:border-[#1C1D21] transition-colors"
            />
          </div>

          {/* Chronological Status Changes */}
          <div className="glass-panel p-3.5 rounded-2xl space-y-2.5 text-xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" /> Chronological Status History
            </span>
            <div className="space-y-1.5 border-l-2 border-slate-200 pl-3 ml-1">
              <div>
                <div className="font-semibold text-xs text-[#1C1D21]">
                  Intake: SUBMITTED_TO_ADMIN
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {new Date(order.created_at).toLocaleString()}
                </div>
              </div>

              {order.status !== 'SUBMITTED_TO_ADMIN' && (
                <div className="pt-1">
                  <div className="font-semibold text-xs text-indigo-700">
                    Active Phase: {order.status}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Updated {new Date(order.updated_at).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lazy Day-Wise Time Machine */}
          <TimeMachineSlider order={order} />

          {/* Invoicing Panel */}
          {!isDesigner && (
            <InvoicePanel
              orderId={order.id}
              orderAmount={order.agreed_price || 0}
              userRole={currentUser?.role || 'sales_agent'}
              currentUserName={currentUser?.displayName || 'User'}
            />
          )}

          {/* Revision & Feedback Section */}
          <div className="glass-panel p-3.5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-[#1C1D21]">
                  Design Revisions
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {(order.revisions || []).length} notes
              </span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(!order.revisions || order.revisions.length === 0) && (
                <p className="text-xs text-slate-400 italic py-1">
                  No revision notes recorded yet.
                </p>
              )}

              {(order.revisions || []).map((rev) => (
                <div
                  key={rev.id}
                  className="p-2.5 rounded-xl bg-white border border-slate-100 text-xs space-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1C1D21]">
                      {rev.authorName} ({rev.authorRole})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(rev.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600">{rev.message}</p>
                </div>
              ))}
            </div>

            {(isAdmin || isDesigner) && (
              <form onSubmit={handleAddRevision} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Post revision feedback..."
                  value={revisionText}
                  onChange={(e) => setRevisionText(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[#1C1D21] text-xs focus:outline-none"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !revisionText.trim()}
                >
                  <Send className="w-3 h-3" />
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-3.5 bg-white/70 border-t border-slate-200/60 flex items-center justify-between gap-3 shrink-0">
          {isAdmin && order.status === 'SUBMITTED_TO_ADMIN' && (
            <div className="flex items-center gap-2 w-full">
              <Button
                size="sm"
                variant="danger"
                onClick={() => openEscalateModal(order)}
              >
                Escalate to Agent
              </Button>
            </div>
          )}

          {isAgent && order.status === 'RETURNED_TO_AGENT' && (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-amber-800">
                Returned for clarification
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleStatusTransition('SUBMITTED_TO_ADMIN')}
              >
                Re-Submit
              </Button>
            </div>
          )}

          {isDesigner && order.status === 'ASSIGNED_TO_DESIGNER' && (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500">Ready to start</span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleStatusTransition('IN_PRODUCTION')}
              >
                <Play className="w-3 h-3 mr-1" /> Start Production
              </Button>
            </div>
          )}

          {isDesigner &&
            (order.status === 'IN_PRODUCTION' || order.status === 'IN_REVISION') && (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-slate-500">In Production</span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleStatusTransition('ADMIN_REVIEW')}
                >
                  Submit for Review
                </Button>
              </div>
            )}

          {isAdmin && order.status === 'ADMIN_REVIEW' && (
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusTransition('IN_REVISION')}
                className="text-amber-700"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Request Fix
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleStatusTransition('IN_PRODUCTION')}
              >
                <Check className="w-3 h-3 mr-1" /> Approve
              </Button>
            </div>
          )}

          {isDesigner &&
            (order.status === 'IN_PRODUCTION' ||
              order.status === 'ADMIN_REVIEW' ||
              order.status === 'ASSIGNED_TO_DESIGNER') && (
              <div className="flex items-center justify-end w-full">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => openDeliveryModal(order)}
                >
                  <Truck className="w-3 h-3 mr-1.5" /> Mark Delivered (WhatsApp)
                </Button>
              </div>
            )}

          {isAdmin && order.status === 'DELIVERED' && (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500">
                Code: <code className="font-mono">{order.delivery_code}</code>
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleStatusTransition('COMPLETED')}
              >
                <CheckCircle className="w-3 h-3 mr-1" /> Complete Order
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
