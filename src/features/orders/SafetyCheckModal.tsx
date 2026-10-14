import React, { useState } from 'react';
import { useUIStore } from '../../shared/store';
import { Button, Input, Modal, cn } from '../../shared/ui';
import { copyToClipboard } from '../../shared/notifications';
import { ShieldCheck, Copy, Check, MessageCircle } from 'lucide-react';
import type { Order } from '../../shared/types';

interface SafetyCheckModalProps {
  onConfirmDelivery: (order: Order) => Promise<void>;
}

export function SafetyCheckModal({ onConfirmDelivery }: SafetyCheckModalProps) {
  const isOpen = useUIStore((s) => s.isDeliveryModalOpen);
  const order = useUIStore((s) => s.deliveryModalOrder);
  const close = useUIStore((s) => s.closeDeliveryModal);
  const currentUser = useUIStore((s) => s.currentUser);

  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!order) return null;

  // Deterministic delivery code: <Designer initials>-<Client initials>-<Order title>
  const designerInitials =
    order.assigned_designer_initials ||
    currentUser?.initials ||
    order.assigned_designer_name?.slice(0, 2).toUpperCase() ||
    'DS';
  const clientInitials =
    order.client_name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0].toUpperCase())
      .slice(0, 2)
      .join('') || 'CL';
  const expectedCode = `${designerInitials}-${clientInitials}-${order.title}`;
  const isMatched = inputCode.trim() === expectedCode;

  const handleClose = () => {
    setInputCode('');
    close();
  };

  const handleCopy = async () => {
    await copyToClipboard(expectedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatched) return;
    setSubmitting(true);
    try {
      await onConfirmDelivery({ ...order, delivery_code: expectedCode, delivered_at: Date.now() });
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="deliver" variant="success" disabled={!isMatched} loading={submitting}>
            <Check className="w-3.5 h-3.5" /> Confirm delivery
          </Button>
        </>
      }
      open={isOpen}
      onClose={handleClose}
      tone="success"
      icon={<ShieldCheck />}
      title="Confirm WhatsApp delivery"
      description="A quick check so nothing is marked delivered by accident. Paste the code into your WhatsApp message, then type it here."
    >
      <form id="deliver" onSubmit={handleSubmit} className="space-y-3">
        <div className="rounded-md bg-surface-muted border border-line p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <MessageCircle className="w-3.5 h-3.5" /> Delivery code for {order.client_name}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="flex-1 font-mono text-[13px] text-ink break-all" data-selectable>
              {expectedCode}
            </span>
            <Button type="button" size="sm" variant="secondary" onClick={handleCopy}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div>
          <Input
            autoFocus
            placeholder="Type or paste the code"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            className={cn('font-mono', isMatched && 'border-emerald-500 ring-2 ring-emerald-200')}
          />
          <p className={cn('mt-1.5 text-xs', isMatched ? 'text-emerald-700 font-semibold' : 'text-muted')}>
            {isMatched
              ? 'Code matches. You can confirm the delivery.'
              : inputCode
                ? "Doesn't match yet. It's case- and space-sensitive."
                : 'Must match exactly.'}
          </p>
        </div>
      </form>

    </Modal>
  );
}
