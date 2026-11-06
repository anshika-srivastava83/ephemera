'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

// Accessible confirmation modal. `tone="danger"` styles the confirm button for
// destructive actions. Escape and backdrop click cancel unless `busy`.
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    cancelRef.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape' && !busy) onCancel?.();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel?.()}
    >
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="dialog-panel">
        <h2 id="confirm-title" className="font-editorial text-3xl text-ink font-normal mb-2">
          {title}
        </h2>
        <div className="text-sm text-ink-muted font-light leading-relaxed mb-6">{children}</div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-editorial btn-editorial-secondary text-sm px-5 py-2.5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className={`btn-editorial text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed ${
              tone === 'danger' ? 'btn-editorial-danger' : 'btn-editorial-primary'
            }`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
