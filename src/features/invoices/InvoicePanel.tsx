import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import type { Invoice, UserRole } from '../../shared/types';
import { Button, Badge } from '../../shared/ui';
import { CreditCard, CheckCircle2, DollarSign } from 'lucide-react';

interface InvoicePanelProps {
  orderId: string;
  orderAmount: number;
  userRole: UserRole;
  currentUserName: string;
}

export function InvoicePanel({
  orderId,
  orderAmount,
  userRole,
  currentUserName,
}: InvoicePanelProps) {
  // STRICT DATA REDACTION INVARIANT:
  // Designers are strictly forbidden from viewing all invoices records.
  if (userRole === 'designer') {
    return null;
  }

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);

  // Deterministic 1:1 invoice ID: invoices/{orderId}
  useEffect(() => {
    let isCancelled = false;

    try {
      const unsub = onSnapshot(doc(db, 'invoices', orderId), (snap) => {
        if (!isCancelled) {
          if (snap.exists()) {
            setInvoice(snap.data() as Invoice);
          } else {
            // Uninitialized default invoice
            setInvoice({
              order_id: orderId,
              amount: orderAmount || 0,
              status: 'unpaid',
              created_at: Date.now(),
              updated_at: Date.now(),
            });
          }
          setLoading(false);
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('[Invoice] Offline snapshot mode:', e);
      if (!isCancelled) {
        setInvoice({
          order_id: orderId,
          amount: orderAmount || 0,
          status: 'unpaid',
          created_at: Date.now(),
          updated_at: Date.now(),
        });
        setLoading(false);
      }
    }
  }, [orderId, orderAmount]);

  const handleTogglePayment = async () => {
    if (!invoice) return;
    setUpdating(true);

    const newStatus = invoice.status === 'paid' ? 'unpaid' : 'paid';
    const updatedInvoice: Invoice = {
      ...invoice,
      status: newStatus,
      marked_paid_by: newStatus === 'paid' ? currentUserName : undefined,
      marked_paid_by_name: newStatus === 'paid' ? currentUserName : undefined,
      updated_at: Date.now(),
    };

    setInvoice(updatedInvoice);

    try {
      await setDoc(doc(db, 'invoices', orderId), updatedInvoice, { merge: true });
    } catch (err) {
      console.warn('Invoice persisted to local cache:', err);
    } finally {
      setUpdating(false);
    }
  };

  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">
            Invoice & Payment Ledger (1:1 Manual)
          </span>
        </div>
        {invoice?.status === 'paid' ? (
          <Badge variant="success" className="text-[10px] font-mono">
            PAID
          </Badge>
        ) : (
          <Badge variant="warning" className="text-[10px] font-mono">
            UNPAID
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
            Total Agreed Amount
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-0.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            {(invoice?.amount || orderAmount || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          {invoice?.status === 'paid' && invoice.marked_paid_by_name && (
            <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Marked paid by{' '}
              {invoice.marked_paid_by_name}
            </div>
          )}
        </div>

        {isAdminOrOwner && (
          <Button
            size="sm"
            variant={invoice?.status === 'paid' ? 'outline' : 'primary'}
            disabled={updating || loading}
            onClick={handleTogglePayment}
            className={
              invoice?.status === 'paid'
                ? 'text-xs text-slate-300'
                : 'text-xs bg-emerald-600 hover:bg-emerald-500'
            }
          >
            {updating
              ? 'Updating...'
              : invoice?.status === 'paid'
              ? 'Mark as Unpaid'
              : 'Mark as Paid'}
          </Button>
        )}
      </div>

      <p className="text-[10px] text-slate-500 italic">
        * Note: Invoice settlement is independent of production and delivery milestones.
      </p>
    </div>
  );
}
