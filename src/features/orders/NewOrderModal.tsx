import React, { useState } from 'react';
import { useUIStore } from '../../shared/store';
import { Button, Field, Input, Modal, Textarea } from '../../shared/ui';
import { Gem, User, Phone, DollarSign, FileText, Lock, CalendarDays } from 'lucide-react';
import type { Order } from '../../shared/types';

interface NewOrderModalProps {
  onCreateOrder: (order: Partial<Order>) => Promise<void>;
}

const EMPTY = { title: '', clientName: '', clientPhone: '', agreedPrice: '', projectBrief: '', dueDate: '' };

export function NewOrderModal({ onCreateOrder }: NewOrderModalProps) {
  const isOpen = useUIStore((s) => s.isNewOrderModalOpen);
  const close = useUIStore((s) => s.closeNewOrderModal);
  const currentUser = useUIStore((s) => s.currentUser);

  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const now = Date.now();
      await onCreateOrder({
        title: form.title.trim(),
        client_name: form.clientName.trim(),
        client_phone: form.clientPhone.trim(),
        agreed_price: parseFloat(form.agreedPrice) || 0,
        project_brief: form.projectBrief.trim(),
        status: 'SUBMITTED_TO_ADMIN',
        sales_agent_id: currentUser?.uid || 'anonymous',
        sales_agent_name: currentUser?.displayName || 'Sales Agent',
        created_at: now,
        updated_at: now,
        ...(form.dueDate ? { due_date: new Date(form.dueDate).getTime() } : {}),
      });
      setForm(EMPTY);
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
          <Button type="submit" form="new-order" variant="accent" loading={submitting}>
            Submit for assignment
          </Button>
        </>
      }
      open={isOpen}
      onClose={close}
      size="lg"
      tone="accent"
      icon={<Gem />}
      title="New order"
      description="Capture the client's request. It goes to an admin, who assigns a designer."
    >
      <form id="new-order" onSubmit={handleSubmit} className="space-y-3">
        <Field label="What are we making?">
          <Input
            required
            autoFocus
            placeholder="e.g. Three-stone platinum halo ring"
            value={form.title}
            onChange={set('title')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Client name" icon={<User />}>
            <Input required placeholder="Patrick Archer" value={form.clientName} onChange={set('clientName')} />
          </Field>
          <Field label="WhatsApp number" icon={<Phone />}>
            <Input required type="tel" placeholder="+1 555 0199" value={form.clientPhone} onChange={set('clientPhone')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Agreed price (USD)" icon={<DollarSign />}>
            <Input required type="number" min="0" step="0.01" placeholder="1450" value={form.agreedPrice} onChange={set('agreedPrice')} />
          </Field>
          <Field label="Due date" icon={<CalendarDays />} hint="Optional. Defaults to 5 days.">
            <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
          </Field>
        </div>

        <Field label="Design brief" icon={<FileText />}>
          <Textarea
            required
            rows={4}
            placeholder="Metal and karat, stone shapes and sizes, setting style, finger size, references…"
            value={form.projectBrief}
            onChange={set('projectBrief')}
          />
        </Field>

        <div className="flex items-center gap-2 text-xs text-muted">
          <Lock className="w-3.5 h-3.5" /> Price and phone number are hidden from designers.
        </div>
      </form>

    </Modal>
  );
}
