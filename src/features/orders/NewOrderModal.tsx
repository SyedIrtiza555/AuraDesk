import React, { useState } from 'react';
import { useUIStore } from '../../shared/store';
import { Button, Input } from '../../shared/ui';
import { PlusCircle, X, DollarSign, User, Phone, FileText } from 'lucide-react';
import type { Order } from '../../shared/types';

interface NewOrderModalProps {
  onCreateOrder: (order: Partial<Order>) => Promise<void>;
}

export function NewOrderModal({ onCreateOrder }: NewOrderModalProps) {
  const isNewOrderModalOpen = useUIStore((s) => s.isNewOrderModalOpen);
  const closeNewOrderModal = useUIStore((s) => s.closeNewOrderModal);
  const currentUser = useUIStore((s) => s.currentUser);

  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [agreedPrice, setAgreedPrice] = useState('');
  const [projectBrief, setProjectBrief] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isNewOrderModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onCreateOrder({
        title: title.trim(),
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        agreed_price: parseFloat(agreedPrice) || 0,
        project_brief: projectBrief.trim(),
        status: 'SUBMITTED_TO_ADMIN',
        sales_agent_id: currentUser?.uid || 'anonymous',
        sales_agent_name: currentUser?.displayName || 'Sales Agent',
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      // Reset form
      setTitle('');
      setClientName('');
      setClientPhone('');
      setAgreedPrice('');
      setProjectBrief('');
      closeNewOrderModal();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Client Order Intake</h3>
              <p className="text-xs text-slate-400">
                Register a new client engagement into the Aura Desk pipeline.
              </p>
            </div>
          </div>
          <button
            onClick={closeNewOrderModal}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Order Title / Design Description
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Three Stone Platinum Halo Ring"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Client Name
              </label>
              <Input
                type="text"
                required
                placeholder="Patrick Archer"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Client Phone (WhatsApp)
              </label>
              <Input
                type="tel"
                required
                placeholder="+1 555-0199"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Agreed Price ($ USD)
            </label>
            <Input
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="1450.00"
              value={agreedPrice}
              onChange={(e) => setAgreedPrice(e.target.value)}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              * Note: Agreed Price and Phone are strictly masked from Designers.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Project Brief & Specifications
            </label>
            <textarea
              required
              rows={4}
              placeholder="Detail metal alloy, prong settings, stone dimensions, target delivery date..."
              value={projectBrief}
              onChange={(e) => setProjectBrief(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeNewOrderModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit to Admin Review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
