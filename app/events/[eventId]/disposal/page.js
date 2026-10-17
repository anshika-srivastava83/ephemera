'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Layers,
  Flame,
  Loader2,
  ImageOff,
} from 'lucide-react';
import { useHostRole } from '../../../../lib/useHostRole';
import { AccessDenied } from '../../../../components/brand/AccessDenied';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { useToast } from '../../../../components/ui/Toast';

// Turns the API's file report into an honest sentence.
function describeFiles(files) {
  if (!files) return '';
  const parts = [];
  if (files.removed) parts.push(`${files.removed} image file${files.removed === 1 ? '' : 's'} deleted from storage`);
  if (files.external) {
    parts.push(
      `${files.external} image${files.external === 1 ? ' is' : 's are'} hosted elsewhere and could not be removed from here`
    );
  }
  if (files.failed) parts.push(`${files.failed} file${files.failed === 1 ? '' : 's'} could NOT be deleted`);
  return parts.join('; ');
}

export default function DisposalPage({ params }) {
  const { eventId } = params;
  const { role, loaded: roleLoaded } = useHostRole();
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // 'dispose' | 'delete' | null — which confirmation dialog is open
  const [dialog, setDialog] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Last completed action, shown as an honest receipt
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function loadEventData() {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        setEvent(data.events?.find((e) => e.id === eventId) || null);
      } catch (e) {
        console.error('Failed loading event for disposal', e);
      } finally {
        setLoading(false);
      }
    }
    loadEventData();
  }, [eventId]);

  const isOwner = role === 'owner';
  const hasFinal = Boolean(event?.final_wall_image_url);
  const totalPhotos = (event?.approvedCount || 0) + (event?.pendingCount || 0) + (event?.rejectedCount || 0);

  const phrase = dialog === 'delete' ? event?.name || '' : 'let go';
  const phraseOk = confirmText.trim().toLowerCase() === phrase.trim().toLowerCase() && phrase !== '';

  function openDialog(kind) {
    setDialog(kind);
    setConfirmText('');
    setError('');
  }

  function closeDialog() {
    if (busy) return;
    setDialog(null);
  }

  async function run() {
    setBusy(true);
    setError('');
    const kind = dialog;
    try {
      const res = await fetch(`/api/events/${eventId}/${kind === 'dispose' ? 'dispose' : 'delete-wall'}`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The server could not complete this request.');

      const note = describeFiles(data.files);
      const incomplete = Boolean(data.files?.failed);
      setResult({ kind, incomplete, count: data.submissions, note });
      setDialog(null);
      if (incomplete) toast.error('Finished with problems — see the details below.');
      else toast.success(kind === 'dispose' ? 'Photographs disposed.' : 'Event deleted.');
      if (kind === 'dispose') {
        setEvent((ev) => (ev ? { ...ev, approvedCount: 0, pendingCount: 0, rejectedCount: 0 } : ev));
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Nothing has been reported as deleted.');
    } finally {
      setBusy(false);
    }
  }

  if (roleLoaded && !role) return <AccessDenied />;

  return (
    <div className="min-h-screen flex flex-col selection:bg-sepia selection:text-white">
      <header className="px-6 py-4 glass-nav flex items-center gap-3 border-b border-ink/10">
        <Link
          href={`/events/${eventId}`}
          className="text-xs uppercase tracking-wider text-ink-muted hover:text-ink font-semibold flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Workspace</span>
        </Link>
        <span className="text-xs text-ink-faint">•</span>
        <span className="font-editorial text-xl text-ink font-normal">Disposal &amp; deletion</span>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-6 py-10">
        {loading ? (
          <div className="py-24 text-center text-ink-muted" role="status">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-sepia mb-3" />
            <p className="font-editorial text-2xl">Loading event…</p>
          </div>
        ) : !event ? (
          <div className="py-20 text-center">
            <p className="font-editorial text-3xl text-ink mb-2">Event not found</p>
            <Link href="/owner/dashboard" className="text-sm text-sepia underline">
              Back to events
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-ink mb-2">
              {event.name}
            </h1>
            <p className="text-sm text-ink-muted font-light mb-8 max-w-xl">
              Two different actions live here. Disposing photographs keeps your finished wall.
              Deleting the event removes everything, including the wall.
            </p>

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                role="status"
                className={`mb-8 p-5 rounded-2xl border text-sm ${
                  result.incomplete
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.incomplete ? (
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-700" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {result.kind === 'dispose'
                        ? result.incomplete
                          ? 'Photographs removed from the event, but some files remain.'
                          : 'Photographs disposed.'
                        : result.incomplete
                        ? 'Event deleted, but some files remain.'
                        : 'Event deleted.'}
                    </p>
                    {result.kind === 'dispose' && typeof result.count === 'number' && (
                      <p className="font-light">
                        {result.count} submission record{result.count === 1 ? '' : 's'} removed.
                      </p>
                    )}
                    {result.note && <p className="font-light">{result.note}.</p>}
                    {result.incomplete && (
                      <p className="font-light">
                        The files that could not be deleted are still on the server. Check storage permissions
                        and run disposal again.
                      </p>
                    )}
                    {result.kind === 'delete' && (
                      <p className="pt-2">
                        <Link href="/owner/dashboard" className="underline font-medium">
                          Back to events
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {!isOwner && (
              <div className="mb-8 p-4 rounded-xl bg-paper-dark/60 border border-ink/10 text-xs text-ink-muted">
                Only the event owner can dispose of photographs or delete the event. Collaborators can view
                this page but not run these actions.
              </div>
            )}

            {result?.kind !== 'delete' && (
              <div className="space-y-6">
                {/* Dispose photographs */}
                <section className="bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-10 h-10 rounded-full bg-sepia/10 text-sepia flex items-center justify-center">
                      <Flame className="w-5 h-5" />
                    </span>
                    <h2 className="font-editorial text-3xl font-normal text-ink">Dispose of photographs</h2>
                  </div>
                  <p className="text-sm text-ink-muted font-light leading-relaxed mb-5">
                    Removes every guest photograph, caption, and guest contact record for this event — the
                    approved, pending, and rejected ones. Your finalised wall artwork is kept.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3 mb-5 text-xs">
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70">
                      <strong className="block text-emerald-950 mb-1">Kept</strong>
                      <span className="text-emerald-900 font-light">
                        The finalised wall image, and the event itself.
                      </span>
                    </div>
                    <div className="p-4 rounded-xl border border-rose/40 bg-rose/10">
                      <strong className="block text-ink mb-1">Removed</strong>
                      <span className="text-ink-muted font-light">
                        All guest photos and Polaroids ({totalPhotos || 'none'} on record), captions, and
                        emails used for guest links.
                      </span>
                    </div>
                  </div>

                  {!hasFinal && (
                    <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold block">Finalise the wall first.</strong>
                        Disposal is locked until the wall artwork exists, so you don’t lose the only copy of
                        the night.{' '}
                        <Link href={`/events/${eventId}/tapestry`} className="underline font-medium">
                          Go to finalisation
                        </Link>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openDialog('dispose')}
                    disabled={!isOwner || !hasFinal}
                    className="btn-editorial btn-editorial-danger px-5 py-3 text-sm disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Dispose of photographs…</span>
                  </button>
                </section>

                {/* Delete event */}
                <section className="bg-ivory border border-red-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                      <ImageOff className="w-5 h-5" />
                    </span>
                    <h2 className="font-editorial text-3xl font-normal text-ink">Delete this event</h2>
                  </div>
                  <p className="text-sm text-ink-muted font-light leading-relaxed mb-5">
                    Deletes the event, its public wall page, every guest photograph, and the finalised wall
                    artwork. Guest status links stop working. <strong>Download the artwork first</strong> if
                    you want to keep it.
                  </p>
                  {hasFinal && (
                    <Link
                      href={`/events/${eventId}/tapestry`}
                      className="inline-flex items-center gap-1.5 text-xs text-sepia underline mb-5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Open the finalised artwork to download it</span>
                    </Link>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => openDialog('delete')}
                      disabled={!isOwner}
                      className="btn-editorial btn-editorial-danger px-5 py-3 text-sm disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete event…</span>
                    </button>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </main>

      <ConfirmDialog
        open={Boolean(dialog)}
        tone="danger"
        busy={busy}
        confirmDisabled={!phraseOk}
        title={dialog === 'delete' ? 'Delete this event?' : 'Dispose of all photographs?'}
        confirmLabel={busy ? 'Working…' : dialog === 'delete' ? 'Delete event' : 'Dispose photographs'}
        onCancel={closeDialog}
        onConfirm={() => phraseOk && run()}
      >
        <p className="mb-3">
          {dialog === 'delete'
            ? 'This permanently deletes the event, all photographs, and the finalised wall. It cannot be undone.'
            : 'This permanently removes every guest photograph and caption for this event. The finalised wall is kept. It cannot be undone.'}
        </p>
        <label htmlFor="confirm-phrase" className="block text-xs font-semibold text-ink mb-1.5">
          Type <span className="font-mono">{phrase}</span> to confirm
        </label>
        <input
          id="confirm-phrase"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && phraseOk && !busy && run()}
          autoComplete="off"
          className="input-editorial font-mono text-sm"
          disabled={busy}
        />
        {!phraseOk && confirmText && (
          <p className="text-[11px] text-ink-faint mt-1.5">Keep typing — it has to match exactly.</p>
        )}
        {error && (
          <p role="alert" className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
