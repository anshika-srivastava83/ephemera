'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toPng } from 'html-to-image';
import { ArrowLeft, Check, Download, Eye, Loader2, X } from 'lucide-react';
import {
  LAYOUT_STYLES,
  computeWallPositions,
  computeCardWidth,
  CARD_ASPECT,
} from '../../../../../lib/wallLayout';
import { useHostRole } from '../../../../../lib/useHostRole';
import { AccessDenied } from '../../../../../components/brand/AccessDenied';
import { useToast } from '../../../../../components/ui/Toast';
import { ScaleToFit } from '../../../../../components/ui/ScaleToFit';

const SMALL_W = 960;
const SMALL_H = 600;
const LARGE_W = 960;
const LARGE_H = 600;
const MIN_PREVIEW_PRINTS = 10; // below this, pad previews with placeholder prints
const MAX_PREVIEW_PRINTS = 24;
const DEFAULT_STYLE = 'scatter';

// A single miniature wall. Real approved photographs are used when there are enough;
// otherwise blank placeholder prints fill in so the composition is still readable.
function WallPreview({ styleId, items, eventId, width, height, forwardRef }) {
  const ids = items.map((i) => i.id);
  const cardWidth = computeCardWidth(ids.length, width, height);
  const positions = computeWallPositions(ids, eventId, width, height, styleId, cardWidth);

  return (
    <div
      ref={forwardRef}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 40%, #2b2925, #141412)',
      }}
    >
      {items.map((item) => {
        const pos = positions[item.id];
        if (!pos) return null;
        const base = {
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: cardWidth,
          transform: `translate(-50%, -50%) rotate(${pos.rotation}deg) scale(${pos.scale})`,
          boxShadow: '0 6px 14px rgba(0,0,0,0.55)',
          borderRadius: 2,
          zIndex: pos.zIndex,
        };
        return item.placeholder ? (
          <div
            key={item.id}
            style={{
              ...base,
              aspectRatio: `1 / ${CARD_ASPECT}`,
              background: '#f6f1e6',
              padding: '8% 8% 0',
            }}
          >
            <div style={{ width: '100%', aspectRatio: '1', background: '#cfc5b3' }} />
          </div>
        ) : (
          <img
            key={item.id}
            src={item.polaroid_url || item.photo_url}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ ...base, aspectRatio: `1 / ${CARD_ASPECT}`, objectFit: 'cover', background: '#f6f1e6' }}
          />
        );
      })}
    </div>
  );
}

export default function SelectStylePage({ params }) {
  const { eventId } = params;
  const { role, loaded: roleLoaded } = useHostRole();
  const toast = useToast();

  const [approved, setApproved] = useState([]);
  const [chosenId, setChosenId] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [openStyle, setOpenStyle] = useState(null);
  const [exporting, setExporting] = useState(false);
  const largeRef = useRef(null);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoadState('loading');
    try {
      const [subRes, evRes] = await Promise.all([
        fetch(`/api/events/${eventId}/approved-submissions`, { method: 'POST' }),
        fetch('/api/events'),
      ]);
      const subData = await subRes.json();
      const evData = await evRes.json();
      if (!subRes.ok) throw new Error(subData.error || 'Could not load photographs.');

      setApproved(subData.submissions || []);
      const current = evData.events?.find((e) => e.id === eventId);
      setChosenId(current?.chosen_layout_id || DEFAULT_STYLE);
      setLoadState('ready');
    } catch (e) {
      setLoadError(e instanceof TypeError ? 'Could not reach the server.' : e.message);
      setLoadState('error');
    }
  }

  // Real photos, topped up with placeholders on a sparse wall
  const previewItems = useMemo(() => {
    const real = approved.slice(0, MAX_PREVIEW_PRINTS);
    const missing = Math.max(0, MIN_PREVIEW_PRINTS - real.length);
    const filler = Array.from({ length: missing }, (_, i) => ({ id: `placeholder-${i}`, placeholder: true }));
    return [...real, ...filler];
  }, [approved]);
  const usingPlaceholders = approved.length < MIN_PREVIEW_PRINTS;

  async function selectStyle(styleId) {
    if (styleId === chosenId || savingId) return;
    const previous = chosenId;
    setSavingId(styleId);
    setChosenId(styleId); // optimistic; reverted on failure
    try {
      const res = await fetch(`/api/events/${eventId}/set-style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chosenLayoutId: styleId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The style could not be saved.');
      const label = LAYOUT_STYLES.find((s) => s.id === styleId)?.label || styleId;
      toast.success(`“${label}” is now the live wall style.`);
    } catch (e) {
      setChosenId(previous);
      toast.error(e.message || 'The style could not be saved.');
    } finally {
      setSavingId(null);
    }
  }

  async function exportSample(styleId, node) {
    if (!node) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `ephemera-wall-${styleId}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Sample image saved.');
    } catch (e) {
      toast.error(`Could not export the sample: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }

  // Close the zoomed preview with Escape
  useEffect(() => {
    if (!openStyle) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpenStyle(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openStyle]);

  if (roleLoaded && !role) return <AccessDenied />;

  const openDef = LAYOUT_STYLES.find((s) => s.id === openStyle);

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
          <span className="font-editorial text-xl text-ink font-normal truncate">Wall style</span>
        </div>

        <Link
          href={`/wall/${eventId}`}
          target="_blank"
          className="btn-editorial btn-editorial-secondary text-xs px-3.5 py-1.5 shrink-0"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View live wall</span>
        </Link>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 py-8">
        <div className="mb-8">
          <h1 className="font-editorial text-4xl font-normal text-ink">How should the wall look?</h1>
          <p className="text-sm text-ink-muted font-light mt-1 max-w-xl">
            Choose how prints are arranged on the venue display. The live wall switches to your choice
            within a few seconds.
            {usingPlaceholders && ' Blank prints stand in below until more photographs are approved.'}
          </p>
        </div>

        {loadState === 'loading' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-paper-dark/60 animate-pulse" />
            ))}
          </div>
        )}

        {loadState === 'error' && (
          <div role="alert" className="text-center py-16 bg-ivory border border-red-200 rounded-2xl">
            <p className="font-editorial text-2xl text-ink mb-1">Couldn’t load wall styles</p>
            <p className="text-sm text-ink-muted font-light mb-5">{loadError}</p>
            <button onClick={loadAll} className="btn-editorial btn-editorial-primary text-xs px-4 py-2">
              Try again
            </button>
          </div>
        )}

        {loadState === 'ready' && (
          <div
            role="radiogroup"
            aria-label="Wall style"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {LAYOUT_STYLES.map((style) => {
              const isChosen = chosenId === style.id;
              const isSaving = savingId === style.id;
              return (
                <div
                  key={style.id}
                  className={`relative rounded-2xl bg-ivory border transition-all duration-200 overflow-hidden ${
                    isChosen
                      ? 'border-sepia ring-2 ring-sepia shadow-lg'
                      : 'border-ink/10 shadow-sm hover:border-sepia/50 hover:-translate-y-0.5'
                  }`}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isChosen}
                    onClick={() => selectStyle(style.id)}
                    disabled={Boolean(savingId)}
                    className="block w-full text-left disabled:cursor-wait focus-visible:outline-offset-[-3px]"
                  >
                    <div className="relative bg-darkroom" style={{ aspectRatio: `${SMALL_W} / ${SMALL_H}` }}>
                      <div className="absolute inset-0 overflow-hidden" aria-hidden>
                        <ScaleToFit>
                          <WallPreview
                            styleId={style.id}
                            items={previewItems}
                            eventId={eventId}
                            width={SMALL_W}
                            height={SMALL_H}
                          />
                        </ScaleToFit>
                      </div>
                      {isChosen && (
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sepia text-white text-[11px] font-semibold shadow">
                          <Check className="w-3 h-3" strokeWidth={3} />
                          Live style
                        </span>
                      )}
                      {isSaving && (
                        <span className="absolute inset-0 flex items-center justify-center bg-darkroom/60">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <h2 className="font-editorial text-2xl font-normal text-ink">{style.label}</h2>
                      <p className="text-xs text-ink-muted font-light leading-relaxed mt-1 min-h-[2.5rem]">
                        {style.description}
                      </p>
                    </div>
                  </button>

                  <div className="px-4 pb-4 -mt-1 flex items-center justify-between">
                    <span className="text-xs text-ink-faint">
                      {isChosen ? 'Selected' : 'Tap card to select'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenStyle(style.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-sepia hover:underline"
                      aria-label={`Enlarge ${style.label} preview`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Enlarge
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Enlarged preview */}
      {openStyle && openDef && (
        <div
          className="dialog-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setOpenStyle(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="style-preview-title"
            className="dialog-panel !max-w-4xl"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 id="style-preview-title" className="font-editorial text-3xl font-normal text-ink">
                  {openDef.label}
                </h2>
                <p className="text-xs text-ink-muted font-light mt-0.5">{openDef.description}</p>
              </div>
              <button
                onClick={() => setOpenStyle(null)}
                className="p-2 rounded-full hover:bg-ink/5 text-ink-muted"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-darkroom">
              <ScaleToFit>
                <WallPreview
                  styleId={openStyle}
                  items={previewItems}
                  eventId={eventId}
                  width={LARGE_W}
                  height={LARGE_H}
                  forwardRef={largeRef}
                />
              </ScaleToFit>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-5">
              <button
                onClick={() => exportSample(openStyle, largeRef.current)}
                disabled={exporting}
                className="btn-editorial btn-editorial-secondary text-sm px-4 py-2.5 disabled:opacity-60"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Save sample image</span>
              </button>
              <button
                onClick={async () => {
                  await selectStyle(openStyle);
                  setOpenStyle(null);
                }}
                disabled={Boolean(savingId) || chosenId === openStyle}
                className="btn-editorial btn-editorial-primary text-sm px-5 py-2.5 disabled:opacity-60"
              >
                {chosenId === openStyle ? 'Already the live style' : 'Use this style on the live wall'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
