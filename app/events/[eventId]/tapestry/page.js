'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toPng } from 'html-to-image';
import { motion } from 'framer-motion';
import {
  Download,
  ArrowLeft,
  CheckCircle2,
  Flame,
  Loader2,
  AlertCircle,
  RefreshCw,
  ImageIcon,
} from 'lucide-react';
import { computeWallPositions, computeCardWidth } from '../../../../lib/wallLayout';
import { PolaroidCard } from '../../../../components/polaroid/PolaroidCard';
import { useHostRole } from '../../../../lib/useHostRole';
import { AccessDenied } from '../../../../components/brand/AccessDenied';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { ScaleToFit } from '../../../../components/ui/ScaleToFit';
import { useToast } from '../../../../components/ui/Toast';

// The artwork is composed at a fixed size so the saved image is identical on every device.
const CANVAS_W = 1600;
const CANVAS_H = 1000;
const PLAQUE_H = 150; // top band reserved for the title plaque
const FOOT_H = 36;

const STAGES = [
  { id: 'compose', label: 'Composing the artwork' },
  { id: 'upload', label: 'Saving the image' },
  { id: 'commit', label: 'Recording it as the official artwork' },
];

export default function FinalArtworkPage({ params }) {
  const { eventId } = params;
  const { role, loaded: roleLoaded } = useHostRole();
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [approved, setApproved] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [finalImageUrl, setFinalImageUrl] = useState(null);
  const [recomposing, setRecomposing] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stage, setStage] = useState(null); // null | 'compose' | 'upload' | 'commit'
  const [error, setError] = useState('');
  const [justFinalised, setJustFinalised] = useState(false);
  const artworkRef = useRef(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadData() {
    setLoadState('loading');
    try {
      const [evRes, subRes] = await Promise.all([
        fetch('/api/events'),
        fetch(`/api/events/${eventId}/approved-submissions`, { method: 'POST' }),
      ]);
      const evData = await evRes.json();
      const subData = await subRes.json();
      if (!subRes.ok) throw new Error(subData.error || 'Could not load approved photographs.');

      const current = evData.events?.find((e) => e.id === eventId) || null;
      setEvent(current);
      setFinalImageUrl(current?.final_wall_image_url || null);
      setApproved(subData.submissions || []);
      setLoadState('ready');
    } catch (e) {
      console.error('Failed to load artwork data', e);
      setLoadState('error');
    }
  }

  const styleId = event?.chosen_layout_id || 'scatter';
  const stageHeight = CANVAS_H - PLAQUE_H - FOOT_H;
  const cardWidth = useMemo(
    () => computeCardWidth(approved.length, CANVAS_W, stageHeight),
    [approved.length, stageHeight]
  );
  const positions = useMemo(
    () =>
      computeWallPositions(
        approved.map((s) => s.id),
        eventId,
        CANVAS_W,
        stageHeight,
        styleId,
        cardWidth
      ),
    [approved, eventId, styleId, cardWidth, stageHeight]
  );

  const isOwner = role === 'owner';
  const working = Boolean(stage);
  const showCompose = !finalImageUrl || recomposing;

  async function finalise() {
    if (!artworkRef.current) return;
    setConfirmOpen(false);
    setError('');
    setJustFinalised(false);

    let dataUrl;
    let uploadedUrl;
    try {
      setStage('compose');
      dataUrl = await toPng(artworkRef.current, { pixelRatio: 2, cacheBust: true });

      setStage('upload');
      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append('file', blob, `master-artwork-${eventId}.png`);
      formData.append('folder', eventId);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'The artwork image could not be saved on the server.');
      }
      uploadedUrl = uploadData.url;

      setStage('commit');
      const res = await fetch(`/api/events/${eventId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalWallImageUrl: uploadedUrl, chosenLayoutId: styleId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error ||
            'The image was saved but could not be recorded as the official artwork. Try finalising again.'
        );
      }

      setFinalImageUrl(uploadedUrl);
      setEvent((ev) => (ev ? { ...ev, final_wall_image_url: uploadedUrl } : ev));
      setRecomposing(false);
      setJustFinalised(true);
      toast.success('Artwork finalised.');

      // Give the host a copy straight away
      const link = document.createElement('a');
      link.download = `${(event?.name || 'ephemera').replace(/[^\w-]+/g, '-')}-wall.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Finalisation failed', err);
      setError(err.message || 'Something went wrong while finalising. Nothing was recorded.');
    } finally {
      setStage(null);
    }
  }

  if (roleLoaded && !role) return <AccessDenied />;

  const stageIndex = STAGES.findIndex((s) => s.id === stage);

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
          <span className="font-editorial text-xl text-ink font-normal truncate">Finalise the wall</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {loadState === 'loading' && (
          <div className="py-24 text-center text-ink-muted" role="status">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-sepia mb-3" />
            <p className="font-editorial text-2xl">Gathering the night…</p>
          </div>
        )}

        {loadState === 'error' && (
          <div role="alert" className="text-center py-16 bg-ivory border border-red-200 rounded-2xl">
            <p className="font-editorial text-2xl text-ink mb-1">Couldn’t load the wall</p>
            <p className="text-sm text-ink-muted font-light mb-5">Check your connection and try again.</p>
            <button onClick={loadData} className="btn-editorial btn-editorial-primary text-xs px-4 py-2">
              Try again
            </button>
          </div>
        )}

        {loadState === 'ready' && !event && (
          <p className="py-20 text-center font-editorial text-3xl text-ink">Event not found</p>
        )}

        {loadState === 'ready' && event && (
          <>
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.2em] text-sepia font-semibold mb-2">
                {finalImageUrl && !recomposing ? 'The official artwork' : 'Final step'}
              </p>
              <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-ink">{event.name}</h1>
              <p className="text-sm text-ink-muted font-light mt-2 max-w-xl">
                {finalImageUrl && !recomposing
                  ? 'This is the saved collective artwork for the evening. Download it, print it, keep it.'
                  : `${approved.length} approved photograph${approved.length === 1 ? '' : 's'}, arranged in the “${
                      styleId
                    }” style, become one image.`}
              </p>
            </div>

            {justFinalised && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                role="status"
                className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-sm text-emerald-950 flex items-start gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block">The artwork is saved.</strong>
                  A copy was downloaded to your device. Photographs are untouched — when you’re ready, you
                  can{' '}
                  <Link href={`/events/${eventId}/disposal`} className="underline font-medium">
                    dispose of them
                  </Link>
                  .
                </div>
              </motion.div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-900 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block">Finalisation didn’t complete.</strong>
                  {error}
                </div>
              </div>
            )}

            {/* Official artwork (saved) */}
            {finalImageUrl && !recomposing && (
              <div className="mb-8">
                <div className="mx-auto max-w-4xl p-3 sm:p-5 bg-ivory border border-ink/10 shadow-2xl rounded-sm">
                  <div className="bg-darkroom p-1">
                    <img
                      src={finalImageUrl}
                      alt={`Final wall artwork for ${event.name}`}
                      className="w-full h-auto block"
                      style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
                    />
                  </div>
                  <p className="text-center text-[11px] uppercase tracking-[0.25em] text-ink-faint mt-3">
                    {event.name} · Edition of one
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                  <a
                    href={finalImageUrl}
                    download={`${(event.name || 'ephemera').replace(/[^\w-]+/g, '-')}-wall.png`}
                    className="btn-editorial btn-editorial-primary px-6 py-3 text-sm w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download the artwork</span>
                  </a>
                  {isOwner && (
                    <button
                      onClick={() => {
                        setRecomposing(true);
                        setJustFinalised(false);
                      }}
                      className="btn-editorial btn-editorial-secondary px-5 py-3 text-sm w-full sm:w-auto"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Recompose from the current wall</span>
                    </button>
                  )}
                  <Link
                    href={`/events/${eventId}/disposal`}
                    className="btn-editorial btn-editorial-secondary px-5 py-3 text-sm w-full sm:w-auto"
                  >
                    <Flame className="w-4 h-4 text-sepia" />
                    <span>Dispose or delete…</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Compose preview (also the source for the exported image) */}
            {showCompose && (
              <>
                {approved.length === 0 ? (
                  <div className="text-center py-16 bg-ivory border border-dashed border-ink/25 rounded-2xl">
                    <ImageIcon className="w-8 h-8 mx-auto text-sepia/60 mb-3" />
                    <p className="font-editorial text-3xl text-ink mb-1">Nothing to finalise yet</p>
                    <p className="text-sm text-ink-muted font-light mb-5">
                      Approve some photographs first — they become the artwork.
                    </p>
                    <Link
                      href={`/events/${eventId}/moderate`}
                      className="btn-editorial btn-editorial-primary text-sm px-5 py-2.5"
                    >
                      Open the moderation studio
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl overflow-hidden shadow-2xl border border-ink/15 bg-darkroom">
                      <ScaleToFit>
                        <div
                          ref={artworkRef}
                          style={{
                            width: CANVAS_W,
                            height: CANVAS_H,
                            position: 'relative',
                            overflow: 'hidden',
                            background:
                              'radial-gradient(ellipse 75% 70% at 50% 55%, #2b2925 0%, #1b1a17 60%, #0f0f0d 100%)',
                          }}
                        >
                          {/* Plaque */}
                          <div
                            style={{
                              position: 'absolute',
                              top: 40,
                              left: 56,
                              zIndex: 5000,
                              borderLeft: '2px solid rgba(200,163,155,0.7)',
                              paddingLeft: 20,
                              color: '#fffcf6',
                            }}
                          >
                            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 44, lineHeight: 1.05 }}>
                              {event.name}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                letterSpacing: '0.22em',
                                textTransform: 'uppercase',
                                opacity: 0.7,
                                marginTop: 8,
                              }}
                            >
                              {[
                                event.location,
                                new Date(event.scheduled_at || event.created_at || Date.now()).toLocaleDateString(
                                  'en-US',
                                  { month: 'long', day: 'numeric', year: 'numeric' }
                                ),
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                            <div style={{ fontSize: 12, color: '#debfb8', marginTop: 4 }}>
                              {approved.length} moment{approved.length === 1 ? '' : 's'}, one night
                            </div>
                          </div>

                          {/* Prints */}
                          <div style={{ position: 'absolute', left: 0, right: 0, top: PLAQUE_H, height: stageHeight }}>
                            {approved.map((sub) => {
                              const pos = positions[sub.id];
                              if (!pos) return null;
                              return (
                                <div
                                  key={sub.id}
                                  style={{
                                    position: 'absolute',
                                    left: pos.x,
                                    top: pos.y,
                                    width: cardWidth,
                                    transform: `translate(-50%, -50%) rotate(${pos.rotation}deg) scale(${pos.scale})`,
                                    zIndex: pos.zIndex,
                                  }}
                                >
                                  <PolaroidCard
                                    photoUrl={sub.photo_url || sub.polaroid_url}
                                    polaroidUrl={sub.polaroid_url}
                                    caption={sub.caption}
                                    darkroom
                                    className="w-full"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </ScaleToFit>
                    </div>

                    {/* What finalising does */}
                    <section className="mt-8 grid md:grid-cols-[1fr_auto] gap-6 items-start bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-sm">
                      <div>
                        <h2 className="font-editorial text-3xl font-normal text-ink mb-3">
                          What finalising does
                        </h2>
                        <ul className="space-y-2 text-sm text-ink-muted font-light leading-relaxed">
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                            <span>
                              Saves the image above as the event’s <strong>official artwork</strong> and
                              downloads a copy to this device.
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                            <span>
                              Records the current wall style (“{styleId}”) with it. Guests’ photographs are{' '}
                              <strong>not</strong> deleted and submissions stay as they are.
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                            <span>
                              Unlocks disposal, so you can later remove individual photographs and keep only
                              this artwork. You can recompose and finalise again — the new image replaces the
                              old one.
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className="md:w-64">
                        <button
                          onClick={() => setConfirmOpen(true)}
                          disabled={!isOwner || working}
                          title={!isOwner ? 'Only the event owner can finalise' : undefined}
                          className="btn-editorial btn-editorial-primary w-full px-5 py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed justify-center"
                        >
                          {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          <span>{working ? 'Working…' : 'Finalise & download'}</span>
                        </button>
                        {recomposing && !working && (
                          <button
                            onClick={() => setRecomposing(false)}
                            className="w-full mt-2 text-xs text-ink-muted hover:text-ink underline"
                          >
                            Keep the current artwork
                          </button>
                        )}
                        {!isOwner && (
                          <p className="text-[11px] text-ink-faint mt-2">
                            Only the event owner can finalise the wall.
                          </p>
                        )}

                        {working && (
                          <ol className="mt-4 space-y-2" aria-live="polite">
                            {STAGES.map((s, i) => (
                              <li
                                key={s.id}
                                className={`flex items-center gap-2 text-xs ${
                                  i < stageIndex
                                    ? 'text-emerald-700'
                                    : i === stageIndex
                                    ? 'text-ink font-medium'
                                    : 'text-ink-faint'
                                }`}
                              >
                                {i < stageIndex ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : i === stageIndex ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full border border-ink/20" />
                                )}
                                {s.label}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </section>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>

      <ConfirmDialog
        open={confirmOpen}
        title="Finalise the wall?"
        confirmLabel="Finalise & download"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={finalise}
      >
        This saves the artwork above as the official image for {event?.name || 'this event'}
        {finalImageUrl ? ', replacing the current one' : ''}, and downloads a copy. No photographs are
        deleted.
      </ConfirmDialog>
    </div>
  );
}
