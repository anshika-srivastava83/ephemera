'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Volume2,
} from 'lucide-react';
import { computeWallPositions, computeCardWidth, LAYOUT_STYLES } from '../../../lib/wallLayout';
import { PolaroidCard } from '../../../components/polaroid/PolaroidCard';

export default function LiveProjectionWall({ params }) {
  const eventId = params.eventSlug || params.eventId;
  const [event, setEvent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [layoutStyle, setLayoutStyle] = useState('scatter');
  const [dimensions, setDimensions] = useState({ width: 1440, height: 900 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [newlyArrivedId, setNewlyArrivedId] = useState(null);

  // Resize listener
  useEffect(() => {
    function updateDimensions() {
      if (typeof window !== 'undefined') {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    }
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Poll approved submissions every 3.5s for live additions
  useEffect(() => {
    let prevIds = new Set();

    async function fetchWallData() {
      if (isPaused) return;
      try {
        const res = await fetch(`/api/events/${eventId}/approved-submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        const approved = data.submissions || [];

        // Check if a new photo just arrived
        if (prevIds.size > 0) {
          const fresh = approved.find((p) => !prevIds.has(p.id));
          if (fresh) {
            setNewlyArrivedId(fresh.id);
            setTimeout(() => setNewlyArrivedId(null), 4000);
          }
        }
        prevIds = new Set(approved.map((p) => p.id));
        setSubmissions(approved);
      } catch (err) {
        console.warn('Wall polling update:', err.message);
      }
    }

    // Load event style
    async function fetchEventMeta() {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        const found = data.events?.find((e) => e.id === eventId);
        if (found) {
          setEvent(found);
          if (found.chosen_layout_id) {
            setLayoutStyle(found.chosen_layout_id);
          }
        }
      } catch (e) {}
    }

    fetchEventMeta();
    fetchWallData();

    const interval = setInterval(fetchWallData, 3500);
    return () => clearInterval(interval);
  }, [eventId, isPaused]);

  // Fullscreen toggle
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }

  // Keyboard shortcut listener ('f' for fullscreen, 'h' to hide UI)
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'h' || e.key === 'H') {
        setShowControls((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSelectedPhoto(null);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Keep the title band (top) and control bar (bottom) clear of photographs
  const STAGE_TOP = 64;
  const STAGE_BOTTOM = 72;
  const stageHeight = Math.max(240, dimensions.height - STAGE_TOP - STAGE_BOTTOM);
  const cardWidth = computeCardWidth(submissions.length, dimensions.width, stageHeight);
  const positions = computeWallPositions(
    submissions.map((s) => s.id),
    eventId,
    dimensions.width,
    stageHeight,
    layoutStyle,
    cardWidth
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-darkroom text-ivory select-none font-sans">
      {/* Deep atmospheric darkroom vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 42%, rgba(200,163,155,0.16), rgba(35,34,30,0.55) 45%, #0d0d0b 100%)',
        }}
      />
      {/* Safelight glow along the top edge */}
      <div
        className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(200,163,155,0.07), transparent)' }}
      />

      {/* Floating subtle constellation dust */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-5 pointer-events-none" />

      {/* Empty State if no photos approved yet */}
      {submissions.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
          <div className="w-16 h-16 rounded-full border border-darkroom-border flex items-center justify-center mb-6 text-rose">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="font-editorial text-4xl sm:text-6xl text-ivory font-normal mb-3">
            {event?.name || 'The Ephemera Wall'}
          </h1>
          <p className="font-light text-ivory/60 text-lg max-w-md mb-8">
            The projection is waiting for its first memory.
            Scan the table QR card to pin your photograph here.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-darkroom-border text-xs text-rose-light">
            <span>Live projection active</span>
            <span className="w-2 h-2 rounded-full bg-rose animate-ping" />
          </div>
        </div>
      )}

      {/* Luminous Physical Polaroids Floating in Space */}
      <div className="absolute inset-x-0" style={{ top: STAGE_TOP, height: stageHeight }}>
        {submissions.map((sub) => {
          const pos = positions[sub.id];
          if (!pos) return null;
          const isJustAdded = newlyArrivedId === sub.id;

          return (
            <motion.div
              key={sub.id}
              initial={{
                x: pos.x,
                y: pos.y + 36,
                scale: pos.scale * 0.88,
                rotate: pos.rotation - 5,
                opacity: 0,
              }}
              animate={{
                scale: isJustAdded ? pos.scale * 1.12 : pos.scale,
                opacity: 1,
                x: pos.x,
                y: pos.y,
                rotate: pos.rotation,
              }}
              transition={{
                type: 'spring',
                damping: 26,
                stiffness: 90,
                opacity: { duration: 0.8 },
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: isJustAdded ? 50 : pos.zIndex,
              }}
              onClick={() => setSelectedPhoto(sub)}
            >
              <div
                style={{
                  transform: 'translate(-50%, -50%)',
                }}
                className={`transition-all duration-300 hover:scale-105 cursor-pointer ${
                  isJustAdded ? 'drop-shadow-[0_0_28px_rgba(222,191,184,0.55)]' : ''
                }`}
              >
                <PolaroidCard
                  photoUrl={sub.photo_url || sub.polaroid_url}
                  polaroidUrl={sub.polaroid_url}
                  caption={sub.caption}
                  darkroom
                  style={{ width: cardWidth }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Focus Inspection Modal when guest taps a Polaroid */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-darkroom/85 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full relative"
            >
              <PolaroidCard
                photoUrl={selectedPhoto.photo_url || selectedPhoto.polaroid_url}
                polaroidUrl={selectedPhoto.polaroid_url}
                caption={selectedPhoto.caption}
                darkroom
                className="w-full shadow-2xl"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="mt-6 mx-auto block btn-editorial btn-editorial-secondary text-xs px-5 py-2 text-ivory border-darkroom-border hover:bg-white/10"
              >
                Return to Living Wall
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discreet Host Projection Controls (collapsible) */}
      <div
        className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 max-w-[calc(100vw-32px)] transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-full bg-darkroom-surface/90 border border-darkroom-border/80 backdrop-blur-md shadow-2xl overflow-x-auto scrollbar-none">
          {/* Layout style (all 12) */}
          <label className="flex items-center gap-2 pl-3 pr-1 text-xs text-ivory/60">
            <span className="sr-only sm:not-sr-only">Style</span>
            <select
              value={LAYOUT_STYLES.some((st) => st.id === layoutStyle) ? layoutStyle : 'scatter'}
              onChange={(e) => setLayoutStyle(e.target.value)}
              className="bg-darkroom border border-darkroom-border rounded-full text-ivory text-xs px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose"
              aria-label="Wall style"
            >
              {LAYOUT_STYLES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </label>

          <div className="w-[1px] h-4 bg-darkroom-border" />

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full text-ivory/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Hide UI Pill */}
          <button
            onClick={() => setShowControls((s) => !s)}
            className="p-2 rounded-full text-ivory/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Hide Controls (H)"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtle venue title watermark in top-left */}
      <div className="fixed top-6 left-6 z-30 pointer-events-none opacity-40 hover:opacity-90 transition-opacity">
        <span className="font-editorial text-2xl text-ivory block leading-none">
          {event?.name || 'Ephemera'}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-ivory/60 block mt-1">
          {submissions.length} Memory Prints Recorded
        </span>
      </div>
    </div>
  );
}
