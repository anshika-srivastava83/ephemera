'use client';

import { useState } from 'react';
import { Loader2, Lock, Unlock } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';

// Closes or reopens guest submissions for an event (owner-only on the server).
// `onChange` receives the event's new status once the server confirms it.
export function SubmissionsToggle({ eventId, status, onChange, disabled = false, className = '' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const isOpen = status === 'open';

  async function apply(action) {
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/${action}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The server could not change this event.');
      const next = action === 'close' ? 'closed' : 'open';
      onChange?.(next);
      toast.success(
        next === 'closed'
          ? 'Submissions closed. Guests can no longer send photos.'
          : 'Submissions reopened. Guests can send photos again.'
      );
    } catch (err) {
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
      setConfirmClose(false);
    }
  }

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={isOpen}
        disabled={disabled || busy}
        onClick={() => (isOpen ? setConfirmClose(true) : apply('reopen'))}
        title={disabled ? 'Only the event owner can change this' : undefined}
        className={`inline-flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
            : 'bg-ivory border-ink/20 text-ink-muted hover:border-sepia hover:text-ink'
        } ${className}`}
      >
        <span
          className={`relative w-9 h-5 rounded-full transition-colors ${isOpen ? 'bg-emerald-500' : 'bg-ink/25'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 flex items-center justify-center ${
              isOpen ? 'translate-x-4' : ''
            }`}
          >
            {busy && <Loader2 className="w-3 h-3 animate-spin text-ink-muted" />}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          {isOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          {isOpen ? 'Accepting photos' : 'Submissions closed'}
        </span>
      </button>

      <ConfirmDialog
        open={confirmClose}
        busy={busy}
        title="Close submissions?"
        confirmLabel="Close submissions"
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => apply('close')}
      >
        Guests will no longer be able to send or replace photographs. Photos already on the wall stay
        there, and you can reopen submissions at any time.
      </ConfirmDialog>
    </>
  );
}
