import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { PendingConfirmation } from '../types';

interface ConfirmModalProps {
  confirmation: PendingConfirmation | null;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  confirmation,
  onClose,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  if (!confirmation) return null;

  const isDanger = confirmation.variant === 'danger';

  const handleConfirm = async () => {
    setSubmitting(true);
    setModalError(null);
    try {
      await confirmation.onConfirm();
      onClose();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isDanger
                  ? 'bg-red-50 text-red-700'
                  : 'bg-teal-50 text-teal-700'
              }`}
            >
              {isDanger ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <h2
              id="confirm-modal-title"
              className="font-display text-base font-semibold text-slate-900"
            >
              {confirmation.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-emerald-700"
            aria-label="Tutup dialog konfirmasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-slate-700">
            {confirmation.description}
          </p>

          {confirmation.details.length > 0 && (
            <ul className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
              {confirmation.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-0.5 text-slate-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="break-words">{detail}</span>
                </li>
              ))}
            </ul>
          )}

          {modalError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {modalError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-3.5 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[44px] whitespace-nowrap shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`min-h-[44px] whitespace-nowrap shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              isDanger
                ? 'bg-red-700 hover:bg-red-800'
                : 'bg-[#0F766E] hover:bg-[#0D5D57]'
            }`}
          >
            {submitting ? 'Memproses...' : confirmation.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
