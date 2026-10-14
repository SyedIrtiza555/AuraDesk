import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import type { Invoice, UserRole } from '../../shared/types';
import { Button, SectionLabel, toast, cn } from '../../shared/ui';
import { formatMoney } from '../../shared/orderStatus';
import { isDemo } from '../../shared/demo';
import { Receipt, CheckCircle2, CircleDashed } from 'lucide-react';

interface InvoicePanelProps {
  orderId: string;
  orderAmount: number;
  userRole: UserRole;
  currentUserName: string;
}

const blankInvoice = (orderId: string, amount: number): Invoice => ({
  order_id: orderId,
  amount,
  status: 'unpaid',
  created_at: 0,
  updated_at: 0,
});

/** One invoice per order (invoices/{orderId}). Never rendered for designers. */
export function InvoicePanel({ orderId, orderAmount, userRole, currentUserName }: InvoicePanelProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (userRole === 'designer' || isDemo) return;
    const unsub = onSnapshot(
      doc(db, 'invoices', orderId),
      (snap) => {
        setInvoice(snap.exists() ? (snap.data() as Invoice) : null);
        setLoadedFor(orderId);
      },
      (err) => {
        console.warn('[Invoice] listener error:', err);
        setLoadedFor(orderId);
      }
    );
    return () => unsub();
  }, [orderId, userRole]);

  if (userRole === 'designer') return null;

  const current = invoice && invoice.order_id === orderId ? invoice : blankInvoice(orderId, orderAmount);
  const loading = !isDemo && loadedFor !== orderId;
  const paid = current.status === 'paid';
  const canToggle = userRole === 'admin' || userRole === 'owner';

  const handleToggle = async () => {
    setUpdating(true);
    const next: Invoice = {
      ...current,
      amount: current.amount || orderAmount,
      status: paid ? 'unpaid' : 'paid',
      marked_paid_by: paid ? '' : currentUserName,
      marked_paid_by_name: paid ? '' : currentUserName,
      created_at: current.created_at || Date.now(),
      updated_at: Date.now(),
    };
    setInvoice(next);
    try {
      if (!isDemo) await setDoc(doc(db, 'invoices', orderId), next, { merge: true });
      toast.success(paid ? 'Marked as unpaid' : 'Payment recorded');
    } catch (err) {
      console.warn('[Invoice] save failed:', err);
      toast.error('Could not update the invoice', err instanceof Error ? err.message : String(err));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <section className="bg-surface border border-line rounded-md p-3">
      <SectionLabel icon={<Receipt />}>Invoice</SectionLabel>
      <div className="mt-2 flex items-center gap-3">
        <div
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
            paid ? 'bg-emerald-50 text-emerald-600' : 'bg-surface-muted text-faint'
          )}
        >
          {paid ? <CheckCircle2 className="w-4 h-4" /> : <CircleDashed className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-ink tabular-nums">{formatMoney(current.amount || orderAmount)}</div>
          <div className="text-xs text-muted">
            {loading
              ? 'Loading…'
              : paid
                ? `Paid${current.marked_paid_by_name ? ` · recorded by ${current.marked_paid_by_name}` : ''}`
                : 'Not paid yet · settles independently of delivery'}
          </div>
        </div>
        {canToggle && (
          <Button variant={paid ? 'ghost' : 'success'} size="sm" loading={updating} disabled={loading} onClick={handleToggle}>
            {paid ? 'Mark unpaid' : 'Mark as paid'}
          </Button>
        )}
      </div>
    </section>
  );
}
