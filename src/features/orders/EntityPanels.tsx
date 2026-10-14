import { useMemo } from 'react';
import type React from 'react';
import type { Order, UserProfile } from '../../shared/types';
import { useUIStore } from '../../shared/store';
import { Avatar, EmptyState, cn } from '../../shared/ui';
import { StatusPill, formatMoney } from '../../shared/orderStatus';
import { Palette, Briefcase, Contact, Receipt, Mail } from 'lucide-react';

function PanelFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto px-5 py-5">{children}</div>
    </div>
  );
}

export function PeoplePanel({
  kind,
  people,
  orders,
}: {
  kind: 'designers' | 'agents';
  people: UserProfile[];
  orders: Order[];
}) {
  const isDesigners = kind === 'designers';

  if (people.length === 0) {
    return (
      <PanelFrame>
        <EmptyState
          icon={isDesigners ? <Palette /> : <Briefcase />}
          title={isDesigners ? 'No designers yet' : 'No sales agents yet'}
          description="Approve sign-ups and assign roles from Team & roles."
        />
      </PanelFrame>
    );
  }

  return (
    <PanelFrame>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {people.map((p) => {
          const theirs = orders.filter((o) => (isDesigners ? o.assigned_designer_id === p.uid : o.sales_agent_id === p.uid));
          const active = theirs.filter((o) => o.status !== 'COMPLETED').length;
          const done = theirs.length - active;
          const revisions = theirs.reduce((n, o) => n + (o.revisions?.length ?? 0), 0);
          const value = theirs.reduce((n, o) => n + (o.agreed_price || 0), 0);

          return (
            <div key={p.uid} className="bg-surface border border-line rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Avatar name={p.displayName} initials={p.initials} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink truncate">{p.displayName}</div>
                  <div className="flex items-center gap-1 text-xs text-muted truncate">
                    <Mail className="w-3 h-3" /> {p.email}
                  </div>
                </div>
                {p.status === 'suspended' && (
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 rounded-full px-2 py-0.5">Suspended</span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                <Stat label="Active" value={active} highlight={active > 0} />
                <Stat label="Done" value={done} />
                {isDesigners ? <Stat label="Revisions" value={revisions} /> : <Stat label="Booked" value={formatMoney(value)} />}
              </div>
            </div>
          );
        })}
      </div>
    </PanelFrame>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={cn('rounded-md py-1.5', highlight ? 'bg-accent-soft' : 'bg-surface-muted')}>
      <div className="text-[15px] font-semibold text-ink tabular-nums leading-tight">{value}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
    </div>
  );
}

export function ClientsPanel({ orders }: { orders: Order[] }) {
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const currentUser = useUIStore((s) => s.currentUser);
  const isDesigner = currentUser?.role === 'designer';

  const clients = useMemo(() => {
    const map = new Map<string, Order[]>();
    orders.forEach((o) => map.set(o.client_name, [...(map.get(o.client_name) ?? []), o]));
    return [...map.entries()]
      .map(([name, list]) => ({ name, list: list.sort((a, b) => b.created_at - a.created_at) }))
      .sort((a, b) => b.list[0].created_at - a.list[0].created_at);
  }, [orders]);

  if (clients.length === 0) {
    return (
      <PanelFrame>
        <EmptyState icon={<Contact />} title="No clients yet" description="Clients appear here as soon as their first order is logged." />
      </PanelFrame>
    );
  }

  return (
    <PanelFrame>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {clients.map(({ name, list }) => (
          <div key={name} className="bg-surface border border-line rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Avatar name={name} size="md" />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink truncate">{name}</div>
                <div className="text-xs text-muted">
                  {list.length} order{list.length === 1 ? '' : 's'}
                  {!isDesigner && ` · ${formatMoney(list.reduce((n, o) => n + (o.agreed_price || 0), 0))}`}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              {list.slice(0, 3).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 bg-surface-muted hover:bg-accent-soft text-left transition-colors"
                >
                  <span className="flex-1 min-w-0 text-[13px] text-ink truncate">{o.title}</span>
                  <StatusPill status={o.status} size="sm" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PanelFrame>
  );
}

export function InvoicesPanel({ orders }: { orders: Order[] }) {
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const searchQuery = useUIStore((s) => s.searchQuery);

  const list = orders.filter((o) => {
    const q = searchQuery.trim().toLowerCase();
    return !q || [o.title, o.orderNumber, o.client_name].some((v) => v.toLowerCase().includes(q));
  });
  const total = list.reduce((n, o) => n + (o.agreed_price || 0), 0);
  const closed = list.filter((o) => o.status === 'COMPLETED').reduce((n, o) => n + (o.agreed_price || 0), 0);

  if (orders.length === 0) {
    return (
      <PanelFrame>
        <EmptyState icon={<Receipt />} title="No invoices yet" description="Every order gets an invoice with its agreed price." />
      </PanelFrame>
    );
  }

  return (
    <PanelFrame>
      <div className="grid grid-cols-2 border border-line rounded-lg divide-x divide-line mb-4 max-w-md">
        <div className="px-4 py-3">
          <div className="text-xs text-muted">Total booked</div>
          <div className="mt-1 text-xl font-semibold text-ink tabular-nums">{formatMoney(total)}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs text-muted">From completed orders</div>
          <div className="mt-1 text-xl font-semibold text-ink tabular-nums">{formatMoney(closed)}</div>
        </div>
      </div>

      <div className="border border-line rounded-lg divide-y divide-line">
        {list.map((o) => (
          <button
            key={o.id}
            onClick={() => setSelectedOrder(o)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-muted transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-surface-muted flex items-center justify-center text-muted shrink-0">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-faint tabular-nums">INV-{o.orderNumber}</div>
              <div className="text-[13px] font-medium text-ink truncate">{o.title}</div>
              <div className="text-xs text-muted">{o.client_name}</div>
            </div>
            <StatusPill status={o.status} size="sm" />
            <div className="w-20 text-right text-[13px] font-medium text-ink tabular-nums">{formatMoney(o.agreed_price)}</div>
          </button>
        ))}
      </div>
    </PanelFrame>
  );
}
