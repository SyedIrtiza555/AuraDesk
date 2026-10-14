import React, { useState } from 'react';
import { useUIStore } from '../../shared/store';
import { Button, Input } from '../../shared/ui';
import { copyToClipboard } from '../../shared/notifications';
import { ShieldCheck, X, Copy, Check, AlertTriangle } from 'lucide-react';
import type { Order } from '../../shared/types';

interface SafetyCheckModalProps {
  onConfirmDelivery: (order: Order) => Promise<void>;
}

export function SafetyCheckModal({ onConfirmDelivery }: SafetyCheckModalProps) {
  const isDeliveryModalOpen = useUIStore((s) => s.isDeliveryModalOpen);
  const deliveryModalOrder = useUIStore((s) => s.deliveryModalOrder);
  const closeDeliveryModal = useUIStore((s) => s.closeDeliveryModal);
  const currentUser = useUIStore((s) => s.currentUser);

  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isDeliveryModalOpen || !deliveryModalOrder) return null;

  // Formulate deterministic delivery code: <Designer Initials>-<Prospect Initials>-<Order Title>
  const designerInitials =
    deliveryModalOrder.assigned_designer_initials ||
    currentUser?.initials ||
    deliveryModalOrder.assigned_designer_name?.slice(0, 2).toUpperCase() ||
    'DS';

  const prospectInitials = deliveryModalOrder.client_name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .slice(0, 2)
    .join('') || 'CL';

  const expectedCode = `${designerInitials}-${prospectInitials}-${deliveryModalOrder.title}`;

  const isMatched = inputCode.trim() === expectedCode;

  const handleCopyExpected = async () => {
    await copyToClipboard(expectedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatched) return;

    setSubmitting(true);
    try {
      await onConfirmDelivery({
        ...deliveryModalOrder,
        delivery_code: expectedCode,
        delivered_at: Date.now(),
      });
      setInputCode('');
      closeDeliveryModal();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                WhatsApp Delivery Verification Gate
              </h3>
              <p className="text-xs text-slate-400">
                Safety confirmation before dispatching customer deliverable.
              </p>
            </div>
          </div>
          <button
            onClick={closeDeliveryModal}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                To prevent accidental completions, external delivery requires deterministic code verification. Match the code generated below:
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-900 px-3.5 py-2.5 rounded-lg border border-slate-700/80">
              <span className="font-mono text-sm font-bold text-indigo-300 tracking-wide select-all">
                {expectedCode}
              </span>
              <button
                type="button"
                onClick={handleCopyExpected}
                className="text-slate-400 hover:text-indigo-300 p-1 rounded transition-colors flex items-center gap-1 text-xs"
                title="Copy Code"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Type the exact verification code above:
            </label>
            <Input
              type="text"
              autoFocus
              placeholder="e.g. FA-PA-Three Stone Ring"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="font-mono text-sm py-2.5"
            />
            {inputCode.length > 0 && !isMatched && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">
                Code does not match expected pattern. Please type or paste correctly.
              </p>
            )}
            {isMatched && (
              <p className="mt-1.5 text-xs text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Code verified and unlocked!
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeDeliveryModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!isMatched || submitting}
              className={isMatched ? 'bg-emerald-600 hover:bg-emerald-500' : ''}
            >
              {submitting ? 'Confirming...' : 'Confirm Delivery to WhatsApp'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
