import { useMemo, useState } from 'react';
import type React from 'react';
import type { Order, OrderStatus, OrderViewMode, UserProfile } from '../../shared/types';
import { useUIStore } from '../../shared/store';
import { SegmentedControl, EmptyState, Button, Select, cn } from '../../shared/ui';
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
      {/* Summary strip */}
      <section className="px-5 pt-4 shrink-0">
        <div className="grid grid-cols-4 border border-line rounded-lg divide-x divide-line">
          <button
            onClick={() => {
              setOnlyMine(!onlyMine);
              setStatusFilter('ALL');
            }}
            className={cn(
              'text-left px-4 py-3 rounded-l-lg transition-colors',
              onlyMine ? 'bg-accent-soft' : 'hover:bg-surface-muted'
            )}
            title={attention.length ? 'Show only orders waiting on you' : undefined}
          >
            <Stat
              icon={Sparkles}
              label="Needs you"
              value={String(attention.length)}
              note={attention.length > 0 ? attentionCopy : "You're all caught up"}
              accent={attention.length > 0}
            />
          </button>
          <div className="px-4 py-3">
            <Stat icon={Activity} label="Active" value={String(active.length)} note={`${orders.length} total`} />
          </div>
          <div className="px-4 py-3">
            <Stat
              icon={Eye}
              label="Review & revisions"
              value={String(inReview.length)}
              note={inReview.length ? 'Being checked or fixed' : 'Nothing under review'}
            />
          </div>
          <div className="px-4 py-3">
            {isDesigner ? (
              <Stat icon={BadgeCheck} label="Completed" value={String(completed.length)} note="Designs signed off" />
            ) : (
              <Stat icon={Gem} label="Open value" value={formatMoney(pipelineValue)} note="Agreed price, active orders" />
            )}
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <section className="px-5 pt-3 pb-2.5 flex items-center gap-2 shrink-0">
        <SegmentedControl size="sm" options={views} value={viewMode} onChange={setActiveViewMode} className="shrink-0" />
        <div className="flex-1" />
        <FilterChip active={onlyMine} onClick={() => setOnlyMine(!onlyMine)} count={attention.length}>
          Needs you
        </FilterChip>
        {/* The Pipeline board already groups by status, so a status filter would be redundant there */}
        {viewMode !== 'kanban_status' && (
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'ALL')}
            className={cn('h-6 w-auto text-xs py-0 pl-2', statusFilter !== 'ALL' && 'border-accent/40 text-accent-deep bg-accent-soft')}
          >
            <option value="ALL">All statuses · {orders.length}</option>
            {ALL_STATUSES.filter((s) => statusCounts.get(s)).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label} · {statusCounts.get(s)}
              </option>
            ))}
          </Select>
        )}
        {hasFilters && (
          <button onClick={clearFilters} className="h-6 px-1.5 text-xs text-muted hover:text-ink shrink-0">
            Clear
          </button>
        )}
      </section>

      {/* View */}
      <section className="flex-1 min-h-0 px-5 pb-5">
        {orders.length === 0 ? (
          <div className="h-full border border-line rounded-lg flex items-center justify-center">
            <EmptyState
              icon={<Gem />}
              title={isDesigner ? 'Nothing assigned to you yet' : 'No orders yet'}
              description={
                isDesigner
                  ? 'When an admin assigns you a design, it shows up here.'
                  : 'Log the first client request and it will flow through intake, design and delivery.'
              }
              action={
                canCreate && (
                  <Button variant="accent" size="sm" onClick={openNewOrderModal}>
                    <Plus className="w-3.5 h-3.5" /> New order
                  </Button>
                )
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full border border-line rounded-lg flex items-center justify-center">
            <EmptyState
              icon={<SearchX />}
              title="No orders match"
              description="Try another search or clear the filters."
              action={
                hasFilters && (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
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

function Stat({
  icon: Icon,
  label,
  value,
  note,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className={cn('w-3.5 h-3.5', accent ? 'text-accent' : 'text-faint')} />
        {label}
      </div>
      <div className={cn('mt-1 text-xl font-semibold tabular-nums leading-tight truncate', accent ? 'text-accent' : 'text-ink')}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-faint truncate">{note}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  count,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-6 px-2 rounded-md text-xs inline-flex items-center gap-1.5 whitespace-nowrap transition-colors border',
        active
          ? 'bg-accent-soft text-accent-deep border-accent/25 font-medium'
          : 'bg-surface text-ink-muted border-line hover:border-line-strong hover:text-ink'
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />}
      {children}
      {count !== undefined && <span className={cn('tabular-nums', active ? 'text-accent/70' : 'text-faint')}>{count}</span>}
    </button>
  );
}
