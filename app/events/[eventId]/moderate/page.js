'use client';

import { useState, useEffect, useRef, useCallback, createRef } from 'react';
import Link from 'next/link';
import TinderCard from 'react-tinder-card';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Edit3,
  RotateCcw,
  Eye,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { compositePolaroid } from '../../../../lib/compositePolaroid';
import { AccessDenied } from '../../../../components/brand/AccessDenied';
import { PolaroidCard } from '../../../../components/polaroid/PolaroidCard';
import { useToast } from '../../../../components/ui/Toast';

const CAPTION_LIMIT = 120;
const POLL_MS = 8000;

// Swipe left = approve, swipe right = reject (per the moderation spec).
const DIRECTION_FOR = { approve: 'left', reject: 'right' };

export default function ModerationStudio({ params }) {
  const { eventId } = params;
  const toast = useToast();

  const [pending, setPending] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'ready' | 'error' | 'denied'
  const [loadError, setLoadError] = useState('');
  const [reviewedCount, setReviewedCount] = useState(0);

  // Cards that have been decided but are still animating off screen
  const [decided, setDecided] = useState({});
  const decidedRef = useRef({});
  const cardRefs = useRef({});
  const [epoch, setEpoch] = useState(0); // bump to remount cards after a failed save

  const [lastDecision, setLastDecision] = useState(null); // { sub, action }
  const [banner, setBanner] = useState(null); // 'approved' | 'rejected'
  const [undoing, setUndoing] = useState(false);
  const [dragHint, setDragHint] = useState(null); // 'left' | 'right' while past threshold

  // Caption editor
  const [editingSub, setEditingSub] = useState(null);
  const [newCaption, setNewCaption] = useState('');
  const [isUpdatingCaption, setIsUpdatingCaption] = useState(false);
  const [captionError, setCaptionError] = useState('');

  const queue = pending.filter((s) => !decided[s.id]);
  const topCard = queue[0];
  const totalSeen = reviewedCount + queue.length;

  const loadQueue = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoadState('loading');
      try {
        const res = await fetch(`/api/events/${eventId}/pending-submissions`, { method: 'POST' });
        if (res.status === 401) {
          setLoadState('denied');
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load the queue.');
        const incoming = data.submissions || [];
        setPending((prev) => {
          if (!silent) return incoming;
          // Merge: keep what the host is looking at, append genuinely new arrivals
          const known = new Set(prev.map((s) => s.id));
          const fresh = incoming.filter((s) => !known.has(s.id) && !decidedRef.current[s.id]);
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        setLoadState('ready');
      } catch (err) {
        if (!silent) {
          setLoadError(
            err instanceof TypeError ? 'Could not reach the server. Check your connection.' : err.message
          );
          setLoadState('error');
        }
      }
    },
    [eventId]
  );

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Pick up new guest submissions while the studio is open
  useEffect(() => {
    if (loadState !== 'ready') return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && !editingSub) loadQueue({ silent: true });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loadState, editingSub, loadQueue]);

  function flashBanner(kind) {
    setBanner(kind);
    setTimeout(() => setBanner((b) => (b === kind ? null : b)), 1400);
  }

  // Called when a card is swiped (by hand, button or keyboard).
  async function decide(direction, sub) {
    if (!sub || decidedRef.current[sub.id]) return;
    const action = direction === DIRECTION_FOR.approve ? 'approve' : 'reject';

    decidedRef.current = { ...decidedRef.current, [sub.id]: action };
    setDecided(decidedRef.current);
    setDragHint(null);
    flashBanner(action === 'approve' ? 'approved' : 'rejected');

    try {
      const res = await fetch(`/api/submissions/${sub.id}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'The server rejected the change.');
      }
      setReviewedCount((n) => n + 1);
      setLastDecision({ sub, action });
    } catch (err) {
      // Put the card back so nothing is silently lost
      const { [sub.id]: _gone, ...rest } = decidedRef.current;
      decidedRef.current = rest;
      setDecided(rest);
      setPending((prev) => (prev.some((s) => s.id === sub.id) ? prev : [sub, ...prev]));
      setEpoch((e) => e + 1);
      toast.error(`Couldn’t ${action} that photograph — it’s back in the queue. ${err.message}`);
    }
  }

  // Once the exit animation finishes, drop the card from the list.
  function handleCardLeft(id) {
    if (!decidedRef.current[id]) return;
    setPending((prev) => prev.filter((s) => s.id !== id));
  }

  function swipeTop(action) {
    if (!topCard || decidedRef.current[topCard.id]) return;
    const ref = cardRefs.current[topCard.id];
    const direction = DIRECTION_FOR[action];
    if (ref?.current?.swipe) ref.current.swipe(direction);
    else decide(direction, topCard);
  }

  async function handleUndo() {
    if (!lastDecision || undoing) return;
    setUndoing(true);
    const { sub } = lastDecision;
    try {
      const res = await fetch(`/api/submissions/${sub.id}/pending`, { method: 'POST' });
      if (!res.ok) throw new Error('The server could not undo that.');
      const { [sub.id]: _gone, ...rest } = decidedRef.current;
      decidedRef.current = rest;
      setDecided(rest);
      setPending((prev) => (prev.some((s) => s.id === sub.id) ? prev : [sub, ...prev]));
      setEpoch((e) => e + 1);
      setReviewedCount((n) => Math.max(0, n - 1));
      setLastDecision(null);
      toast.info('Last decision undone.');
    } catch (err) {
      toast.error(err.message || 'Undo failed.');
    } finally {
      setUndoing(false);
    }
  }

  function openCaptionEditor(sub) {
    if (!sub) return;
    setEditingSub(sub);
    setNewCaption(sub.caption || '');
    setCaptionError('');
  }

  async function saveCaption() {
    if (!editingSub) return;
    setIsUpdatingCaption(true);
    setCaptionError('');
    try {
      const blob = await compositePolaroid(editingSub.photo_url, newCaption);
      const formData = new FormData();
      formData.append('file', blob, `polaroid-${Date.now()}.jpg`);
      formData.append('folder', eventId);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Could not save the new Polaroid image.');

      const res = await fetch(`/api/submissions/${editingSub.id}/update-caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: newCaption.trim(), polaroidUrl: uploadData.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Caption could not be saved.');

      setPending((prev) =>
        prev.map((s) =>
          s.id === editingSub.id
            ? { ...s, caption: newCaption.trim(), polaroid_url: uploadData.url }
            : s
        )
      );
      setEditingSub(null);
      toast.success('Caption updated.');
    } catch (err) {
      setCaptionError(err.message || 'Caption update failed.');
    } finally {
      setIsUpdatingCaption(false);
    }
  }

  // Keyboard: ← approve, → pass, E edit, Z undo. Ignores key-repeat to avoid skipping photos.
  useEffect(() => {
    function onKeyDown(e) {
      if (editingSub || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        swipeTop('approve');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        swipeTop('reject');
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        openCaptionEditor(topCard);
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topCard, editingSub, lastDecision, undoing]);

  if (loadState === 'denied') return <AccessDenied />;

  // Cards to render: those leaving the screen plus the top three still in the queue
  const stack = [...pending.filter((s) => decided[s.id]), ...queue.slice(0, 3)];
  const ordered = [...stack].reverse(); // top card renders last

  const progressPct = totalSeen > 0 ? Math.round((reviewedCount / totalSeen) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col selection:bg-sepia selection:text-white">
      <header className="px-6 py-4 glass-nav flex items-center justify-between gap-3 border-b border-ink/10">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/events/${eventId}`}
            className="text-xs uppercase tracking-wider text-ink-muted hover:text-ink font-semibold flex items-center gap-1 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Workspace</span>
          </Link>
          <span className="text-xs text-ink-faint">•</span>
          <span className="font-editorial text-xl text-ink font-normal truncate">Moderation studio</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleUndo}
            disabled={!lastDecision || undoing}
            className="btn-editorial btn-editorial-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Undo last decision (Z)"
          >
            {undoing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-sepia" />
            )}
            <span>Undo</span>
          </button>
          <Link
            href={`/wall/${eventId}`}
            target="_blank"
            className="btn-editorial btn-editorial-secondary text-xs px-3 py-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View wall</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
        {loadState === 'loading' && (
          <div className="w-72 sm:w-80" role="status" aria-label="Loading queue">
            <div className="rounded-sm bg-paper-dark/70 animate-pulse" style={{ aspectRatio: '880 / 1044' }} />
            <p className="text-center text-sm text-ink-muted mt-4 font-light">Loading the queue…</p>
          </div>
        )}

        {loadState === 'error' && (
          <div
            role="alert"
            className="text-center py-14 px-6 max-w-md bg-ivory border border-red-200 rounded-2xl shadow-sm"
          >
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
            <h2 className="font-editorial text-3xl font-normal text-ink mb-2">Couldn’t load the queue</h2>
            <p className="text-sm text-ink-muted font-light mb-6">{loadError}</p>
            <button
              onClick={() => loadQueue()}
              className="btn-editorial btn-editorial-primary text-sm px-5 py-2.5"
            >
              Try again
            </button>
          </div>
        )}

        {loadState === 'ready' && stack.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-14 px-6 max-w-md bg-ivory border border-ink/10 rounded-2xl shadow-sm"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6" />
            </div>
            <h2 className="font-editorial text-4xl font-normal text-ink mb-2">Queue is clear</h2>
            <p className="text-sm text-ink-muted font-light leading-relaxed mb-6">
              {reviewedCount > 0
                ? `You reviewed ${reviewedCount} photograph${reviewedCount === 1 ? '' : 's'}. `
                : ''}
              New submissions will appear here on their own — you don’t need to refresh.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href={`/events/${eventId}`}
                className="btn-editorial btn-editorial-secondary text-xs px-4 py-2"
              >
                Back to workspace
              </Link>
              <Link
                href={`/wall/${eventId}`}
                target="_blank"
                className="btn-editorial btn-editorial-primary text-xs px-4 py-2"
              >
                Watch the wall
              </Link>
            </div>
          </motion.div>
        )}

        {loadState === 'ready' && stack.length > 0 && (
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* Queue progress */}
            <div className="w-72 sm:w-80 mb-4">
              <div className="flex items-baseline justify-between text-xs text-ink-muted mb-1.5">
                <span>
                  <strong className="text-ink">{queue.length}</strong> left to review
                </span>
                <span className="text-ink-faint">{reviewedCount} done</span>
              </div>
              <div
                className="h-1 rounded-full bg-ink/10 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
                aria-label="Review progress"
              >
                <div
                  className="h-full bg-sepia transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Decision feedback */}
            <div className="h-7 flex items-center justify-center mb-2" aria-live="polite">
              <AnimatePresence>
                {banner && (
                  <motion.span
                    key={banner}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`text-[11px] uppercase tracking-widest font-bold px-3 py-1 rounded-full border ${
                      banner === 'approved'
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        : 'text-danger bg-red-50 border-red-200'
                    }`}
                  >
                    {banner === 'approved' ? '✓ Approved — heading to the wall' : '✕ Passed'}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Card stack */}
            <div className="relative w-72 sm:w-80" style={{ aspectRatio: '880 / 1044' }}>
              {ordered.map((sub) => {
                const leaving = Boolean(decided[sub.id]);
                const stackIndex = leaving ? 0 : queue.slice(0, 3).findIndex((s) => s.id === sub.id);
                const isTop = !leaving && stackIndex === 0;
                if (!cardRefs.current[sub.id]) cardRefs.current[sub.id] = createRef();

                return (
                  <div
                    key={`${sub.id}-${epoch}`}
                    className="absolute inset-0"
                    style={{
                      transform:
                        isTop || leaving
                          ? 'none'
                          : `scale(${1 - stackIndex * 0.05}) translateY(${stackIndex * 14}px) rotate(${
                              stackIndex % 2 ? 1.4 : -1.2
                            }deg)`,
                      zIndex: leaving ? 20 : 10 - stackIndex,
                      pointerEvents: isTop ? 'auto' : 'none',
                      transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <TinderCard
                      ref={cardRefs.current[sub.id]}
                      onSwipe={(dir) => decide(dir, sub)}
                      onCardLeftScreen={() => handleCardLeft(sub.id)}
                      onSwipeRequirementFulfilled={(dir) => isTop && setDragHint(dir)}
                      onSwipeRequirementUnfulfilled={() => setDragHint(null)}
                      preventSwipe={['up', 'down']}
                      swipeRequirementType="position"
                      swipeThreshold={90}
                      className="absolute inset-0 touch-pan-y"
                    >
                      <div className="relative w-full h-full cursor-grab active:cursor-grabbing select-none">
                        <PolaroidCard
                          photoUrl={sub.photo_url}
                          polaroidUrl={sub.polaroid_url}
                          caption={sub.caption}
                          priority={isTop}
                          className="w-full shadow-polaroid-lg"
                        />
                        {isTop && dragHint && (
                          <div
                            aria-hidden
                            className={`absolute top-6 ${
                              dragHint === 'left' ? 'right-5 rotate-6' : 'left-5 -rotate-6'
                            } px-3 py-1 rounded border-4 font-bold uppercase tracking-widest text-lg bg-white/80 ${
                              dragHint === 'left'
                                ? 'text-emerald-700 border-emerald-600'
                                : 'text-danger border-danger'
                            }`}
                          >
                            {dragHint === 'left' ? 'Approve' : 'Pass'}
                          </div>
                        )}
                      </div>
                    </TinderCard>
                  </div>
                );
              })}
            </div>

            {/* Manual controls */}
            <div className="flex items-end justify-center gap-5 sm:gap-7 mt-10">
              <button
                onClick={() => swipeTop('reject')}
                disabled={!topCard}
                className="group flex flex-col items-center gap-1.5 disabled:opacity-40"
                aria-label="Pass on this photograph (right arrow)"
              >
                <span className="w-16 h-16 rounded-full bg-ivory border-2 border-danger/40 group-hover:border-danger text-danger shadow-sm group-hover:scale-105 group-active:scale-95 transition-all flex items-center justify-center">
                  <X className="w-7 h-7" />
                </span>
                <span className="text-xs font-medium text-ink-muted">Pass</span>
              </button>

              <button
                onClick={() => openCaptionEditor(topCard)}
                disabled={!topCard}
                className="group flex flex-col items-center gap-1.5 disabled:opacity-40 pb-0.5"
                aria-label="Edit caption (E)"
              >
                <span className="w-12 h-12 rounded-full bg-ivory border border-ink/20 group-hover:border-sepia text-sepia shadow-sm group-hover:scale-105 group-active:scale-95 transition-all flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </span>
                <span className="text-xs font-medium text-ink-muted">Caption</span>
              </button>

              <button
                onClick={() => swipeTop('approve')}
                disabled={!topCard}
                className="group flex flex-col items-center gap-1.5 disabled:opacity-40"
                aria-label="Approve this photograph (left arrow)"
              >
                <span className="w-16 h-16 rounded-full bg-sepia text-white shadow-md group-hover:bg-sepia-dark group-hover:scale-105 group-active:scale-95 transition-all flex items-center justify-center">
                  <Check className="w-7 h-7" />
                </span>
                <span className="text-xs font-medium text-ink-muted">Approve</span>
              </button>
            </div>

            <p className="hidden md:flex items-center gap-3 text-[11px] text-ink-faint mt-7 font-light">
              <span>← Approve</span>
              <span>•</span>
              <span>→ Pass</span>
              <span>•</span>
              <span>E Caption</span>
              <span>•</span>
              <span>Z Undo</span>
            </p>
            <p className="md:hidden text-[11px] text-ink-faint mt-6 font-light">
              Swipe left to approve, right to pass
            </p>
          </div>
        )}
      </main>

      {/* Caption editor */}
      {editingSub && (
        <div
          className="dialog-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && !isUpdatingCaption && setEditingSub(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !isUpdatingCaption) setEditingSub(null);
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveCaption();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mod-caption-title"
            className="dialog-panel !max-w-lg"
          >
            <h2 id="mod-caption-title" className="font-editorial text-3xl font-normal text-ink mb-1">
              Edit caption
            </h2>
            <p className="text-xs text-ink-muted font-light mb-4">
              Fix a typo before it reaches the wall. The Polaroid is redrawn from the original photograph.
            </p>

            <div className="grid sm:grid-cols-[150px_1fr] gap-5">
              <div className="mx-auto w-[150px]">
                <PolaroidCard
                  photoUrl={editingSub.photo_url}
                  polaroidUrl={editingSub.photo_url}
                  caption={newCaption}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="mod-caption"
                    className="text-xs uppercase tracking-wider text-ink-muted font-semibold"
                  >
                    Handwritten note
                  </label>
                  <span className="text-xs text-ink-faint">
                    {newCaption.length}/{CAPTION_LIMIT}
                  </span>
                </div>
                <textarea
                  id="mod-caption"
                  value={newCaption}
                  maxLength={CAPTION_LIMIT}
                  onChange={(e) => setNewCaption(e.target.value)}
                  rows={4}
                  placeholder="Write an inscription…"
                  className="input-editorial font-caption text-2xl w-full resize-none"
                  autoFocus
                />
              </div>
            </div>

            {captionError && (
              <p
                role="alert"
                className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
              >
                {captionError}
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingSub(null)}
                disabled={isUpdatingCaption}
                className="btn-editorial btn-editorial-secondary text-sm px-5 py-2.5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveCaption}
                disabled={isUpdatingCaption}
                className="btn-editorial btn-editorial-primary text-sm px-5 py-2.5 disabled:opacity-60"
              >
                {isUpdatingCaption && <Loader2 className="w-4 h-4 animate-spin" />}
                {isUpdatingCaption ? 'Redrawing Polaroid…' : 'Save caption'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
