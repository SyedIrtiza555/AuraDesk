import React, { useState } from 'react';
import { useUIStore } from '../../shared/store';
import { Avatar, Button, Modal, Textarea } from '../../shared/ui';
import { Undo2, Send } from 'lucide-react';
import type { Order } from '../../shared/types';

interface EscalateModalProps {
  onConfirmEscalate: (order: Order, escalationNote: string) => Promise<void>;
}

const QUICK_REASONS = ['Finger size missing', 'Price needs confirming', 'Stone details unclear', 'Need reference photos'];

export function EscalateModal({ onConfirmEscalate }: EscalateModalProps) {
  const isOpen = useUIStore((s) => s.isEscalateModalOpen);
  const order = useUIStore((s) => s.escalatingOrder);
  const close = useUIStore((s) => s.closeEscalateModal);

  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirmEscalate(order, note.trim());
      setNote('');
      close();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      footer={
        <>
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="escalate" variant="primary" disabled={!note.trim()} loading={submitting}>
            <Send className="w-3.5 h-3.5" /> Send back
          </Button>
        </>
      }
      open={isOpen}
      onClose={close}
      tone="warning"
      icon={<Undo2 />}
      title="Send back to the agent"
      description="The agent gets this order back to clarify details with the client, then re-submits it."
    >
      <form id="escalate" onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-md bg-surface-muted border border-line p-2.5">
          <Avatar name={order.sales_agent_name} size="sm" />
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-ink truncate">{order.title}</div>
            <div className="text-xs text-muted">Going back to {order.sales_agent_name}</div>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-1 mb-2">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNote((n) => (n ? `${n}\n${r}` : r))}
                className="h-6 px-2 rounded-md text-xs bg-surface border border-line hover:border-line-strong text-ink-muted"
              >
                + {r}
              </button>
            ))}
          </div>
          <Textarea
            required
            autoFocus
            rows={4}
            placeholder="What does the agent need to find out from the client?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </form>

    </Modal>
  );
}
