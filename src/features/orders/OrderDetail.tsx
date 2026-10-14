import { useState, useEffect } from 'react';
import type React from 'react';
import type { Order, UserProfile, OrderStatus } from '../../shared/types';
import { useUIStore } from '../../shared/store';
import { Avatar, Button, IconButton, SegmentedControl, Select, SectionLabel, cn } from '../../shared/ui';
import { copyToClipboard } from '../../shared/notifications';
import {
  PIPELINE,
  STATUS_META,
  StatusPill,
  isAdminRole,
  needsAttentionFrom,
} from '../../shared/orderStatus';
import { TimeMachineSlider } from './TimeMachineSlider';
import { InvoicePanel } from '../invoices/InvoicePanel';
import {
  X,
  Copy,
  Check,
  Phone,
  DollarSign,
  Send,
  MessageSquare,
  Play,
  RotateCcw,
  CheckCircle2,
  Truck,
  AlertTriangle,
  PanelRight,
  AppWindow,
  Maximize2,
  CalendarDays,
  Lock,
  Sparkles,
  Undo2,
  FileText,
  Users,
} from 'lucide-react';

interface OrderDetailProps {
  order: Order;
  teamUsers: UserProfile[];
  onUpdateOrder: (updated: Partial<Order>) => Promise<void>;
  onClose: () => void;
}

const toDateInput = (order: Order) =>
  new Date(order.due_date ?? order.created_at + 86400000 * 5).toISOString().split('T')[0];

/** Text input that looks like plain text until hovered/focused; saves on blur. */
function InlineInput({
  value,
  onChange,
  onCommit,
  disabled,
  className,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
}) {
  return (
    <input
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={cn(
        'w-full bg-transparent rounded-lg px-2 -mx-2 py-1 transition-colors focus:outline-none',
        !disabled && 'hover:bg-ink/[0.04] focus:bg-surface focus:ring-2 focus:ring-accent/20',
        className
      )}
      {...rest}
    />
  );
}

export function OrderDetail({ order, teamUsers, onUpdateOrder, onClose }: OrderDetailProps) {
  const currentUser = useUIStore((s) => s.currentUser);
  const peekMode = useUIStore((s) => s.peekMode);
  const setPeekMode = useUIStore((s) => s.setPeekMode);
  const openDeliveryModal = useUIStore((s) => s.openDeliveryModal);
  const openEscalateModal = useUIStore((s) => s.openEscalateModal);

  const [copied, setCopied] = useState(false);
  const [revisionText, setRevisionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local drafts of editable fields; re-seeded whenever a different order (or a server update) arrives
  const [draft, setDraft] = useState(() => ({
    title: order.title,
    client_name: order.client_name,
    client_phone: order.client_phone || '',
    agreed_price: String(order.agreed_price || ''),
    project_brief: order.project_brief,
    due: toDateInput(order),
  }));
  const [draftFor, setDraftFor] = useState(order);
  if (draftFor !== order) {
    setDraftFor(order);
    setDraft({
      title: order.title,
      client_name: order.client_name,
      client_phone: order.client_phone || '',
      agreed_price: String(order.agreed_price || ''),
      project_brief: order.project_brief,
      due: toDateInput(order),
    });
  }
  const set = (key: keyof typeof draft) => (v: string) => setDraft((d) => ({ ...d, [key]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === 'Escape' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isDesigner = currentUser?.role === 'designer';
  const isAdmin = isAdminRole(currentUser?.role);
  const isAgent = currentUser?.role === 'sales_agent';
  const canEdit = !isDesigner;
  const mine = needsAttentionFrom(order, currentUser);
  const meta = STATUS_META[order.status];

  const designers = teamUsers.filter((u) => u.role === 'designer' && u.status === 'active');
  const agents = teamUsers.filter((u) => u.role === 'sales_agent' && u.status === 'active');

  const save = (fields: Partial<Order>) => onUpdateOrder({ ...fields, updated_at: Date.now() });

  const commit = (key: keyof Order, value: string | number | undefined) => {
    if (order[key] === value) return;
    save({ [key]: value } as Partial<Order>);
  };

  const handleCopyCode = async () => {
    await copyToClipboard(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDesignerSelect = (uid: string) => {
    const designer = designers.find((d) => d.uid === uid);
    save({
      assigned_designer_id: designer?.uid || '',
      assigned_designer_name: designer?.displayName || '',
      assigned_designer_initials: designer?.initials || '',
      status: order.status === 'SUBMITTED_TO_ADMIN' && designer ? 'ASSIGNED_TO_DESIGNER' : order.status,
    });
  };

  const handleAgentSelect = (uid: string) => {
    const agent = agents.find((a) => a.uid === uid);
    save({ sales_agent_id: agent?.uid || '', sales_agent_name: agent?.displayName || '' });
  };

  const transition = async (next: OrderStatus) => {
    setIsSubmitting(true);
    try {
      await save({ status: next });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionText.trim() || !currentUser) return;
    setIsSubmitting(true);
    try {
      const note = {
        id: `rev-${Date.now()}`,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        authorRole: currentUser.role,
        message: revisionText.trim(),
        timestamp: Date.now(),
      };
      await save({
        revisions: [...(order.revisions || []), note],
        // An admin note is a change request; a designer note is just a reply
        ...(isAdmin ? { status: 'IN_REVISION' as OrderStatus, admin_feedback: note.message } : {}),
      });
      setRevisionText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------------------------------------ actions
  const actions: React.ReactNode[] = [];
  if (isAdmin && order.status === 'SUBMITTED_TO_ADMIN') {
    actions.push(
      <Button key="esc" variant="secondary" onClick={() => openEscalateModal(order)}>
        <Undo2 className="w-3.5 h-3.5" /> Send back to agent
      </Button>
    );
  }
  if (isAgent && order.status === 'RETURNED_TO_AGENT') {
    actions.push(
      <Button key="resub" variant="accent" loading={isSubmitting} onClick={() => transition('SUBMITTED_TO_ADMIN')}>
        <Send className="w-3.5 h-3.5" /> Re-submit to admin
      </Button>
    );
  }
  if (isDesigner && ['ASSIGNED_TO_DESIGNER', 'IN_PRODUCTION', 'ADMIN_REVIEW'].includes(order.status)) {
    actions.push(
      <Button key="deliver" variant="secondary" onClick={() => openDeliveryModal(order)}>
        <Truck className="w-3.5 h-3.5" /> Mark delivered
      </Button>
    );
  }
  if (isDesigner && order.status === 'ASSIGNED_TO_DESIGNER') {
    actions.push(
      <Button key="start" variant="accent" loading={isSubmitting} onClick={() => transition('IN_PRODUCTION')}>
        <Play className="w-3.5 h-3.5" /> Start production
      </Button>
    );
  }
  if (isDesigner && (order.status === 'IN_PRODUCTION' || order.status === 'IN_REVISION')) {
    actions.push(
      <Button key="review" variant="accent" loading={isSubmitting} onClick={() => transition('ADMIN_REVIEW')}>
        <Send className="w-3.5 h-3.5" /> Submit for review
      </Button>
    );
  }
  if (isAdmin && order.status === 'ADMIN_REVIEW') {
    actions.push(
      <Button key="fix" variant="secondary" loading={isSubmitting} onClick={() => transition('IN_REVISION')}>
        <RotateCcw className="w-3.5 h-3.5" /> Request changes
      </Button>,
      <Button key="approve" variant="accent" loading={isSubmitting} onClick={() => transition('IN_PRODUCTION')}>
        <Check className="w-3.5 h-3.5" /> Approve design
      </Button>
    );
  }
  if (isAdmin && order.status === 'DELIVERED') {
    actions.push(
      <Button key="complete" variant="accent" loading={isSubmitting} onClick={() => transition('COMPLETED')}>
        <CheckCircle2 className="w-3.5 h-3.5" /> Complete order
      </Button>
    );
  }

  // ------------------------------------------------------------------ layout
  const container =
    peekMode === 'full'
      ? 'fixed inset-0 z-50'
      : peekMode === 'center'
        ? 'fixed inset-6 md:inset-x-[12%] md:inset-y-10 z-50 rounded-xl border border-line animate-rise-in'
        : 'fixed inset-y-0 right-0 z-40 w-full max-w-[560px] border-l border-line animate-slide-in-right';

  const stepIndex = PIPELINE.indexOf(order.status);

  return (
    <>
      {peekMode !== 'side' && <div className="fixed inset-0 z-40 bg-black/25 dark:bg-black/55 animate-fade-in" onClick={onClose} />}

      <div className={cn(container, 'bg-canvas shadow-pop flex flex-col overflow-hidden')}>
        {/* Header */}
        <div className="h-11 px-3 flex items-center gap-2 border-b border-line bg-surface shrink-0">
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-surface-muted text-xs font-semibold text-muted hover:text-ink tabular-nums"
            title="Copy order number"
          >
            {order.orderNumber}
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          </button>
          <StatusPill status={order.status} size="sm" />
          <div className="flex-1" />
          <SegmentedControl
            size="sm"
            value={peekMode}
            onChange={setPeekMode}
            options={[
              { value: 'side', label: '', title: 'Side panel', icon: PanelRight },
              { value: 'center', label: '', title: 'Centered', icon: AppWindow },
              { value: 'full', label: '', title: 'Full screen', icon: Maximize2 },
            ]}
          />
          <IconButton label="Close (Esc)" onClick={onClose}>
            <X className="w-4.5 h-4.5" />
          </IconButton>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className={cn('mx-auto px-5 py-4 space-y-4', peekMode === 'side' ? 'max-w-none' : 'max-w-3xl')}>
            {/* Title */}
            <div>
              <InlineInput
                value={draft.title}
                onChange={set('title')}
                onCommit={() => commit('title', draft.title.trim())}
                disabled={!canEdit}
                placeholder="Order title"
                className="text-[18px] font-semibold leading-tight text-ink"
              />
              <div className="mt-1 flex items-center gap-3 text-[13px] text-muted">
                <span>Created {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="w-1 h-1 rounded-full bg-line-strong" />
                <label className="inline-flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Due
                  <input
                    type="date"
                    value={draft.due}
                    disabled={!canEdit}
                    onChange={(e) => {
                      set('due')(e.target.value);
                      if (e.target.value) save({ due_date: new Date(e.target.value).getTime() });
                    }}
                    className="bg-transparent rounded-md px-1 hover:bg-ink/[0.04] focus:outline-none focus:ring-2 focus:ring-accent/20 text-ink font-medium"
                  />
                </label>
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-1">
              {PIPELINE.map((s, i) => (
                <div key={s} className="flex-1" title={STATUS_META[s].label}>
                  <div
                    className={cn(
                      'h-1.5 rounded-full',
                      order.status === 'RETURNED_TO_AGENT'
                        ? i === 0 ? 'bg-rose-400' : 'bg-line'
                        : i < stepIndex ? 'bg-accent' : i === stepIndex ? STATUS_META[s].bar : 'bg-line'
                    )}
                  />
                </div>
              ))}
            </div>

            {/* Next step */}
            <div
              className={cn(
                'rounded-md px-3 py-2.5 flex gap-2.5 border',
                mine ? 'bg-accent-soft border-accent/20' : 'bg-surface-muted border-line'
              )}
            >
              {mine ? (
                <Sparkles className="w-4 h-4 text-accent mt-px shrink-0" />
              ) : (
                <meta.icon className="w-4 h-4 text-muted mt-px shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className={cn('text-[13px] font-medium', mine ? 'text-accent-deep' : 'text-ink')}>
                  {mine ? 'Your move' : meta.label}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {isAdmin && order.status === 'SUBMITTED_TO_ADMIN'
                    ? 'Pick a designer below to assign it, or send it back if details are missing.'
                    : meta.hint}
                </div>
                {order.status === 'DELIVERED' && order.delivery_code && (
                  <div className="mt-1.5 text-xs font-mono text-muted" data-selectable>
                    Delivery code: {order.delivery_code}
                  </div>
                )}
              </div>
            </div>

            {order.status === 'RETURNED_TO_AGENT' && order.escalation_note && (
              <div className="flex gap-2.5 px-3 py-2.5 rounded-md bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[13px] font-medium text-rose-800">What the admin needs</div>
                  <p className="text-[13px] text-rose-700 mt-0.5 leading-relaxed">{order.escalation_note}</p>
                </div>
              </div>
            )}

            {/* Facts */}
            <div className={cn('grid gap-2', peekMode === 'side' ? 'grid-cols-2' : 'grid-cols-3')}>
              <FactCard label="Client" icon={<Users />}>
                <InlineInput
                  value={draft.client_name}
                  onChange={set('client_name')}
                  onCommit={() => commit('client_name', draft.client_name.trim())}
                  disabled={!canEdit}
                  placeholder="Client name"
                  className="text-[15px] font-semibold text-ink"
                />
                {isDesigner ? (
                  <Redacted>Phone hidden for designers</Redacted>
                ) : (
                  <div className="flex items-center gap-1.5 text-[13px] text-muted">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <InlineInput
                      value={draft.client_phone}
                      onChange={set('client_phone')}
                      onCommit={() => commit('client_phone', draft.client_phone.trim())}
                      placeholder="WhatsApp number"
                    />
                  </div>
                )}
              </FactCard>

              <FactCard label="Agreed price" icon={<DollarSign />}>
                {isDesigner ? (
                  <Redacted>Hidden for designers</Redacted>
                ) : (
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-lg font-semibold text-faint">$</span>
                    <InlineInput
                      type="number"
                      value={draft.agreed_price}
                      onChange={set('agreed_price')}
                      onCommit={() => commit('agreed_price', parseFloat(draft.agreed_price) || 0)}
                      placeholder="0"
                      className="text-lg font-semibold text-ink tabular-nums"
                    />
                  </div>
                )}
              </FactCard>

              <FactCard label="Team" icon={<Users />} className={peekMode === 'side' ? 'col-span-2' : ''}>
                <div className="grid grid-cols-2 gap-3">
                  <PersonPicker
                    label="Designer"
                    editable={isAdmin}
                    value={order.assigned_designer_id || ''}
                    name={order.assigned_designer_name}
                    initials={order.assigned_designer_initials}
                    options={designers}
                    onChange={handleDesignerSelect}
                    emptyLabel="Choose a designer…"
                    highlight={isAdmin && order.status === 'SUBMITTED_TO_ADMIN'}
                  />
                  <PersonPicker
                    label="Sales agent"
                    editable={isAdmin}
                    value={order.sales_agent_id || ''}
                    name={order.sales_agent_name}
                    options={agents}
                    onChange={handleAgentSelect}
                    emptyLabel="Choose an agent…"
                  />
                </div>
              </FactCard>
            </div>

            {/* Brief */}
            <section className="bg-surface border border-line rounded-md p-3">
              <SectionLabel icon={<FileText />}>Design brief</SectionLabel>
              <textarea
                rows={4}
                value={draft.project_brief}
                disabled={!canEdit}
                onChange={(e) => set('project_brief')(e.target.value)}
                onBlur={() => commit('project_brief', draft.project_brief.trim())}
                placeholder="Metal, stones, dimensions, finger size, references…"
                className="mt-1.5 w-full bg-transparent text-[13px] text-ink leading-relaxed resize-none rounded-lg px-2 -mx-2 py-1 hover:bg-ink/[0.03] focus:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:hover:bg-transparent"
              />
            </section>

            {/* Revisions */}
            <section className="bg-surface border border-line rounded-md p-3">
              <div className="flex items-center justify-between">
                <SectionLabel icon={<MessageSquare />}>Revision notes</SectionLabel>
                <span className="text-xs text-faint">{(order.revisions || []).length}</span>
              </div>

              <div className="mt-2.5 space-y-2.5">
                {(order.revisions || []).length === 0 && (
                  <p className="text-[13px] text-faint">No notes yet. Feedback between admins and the designer shows up here.</p>
                )}
                {(order.revisions || []).map((rev) => {
                  const fromMe = rev.authorId === currentUser?.uid;
                  return (
                    <div key={rev.id} className={cn('flex gap-2.5', fromMe && 'flex-row-reverse')}>
                      <Avatar name={rev.authorName} size="sm" />
                      <div className={cn('max-w-[80%] rounded-lg px-3 py-2', fromMe ? 'bg-accent-soft' : 'bg-surface-muted')}>
                        <div className={cn('text-[11px] font-medium', fromMe ? 'text-accent-deep' : 'text-muted')}>
                          {rev.authorName} ·{' '}
                          {new Date(rev.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <p className="text-[13px] mt-0.5 leading-relaxed" data-selectable>{rev.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(isAdmin || isDesigner) && (
                <form onSubmit={handleAddRevision} className="mt-3 flex gap-1.5">
                  <input
                    type="text"
                    placeholder={isAdmin ? 'Request a change… (moves the order to Revision)' : 'Reply to the admin…'}
                    value={revisionText}
                    onChange={(e) => setRevisionText(e.target.value)}
                    className="flex-1 h-8 px-2.5 bg-surface border border-line-strong rounded-md text-[13px] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                  <Button type="submit" disabled={!revisionText.trim()} loading={isSubmitting}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              )}
            </section>

            {!isDesigner && (
              <InvoicePanel
                orderId={order.id}
                orderAmount={order.agreed_price || 0}
                userRole={currentUser?.role || 'sales_agent'}
                currentUserName={currentUser?.displayName || 'User'}
              />
            )}

            <TimeMachineSlider order={order} />
          </div>
        </div>

        {/* Action bar */}
        {actions.length > 0 && (
          <div className="px-4 py-2.5 bg-surface border-t border-line flex items-center justify-end gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </>
  );
}

function FactCard({
  label,
  icon,
  className,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('bg-surface border border-line rounded-md p-3 space-y-1.5', className)}>
      <SectionLabel icon={icon}>{label}</SectionLabel>
      {children}
    </div>
  );
}

function Redacted({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-faint py-1">
      <Lock className="w-3.5 h-3.5" /> {children}
    </div>
  );
}

function PersonPicker({
  label,
  editable,
  value,
  name,
  initials,
  options,
  onChange,
  emptyLabel,
  highlight,
}: {
  label: string;
  editable: boolean;
  value: string;
  name?: string;
  initials?: string;
  options: UserProfile[];
  onChange: (uid: string) => void;
  emptyLabel: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted mb-1.5">{label}</div>
      {editable ? (
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn('h-8 text-[13px]', highlight && !value && 'ring-2 ring-accent/20 border-accent')}
        >
          <option value="">{options.length ? emptyLabel : 'No active people in this role'}</option>
          {options.map((p) => (
            <option key={p.uid} value={p.uid}>
              {p.displayName}
            </option>
          ))}
        </Select>
      ) : name ? (
        <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
          <Avatar size="xs" name={name} initials={initials} />
          {name}
        </div>
      ) : (
        <div className="text-[13px] text-faint">Not assigned</div>
      )}
    </div>
  );
}
