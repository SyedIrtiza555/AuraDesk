import React, { useState } from 'react';
import { useUIStore } from '../../shared/store';
import { Button } from '../../shared/ui';
import { AlertCircle, X, Send } from 'lucide-react';
import type { Order } from '../../shared/types';

interface EscalateModalProps {
  onConfirmEscalate: (order: Order, escalationNote: string) => Promise<void>;
}

export function EscalateModal({ onConfirmEscalate }: EscalateModalProps) {
  const isEscalateModalOpen = useUIStore((s) => s.isEscalateModalOpen);
  const escalatingOrder = useUIStore((s) => s.escalatingOrder);
  const closeEscalateModal = useUIStore((s) => s.closeEscalateModal);

  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isEscalateModalOpen || !escalatingOrder) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirmEscalate(escalatingOrder, note);
      setNote('');
      closeEscalateModal();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Escalate & Return to Agent</h3>
              <p className="text-xs text-slate-400">
                Unlock order for agent to contact client and update brief/pricing.
              </p>
            </div>
          </div>
          <button
            onClick={closeEscalateModal}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300">
            Order: <strong className="text-white">{escalatingOrder.title}</strong>
            <br />
            Originating Agent:{' '}
            <span className="text-indigo-400 font-medium">
              {escalatingOrder.sales_agent_name}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Escalation Feedback / Clarification Request
            </label>
            <textarea
              required
              rows={4}
              placeholder="State what needs revision from client (e.g. Price dispute, missing finger size, conflict with alloy)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeEscalateModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !note.trim()}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {submitting ? 'Escalating...' : 'Return Order to Agent'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
