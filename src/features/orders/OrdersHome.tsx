import { useMemo, useState } from 'react';
import type React from 'react';
import type { Order, OrderViewMode, UserProfile } from '../../shared/types';
import { useUIStore } from '../../shared/store';
import { SegmentedControl, EmptyState, Button, cn } from '../../shared/ui';
import {
  ALL_STATUSES,
  STATUS_META,
  formatMoney,
  isAdminRole,
  needsAttentionFrom,
} from '../../shared/orderStatus';
import { TableView } from './views/TableView';
import { KanbanStatusView } from './views/KanbanStatusView';
import { KanbanResourceView } from './views/KanbanResourceView';
import { CardsGridView } from './views/CardsGridView';
import { CalendarView } from './views/CalendarView';
import {
  Table2,
  Columns3,
  Users2,
  LayoutGrid,
  CalendarDays,
  Sparkles,
  Activity,
  Eye,
  Gem,
  BadgeCheck,
  SearchX,
  Plus,
} from 'lucide-react';

const VIEW_OPTIONS: { value: OrderViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'table', label: 'List', icon: Table2 },
  { value: 'kanban_status', label: 'Pipeline', icon: Columns3 },
  { value: 'kanban_resource', label: 'Workload', icon: Users2 },
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
];

interface OrdersHomeProps {
  orders: Order[];
  teamUsers: UserProfile[];
  onUpdateOrder: (updated: Partial<Order>) => Promise<void>;
}

export function OrdersHome({ orders, teamUsers, onUpdateOrder }: OrdersHomeProps) {
  const currentUser = useUIStore((s) => s.currentUser);
  const activeViewMode = useUIStore((s) => s.activeViewMode);
  const setActiveViewMode = useUIStore((s) => s.setActiveViewMode);
  const statusFilter = useUIStore((s) => s.statusFilter);
  const setStatusFilter = useUIStore((s) => s.setStatusFilter);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const openNewOrderModal = useUIStore((s) => s.openNewOrderModal);

  const [onlyMine, setOnlyMine] = useState(false);

  const isDesigner = currentUser?.role === 'designer';
  const isAdmin = isAdminRole(currentUser?.role);
  const canCreate = isAdmin || currentUser?.role === 'sales_agent';
  const views = isDesigner ? VIEW_OPTIONS.filter((v) => v.value !== 'kanban_resource') : VIEW_OPTIONS;
  const viewMode = views.some((v) => v.value === activeViewMode) ? activeViewMode : 'table';

  const attention = useMemo(() => orders.filter((o) => needsAttentionFrom(o, currentUser)), [orders, currentUser]);
  const active = orders.filter((o) => o.status !== 'COMPLETED');
  const inReview = orders.filter((o) => o.status === 'ADMIN_REVIEW' || o.status === 'IN_REVISION');
  const completed = orders.filter((o) => o.status === 'COMPLETED');
  const pipelineValue = active.reduce((sum, o) => sum + (o.agreed_price || 0), 0);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (onlyMine && !needsAttentionFrom(o, currentUser)) return false;
      if (viewMode !== 'kanban_status' && statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (!q) return true;
      return [o.title, o.orderNumber, o.client_name, o.assigned_designer_name, o.sales_agent_name]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [orders, onlyMine, statusFilter, searchQuery, currentUser, viewMode]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => counts.set(o.status, (counts.get(o.status) ?? 0) + 1));
    return counts;
  }, [orders]);

  const hasFilters = onlyMine || statusFilter !== 'ALL' || searchQuery.trim() !== '';
  const clearFilters = () => {
    setOnlyMine(false);
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  const attentionCopy = isDesigner
    ? 'Assigned to you or waiting on your fixes'
    : isAdmin
      ? 'Intakes to assign, designs to review, deliveries to close'
      : 'Returned to you for client details';

  return (
    <div className="h-full flex flex-col">
      {/* Summary */}
      <section className="px-7 pt-6 grid grid-cols-2 xl:grid-cols-4 gap-3.5 shrink-0">
        <button
          onClick={() => {
            setOnlyMine(true);
            setStatusFilter('ALL');
          }}
          className={cn(
            'group relative overflow-hidden text-left rounded-2xl p-4 transition-all',
            attention.length > 0
              ? 'bg-ink text-white shadow-pop hover:-translate-y-0.5'
              : 'bg-surface border border-line shadow-card'
          )}
        >
          {attention.length > 0 && <div className="absolute -top-10 -right-8 w-36 h-36 rounded-full bg-aura/30 blur-2xl" />}
          <div className="relative flex items-center justify-between">
            <span className={cn('text-[13px] font-semibold', attention.length > 0 ? 'text-aura' : 'text-muted')}>
              Needs you
            </span>
            <Sparkles className={cn('w-4 h-4', attention.length > 0 ? 'text-aura' : 'text-faint')} />
          </div>
          <div className="relative mt-2 font-display text-[40px] leading-none">{attention.length}</div>
          <div className={cn('relative mt-2 text-xs', attention.length > 0 ? 'text-white/55' : 'text-muted')}>
            {attention.length > 0 ? attentionCopy : "You're all caught up"}
          </div>
        </button>

        <StatTile icon={Activity} label="Active orders" value={String(active.length)} note={`${orders.length} total`} />
        <StatTile
          icon={Eye}
          label="Review & revisions"
          value={String(inReview.length)}
          note={inReview.length ? 'Being checked or fixed' : 'Nothing under review'}
        />
        {isDesigner ? (
          <StatTile icon={BadgeCheck} label="Completed" value={String(completed.length)} note="Designs signed off" />
        ) : (
          <StatTile icon={Gem} label="Open pipeline value" value={formatMoney(pipelineValue)} note="Agreed price of active orders" />
        )}
      </section>

      {/* Toolbar */}
      <section className="px-7 pt-5 pb-3 flex items-start gap-3 shrink-0">
        <SegmentedControl options={views} value={viewMode} onChange={setActiveViewMode} className="shrink-0" />
        <div className="h-6 w-px bg-line mx-1 mt-2.5 shrink-0" />
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 pt-1">
          <FilterChip active={!onlyMine && statusFilter === 'ALL'} onClick={clearFilters} count={orders.length}>
            All
          </FilterChip>
          {attention.length > 0 && (
            <FilterChip active={onlyMine} onClick={() => setOnlyMine(!onlyMine)} count={attention.length} tone="aura">
              Needs you
            </FilterChip>
          )}
          {/* The Pipeline board already groups by status, so per-status chips would be redundant there */}
          {viewMode !== 'kanban_status' && ALL_STATUSES.filter((s) => statusCounts.get(s)).map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
              count={statusCounts.get(s)}
              dot={STATUS_META[s].dot}
            >
              {STATUS_META[s].label}
            </FilterChip>
          ))}
        </div>
      </section>

      {/* View */}
      <section className="flex-1 min-h-0 px-7 pb-6">
        {orders.length === 0 ? (
          <div className="h-full bg-surface border border-line rounded-2xl shadow-card flex items-center justify-center">
            <EmptyState
              icon={<Gem />}
              title={isDesigner ? 'Nothing on your bench yet' : 'No orders yet'}
              description={
                isDesigner
                  ? 'When an admin assigns you a design, it shows up here.'
                  : 'Log the first client request and it will flow through intake, design and delivery.'
              }
              action={
                canCreate && (
                  <Button variant="aura" onClick={openNewOrderModal}>
                    <Plus className="w-4 h-4" /> New order
                  </Button>
                )
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full bg-surface border border-line rounded-2xl shadow-card flex items-center justify-center">
            <EmptyState
              icon={<SearchX />}
              title="No orders match"
              description="Try another search or clear the filters."
              action={
                hasFilters && (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )
              }
            />
          </div>
        ) : viewMode === 'table' ? (
          <TableView orders={filtered} />
        ) : viewMode === 'kanban_status' ? (
          <KanbanStatusView orders={filtered} onUpdateOrder={onUpdateOrder} />
        ) : viewMode === 'kanban_resource' ? (
          <KanbanResourceView orders={filtered} teamUsers={teamUsers} />
        ) : viewMode === 'cards' ? (
          <CardsGridView orders={filtered} />
        ) : (
          <CalendarView orders={filtered} />
        )}
      </section>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl p-4 bg-surface border border-line shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-muted">{label}</span>
        <Icon className="w-4 h-4 text-faint" />
      </div>
      <div className="mt-2 font-display text-[40px] leading-none text-ink truncate">{value}</div>
      <div className="mt-2 text-xs text-muted truncate">{note}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  count,
  dot,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  dot?: string;
  tone?: 'aura';
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-8 px-3 rounded-full text-[13px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ring-1 ring-inset',
        active
          ? tone === 'aura'
            ? 'bg-aura text-ink ring-aura'
            : 'bg-ink text-white ring-ink'
          : 'bg-surface text-ink-muted ring-line hover:ring-line-strong'
      )}
    >
      {dot && <span className={cn('w-2 h-2 rounded-full', dot)} />}
      {children}
      {count !== undefined && (
        <span className={cn('text-xs tabular-nums', active ? 'opacity-70' : 'text-faint')}>{count}</span>
      )}
    </button>
  );
}
