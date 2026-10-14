import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import type { Order, UserProfile } from '../../shared/types';
import { useUIStore } from '../../shared/store';
import { Button, Input, Kbd, toast } from '../../shared/ui';
import { dispatchNativeNotification } from '../../shared/notifications';
import { isAdminRole, needsAttentionFrom } from '../../shared/orderStatus';
import { useShortcut } from '../../shared/hooks';
import { isDemo, DEMO_ORDERS } from '../../shared/demo';
import { OrderDetail } from './OrderDetail';
import { NewOrderModal } from './NewOrderModal';
import { SafetyCheckModal } from './SafetyCheckModal';
import { EscalateModal } from './EscalateModal';
import { LeftSidebar } from './LeftSidebar';
import { OrdersHome } from './OrdersHome';
import { PeoplePanel, ClientsPanel, InvoicesPanel } from './EntityPanels';
import { TeamMemberList } from '../team/TeamMemberList';
import { Search, Plus, ShieldCheck } from 'lucide-react';

const PAGE_COPY: Record<string, { title: string; subtitle: string }> = {
  orders: { title: 'Orders', subtitle: 'Every design job, from intake to delivery.' },
  designers: { title: 'Designers', subtitle: 'Who is making what, and how busy they are.' },
  agents: { title: 'Sales agents', subtitle: 'The people bringing work into the studio.' },
  prospects: { title: 'Clients', subtitle: 'Everyone you have designed for.' },
  invoices: { title: 'Invoices', subtitle: 'Agreed amounts and payment status per order.' },
  team: { title: 'Team & roles', subtitle: 'Approve sign-ups, assign roles and manage access.' },
};

export function OrderDashboard({ teamUsers }: { teamUsers: UserProfile[] }) {
  const currentUser = useUIStore((s) => s.currentUser);
  const selectedOrderId = useUIStore((s) => s.selectedOrderId);
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);
  const openNewOrderModal = useUIStore((s) => s.openNewOrderModal);
  const openTeamModal = useUIStore((s) => s.openTeamModal);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const activeEntity = useUIStore((s) => s.activeEntity);

  const [orders, setOrders] = useState<Order[]>(isDemo ? DEMO_ORDERS : []);
  const searchRef = useRef<HTMLInputElement>(null);

  const isDesigner = currentUser?.role === 'designer';
  const isAdmin = isAdminRole(currentUser?.role);
  const isAgent = currentUser?.role === 'sales_agent';
  const canCreate = isAgent || isAdmin;
  const currentUid = currentUser?.uid;

  useEffect(() => {
    if (!currentUid || isDemo) return;
    // Firestore rules only let designers read their own orders, so the query must say so
    const ordersQuery = isDesigner
      ? query(collection(db, 'orders'), where('assigned_designer_id', '==', currentUid))
      : collection(db, 'orders');
    const unsub = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Order);
        });
        list.sort((a, b) => b.created_at - a.created_at);
        setOrders(list);
      },
      (err) => console.warn('[Aura Desk] Firestore orders listener:', err)
    );
    return () => unsub();
  }, [currentUid, isDesigner]);

  useShortcut('k', useCallback(() => searchRef.current?.focus(), []));
  useShortcut('n', openNewOrderModal, canCreate);

  const visibleOrders = useMemo(
    () => (isDesigner ? orders.filter((o) => o.assigned_designer_id === currentUid) : orders),
    [orders, isDesigner, currentUid]
  );
  const attentionCount = useMemo(
    () => visibleOrders.filter((o) => needsAttentionFrom(o, currentUser)).length,
    [visibleOrders, currentUser]
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  const persistSnapshot = async (order: Order) => {
    const dayDate = new Date().toISOString().split('T')[0];
    await setDoc(doc(db, 'order_snapshots', `${order.id}-${dayDate}`), {
      order_id: order.id,
      date_key: dayDate,
      day_number: Math.max(1, Math.ceil((Date.now() - order.created_at) / 86400000)),
      timestamp: Date.now(),
      snapshot_payload: order,
    });
  };

  const handleCreateOrder = async (orderData: Partial<Order>) => {
    const newId = `ord-${Date.now()}`;
    const newOrderNumber = `AURA-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;
    const fullOrder: Order = { ...(orderData as Order), id: newId, orderNumber: newOrderNumber };

    setOrders((prev) => [fullOrder, ...prev]);
    toast.success('Order submitted', `${fullOrder.orderNumber} is waiting for an admin to assign a designer.`);
    await dispatchNativeNotification('Order Landed', `New Order: ${fullOrder.title} submitted by ${fullOrder.sales_agent_name}`);

    if (isDemo) return;
    try {
      await setDoc(doc(db, 'orders', newId), fullOrder);
      await persistSnapshot(fullOrder);
    } catch (err) {
      console.warn('[Aura Desk] Create order failed:', err);
      toast.error('Could not save the order', err instanceof Error ? err.message : String(err));
    }
  };

  const handleUpdateOrder = async (updatedFields: Partial<Order>) => {
    const targetOrder = selectedOrder || orders.find((o) => o.id === updatedFields.id);
    if (!targetOrder) return;

    const previousStatus = targetOrder.status;
    const merged: Order = { ...targetOrder, ...updatedFields };

    setOrders((prev) => prev.map((o) => (o.id === merged.id ? merged : o)));
    if (selectedOrderId === merged.id) setSelectedOrder(merged);

    if (updatedFields.status === 'ASSIGNED_TO_DESIGNER' && previousStatus !== 'ASSIGNED_TO_DESIGNER') {
      await dispatchNativeNotification('New Assignment', `You have been assigned to ${merged.title}`);
    }
    if (updatedFields.status === 'RETURNED_TO_AGENT' && previousStatus !== 'RETURNED_TO_AGENT') {
      await dispatchNativeNotification('Action Required', `${merged.title} returned to your court`);
    }

    if (isDemo) return;
    try {
      await updateDoc(doc(db, 'orders', merged.id), updatedFields);
      await persistSnapshot(merged);
    } catch (e) {
      console.warn('[Aura Desk] Update order failed:', e);
      toast.error('Could not save your change', e instanceof Error ? e.message : String(e));
    }
  };

  const handleConfirmDelivery = async (orderWithCode: Order) => {
    await handleUpdateOrder({
      id: orderWithCode.id,
      status: 'DELIVERED',
      delivery_code: orderWithCode.delivery_code,
      delivered_at: orderWithCode.delivered_at,
    });
    toast.success('Marked as delivered', 'An admin can now close the order.');
  };

  const handleConfirmEscalate = async (targetOrder: Order, note: string) => {
    if (!targetOrder) return;
    await handleUpdateOrder({ id: targetOrder.id, status: 'RETURNED_TO_AGENT', escalation_note: note });
    toast.success('Sent back to the agent', `${targetOrder.sales_agent_name} will clarify with the client.`);
  };

  const designers = teamUsers.filter((u) => u.role === 'designer');
  const agents = teamUsers.filter((u) => u.role === 'sales_agent');
  const pendingCount = teamUsers.filter((u) => u.status === 'pending_approval').length;
  const clientCount = new Set(visibleOrders.map((o) => o.client_name)).size;
  const page = PAGE_COPY[activeEntity] ?? PAGE_COPY.orders;

  return (
    <>
      <LeftSidebar
        orderCount={visibleOrders.length}
        attentionCount={attentionCount}
        designerCount={designers.length}
        agentCount={agents.length}
        prospectCount={clientCount}
        invoiceCount={visibleOrders.length}
        teamCount={teamUsers.length}
        pendingCount={pendingCount}
      />

      <div className="flex-1 min-w-0 flex flex-col bg-canvas">
        {/* Top bar */}
        <header className="h-12 shrink-0 px-5 flex items-center gap-3 border-b border-line">
          <h1 className="text-[14px] font-semibold text-ink truncate" title={page.subtitle}>
            {page.title}
          </h1>
          <span className="hidden lg:block text-[13px] text-faint truncate flex-1">{page.subtitle}</span>
          <div className="flex-1 lg:hidden" />

          {(activeEntity === 'orders' || activeEntity === 'invoices') && (
            <div className="relative w-64 hidden md:block">
              <Input
                ref={searchRef}
                icon={<Search />}
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setSearchQuery('')}
                className="h-7 pr-14 bg-surface-muted border-transparent focus:bg-surface"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <Kbd>Ctrl K</Kbd>
              </span>
            </div>
          )}

          {activeEntity === 'team' ? (
            <Button variant="secondary" size="sm" onClick={openTeamModal}>
              <ShieldCheck className="w-3.5 h-3.5" /> Auth settings
            </Button>
          ) : (
            canCreate && (
              <Button variant="accent" size="sm" onClick={openNewOrderModal} title="New order (Ctrl+N)">
                <Plus className="w-3.5 h-3.5" /> New order
              </Button>
            )
          )}
        </header>

        <main className="flex-1 min-h-0 overflow-hidden">
          {activeEntity === 'orders' && (
            <OrdersHome orders={visibleOrders} teamUsers={teamUsers} onUpdateOrder={handleUpdateOrder} />
          )}
          {activeEntity === 'designers' && <PeoplePanel kind="designers" people={designers} orders={visibleOrders} />}
          {activeEntity === 'agents' && <PeoplePanel kind="agents" people={agents} orders={visibleOrders} />}
          {activeEntity === 'prospects' && <ClientsPanel orders={visibleOrders} />}
          {activeEntity === 'invoices' && !isDesigner && <InvoicesPanel orders={visibleOrders} />}
          {activeEntity === 'team' && isAdmin && (
            <div className="h-full overflow-y-auto">
              <div className="max-w-3xl mx-auto px-5 py-5">
                <TeamMemberList members={teamUsers} />
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          teamUsers={teamUsers}
          onUpdateOrder={handleUpdateOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      <NewOrderModal onCreateOrder={handleCreateOrder} />
      <SafetyCheckModal onConfirmDelivery={handleConfirmDelivery} />
      <EscalateModal onConfirmEscalate={handleConfirmEscalate} />
    </>
  );
}
