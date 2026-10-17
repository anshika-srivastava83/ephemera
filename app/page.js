'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Camera,
  QrCode,
  Sparkles,
  ShieldCheck,
  Layers,
  ArrowRight,
  Maximize2,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { EditorialNav } from '../components/brand/EditorialNav';
import { Footer } from '../components/brand/Footer';
import { PolaroidCard } from '../components/polaroid/PolaroidCard';
import { computeWallPositions, computeCardWidth } from '../lib/wallLayout';

const HERO_POLAROIDS = [
  {
    id: 'hero-1',
    photoUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
    caption: 'under the olive trees with everyone we love',
    rotation: -4,
    scale: 0.98,
    className: 'top-4 left-6 z-10',
  },
  {
    id: 'hero-2',
    photoUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80',
    caption: 'the impromptu toast that made everyone cry',
    rotation: 5,
    scale: 1.02,
    className: 'top-16 left-48 z-20',
  },
  {
    id: 'hero-3',
    photoUrl: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800&auto=format&fit=crop&q=80',
    caption: 'dancing till the candles burned all the way down',
    rotation: -2,
    scale: 0.96,
    className: 'top-40 left-12 z-15',
  },
  {
    id: 'hero-4',
    photoUrl: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&auto=format&fit=crop&q=80',
    caption: 'laughter in the courtyard',
    rotation: 7,
    scale: 0.94,
    className: 'top-48 left-64 z-25',
  },
];

export default function Home() {
  const [liveEvent, setLiveEvent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewLayout, setPreviewLayout] = useState('scatter');
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ w: 960, h: 520 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => setStageSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        const event = data.events?.find((e) => e.status === 'open') || null;
        setLiveEvent(event);

        if (event) {
          const subsRes = await fetch(`/api/events/${event.id}/approved-submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          const subsData = await subsRes.json();
          setSubmissions(subsData.submissions || []);
        }
      } catch (e) {
        console.error('Failed loading live event', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const displaySubs =
    submissions.length > 0
      ? submissions
      : HERO_POLAROIDS.map((p, idx) => ({
          id: p.id,
          polaroid_url: p.photoUrl,
          caption: p.caption,
        }));

  const previewCardWidth = computeCardWidth(displaySubs.length, stageSize.w, stageSize.h);
  const wallPositions = computeWallPositions(
    displaySubs.map((s) => s.id),
    liveEvent?.id || 'demo-event',
    stageSize.w,
    stageSize.h,
    previewLayout,
    previewCardWidth
  );

  return (
    <div className="min-h-screen bg-paper flex flex-col selection:bg-sepia selection:text-white">
      <EditorialNav event={liveEvent} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-36 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Hero Copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col items-start"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sepia/30 bg-sepia/5 text-sepia text-xs uppercase tracking-wider font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Communal Event Photography</span>
            </div>

            <h1 className="font-editorial text-5xl sm:text-6xl md:text-7xl font-normal tracking-tight text-ink leading-[1.08] mb-6">
              Some nights deserve to stay together.
            </h1>

            <p className="text-lg md:text-xl text-ink-muted font-light leading-relaxed max-w-xl mb-8">
              Every guest brings a memory. Every memory finds its place. Ephemera turns
              the fleeting moments of a gathering into one living photograph of everyone who
              was there.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/create"
                className="btn-editorial btn-editorial-primary text-base px-6 py-3.5 shadow-sm"
              >
                <span>Create an event</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {liveEvent ? (
                <Link
                  href={`/wall/${liveEvent.id}`}
                  target="_blank"
                  className="btn-editorial btn-editorial-secondary text-base px-6 py-3.5"
                >
                  <span>Experience the wall</span>
                  <span className="text-xs text-sepia">↗</span>
                </Link>
              ) : (
                <a
                  href="#preview"
                  className="btn-editorial btn-editorial-secondary text-base px-6 py-3.5"
                >
                  <span>See it in motion</span>
                </a>
              )}
            </div>

            {liveEvent && (
              <div className="mt-8 pt-6 border-t border-ink/10 flex items-center gap-3 text-xs text-ink-muted">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sepia opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sepia"></span>
                </span>
                <span>
                  Currently live: <strong>{liveEvent.name}</strong>
                  {liveEvent.location ? ` in ${liveEvent.location}` : ''}
                </span>
              </div>
            )}
          </motion.div>

          {/* Hero Tactile Art-Directed Polaroid Composition */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative h-[440px] sm:h-[480px] w-full max-w-[440px] mx-auto"
          >
            {/* Background Archival Card */}
            <div className="absolute inset-4 rounded-xl border border-dashed border-ink/15 bg-paper-light/60 -rotate-1 pointer-events-none" />

            {/* Polaroid 1 */}
            <motion.div
              animate={{ y: [0, -4, 0], rotate: [-4, -3.5, -4] }}
              transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
              className="absolute top-4 left-2 w-48 sm:w-52 z-10"
            >
              <PolaroidCard
                photoUrl={HERO_POLAROIDS[0].photoUrl}
                caption={HERO_POLAROIDS[0].caption}
                rotation={-4}
                showPin
              />
            </motion.div>

            {/* Polaroid 2 */}
            <motion.div
              animate={{ y: [0, 5, 0], rotate: [5, 5.5, 5] }}
              transition={{ repeat: Infinity, duration: 7, delay: 1, ease: 'easeInOut' }}
              className="absolute top-12 right-2 w-52 sm:w-56 z-20"
            >
              <PolaroidCard
                photoUrl={HERO_POLAROIDS[1].photoUrl}
                caption={HERO_POLAROIDS[1].caption}
                rotation={5}
              />
            </motion.div>

            {/* Polaroid 3 */}
            <motion.div
              animate={{ y: [0, -3, 0], rotate: [-2, -1.5, -2] }}
              transition={{ repeat: Infinity, duration: 9, delay: 2, ease: 'easeInOut' }}
              className="absolute bottom-6 left-8 w-48 sm:w-52 z-30"
            >
              <PolaroidCard
                photoUrl={HERO_POLAROIDS[2].photoUrl}
                caption={HERO_POLAROIDS[2].caption}
                rotation={-2}
              />
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* Product Story: 5 Editorial Chapters */}
      <section className="py-24 bg-paper-light border-y border-ink/10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-16">
            <span className="text-xs uppercase font-medium tracking-widest text-sepia">
              The Journey
            </span>
            <h2 className="font-editorial text-4xl md:text-5xl font-normal text-ink mt-2">
              From a table glance to a timeless tapestry.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col">
              <div className="w-10 h-10 rounded-full border border-ink/15 flex items-center justify-center font-editorial text-lg text-sepia mb-4 bg-paper">
                1
              </div>
              <h3 className="font-editorial text-xl font-normal text-ink mb-2">Scan the Table QR</h3>
              <p className="text-sm text-ink-muted leading-relaxed font-light">
                No apps to install, no passwords to create. Guests tap their camera on a card at their table.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col">
              <div className="w-10 h-10 rounded-full border border-ink/15 flex items-center justify-center font-editorial text-lg text-sepia mb-4 bg-paper">
                2
              </div>
              <h3 className="font-editorial text-xl font-normal text-ink mb-2">Snap & Inscribe</h3>
              <p className="text-sm text-ink-muted leading-relaxed font-light">
                Capture an honest candid shot and write a short, heartfelt caption in ink-style cursive.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col">
              <div className="w-10 h-10 rounded-full border border-ink/15 flex items-center justify-center font-editorial text-lg text-sepia mb-4 bg-paper">
                3
              </div>
              <h3 className="font-editorial text-xl font-normal text-ink mb-2">Host Curates</h3>
              <p className="text-sm text-ink-muted leading-relaxed font-light">
                A swift, delightful swipe deck allows the hosts to curate and approve photos in real time.
              </p>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col">
              <div className="w-10 h-10 rounded-full border border-ink/15 flex items-center justify-center font-editorial text-lg text-sepia mb-4 bg-paper">
                4
              </div>
              <h3 className="font-editorial text-xl font-normal text-ink mb-2">The Living Wall</h3>
              <p className="text-sm text-ink-muted leading-relaxed font-light">
                Approved Polaroids float onto the projection screen, settling into organic constellations.
              </p>
            </div>

            {/* Step 5 */}
            <div className="flex flex-col">
              <div className="w-10 h-10 rounded-full border border-ink/15 flex items-center justify-center font-editorial text-lg text-sepia mb-4 bg-paper">
                5
              </div>
              <h3 className="font-editorial text-xl font-normal text-ink mb-2">Master Tapestry</h3>
              <p className="text-sm text-ink-muted leading-relaxed font-light">
                One high-res master artwork is preserved forever; individual uploads are respectfully purged.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Wall Interactive Preview Section */}
      <section id="preview" className="py-24 bg-darkroom text-ivory px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-darkroom-border text-rose-light text-xs uppercase tracking-wider mb-3">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Venue Projection Experience</span>
              </div>
              <h2 className="font-editorial text-4xl md:text-5xl font-normal tracking-tight text-ivory">
                The Live Darkroom Wall
              </h2>
              <p className="text-ivory/60 text-sm md:text-base font-light mt-2 max-w-lg">
                Projected at scale across the venue. Photographs appear as illuminated physical prints against the night.
              </p>
            </div>

            {/* Layout switch controls */}
            <div className="flex items-center gap-2 p-1.5 rounded-full bg-darkroom-surface border border-darkroom-border">
              {['scatter', 'constellation', 'spiral', 'tabletop'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPreviewLayout(mode)}
                  className={`px-3 py-1.5 rounded-full text-xs capitalize transition-all ${
                    previewLayout === mode
                      ? 'bg-rose text-darkroom font-semibold shadow-sm'
                      : 'text-ivory/60 hover:text-ivory'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Wall Stage */}
          <div
            ref={stageRef}
            className="relative w-full h-[420px] md:h-[520px] rounded-2xl border border-darkroom-border overflow-hidden shadow-2xl"
            style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 45%, #2b2925, #141412)' }}
          >

            {displaySubs.map((sub) => {
              const pos = wallPositions[sub.id];
              if (!pos) return null;

              return (
                <motion.div
                  key={sub.id}
                  initial={false}
                  animate={{ x: pos.x, y: pos.y, rotate: pos.rotation, scale: pos.scale }}
                  transition={{ type: 'spring', damping: 26, stiffness: 100 }}
                  className="absolute top-0 left-0"
                  style={{ zIndex: pos.zIndex }}
                >
                  <div style={{ transform: 'translate(-50%, -50%)' }}>
                    <PolaroidCard
                      photoUrl={sub.photo_url || sub.polaroid_url}
                      polaroidUrl={sub.polaroid_url}
                      caption={sub.caption}
                      darkroom
                      style={{ width: previewCardWidth }}
                    />
                  </div>
                </motion.div>
              );
            })}

            {liveEvent && (
              <div className="absolute bottom-4 right-4 z-40">
                <Link
                  href={`/wall/${liveEvent.id}`}
                  target="_blank"
                  className="btn-editorial btn-editorial-accent text-xs px-4 py-2"
                >
                  <span>Open Fullscreen Wall</span>
                  <span className="text-xs">↗</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The Ephemeral Philosophy Section */}
      <section className="py-24 md:py-32 bg-paper px-6 border-b border-ink/10">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <span className="text-xs uppercase font-medium tracking-widest text-sepia mb-3">
            The Philosophy
          </span>
          <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-ink leading-tight mb-8">
            Made to be remembered.<br />Designed to let go.
          </h2>

          <p className="text-base sm:text-lg text-ink-muted font-light leading-relaxed max-w-2xl mb-12">
            In modern software, everything is hoarded and mined forever. Ephemera embraces the
            elegance of physical impermanence. When the gathering concludes, the hosts freeze
            one master tapestry of the evening. Then, the individual uploads, raw files, and
            guest records are permanently disposed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
            <div className="p-6 rounded-xl border border-ink/10 bg-ivory">
              <ShieldCheck className="w-6 h-6 text-sepia mb-3" />
              <h4 className="font-editorial text-xl font-normal text-ink mb-1">Total Privacy</h4>
              <p className="text-xs text-ink-muted leading-relaxed font-light">
                Phone numbers are hashed via cryptographic HMAC. Raw numbers are never saved to our database.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-ink/10 bg-ivory">
              <Layers className="w-6 h-6 text-sepia mb-3" />
              <h4 className="font-editorial text-xl font-normal text-ink mb-1">Archival Tapestry</h4>
              <p className="text-xs text-ink-muted leading-relaxed font-light">
                The entire collection is rendered into a master print-ready file for the wedding album or host keepsake.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-ink/10 bg-ivory">
              <Trash2 className="w-6 h-6 text-sepia mb-3" />
              <h4 className="font-editorial text-xl font-normal text-ink mb-1">The Disposal Ritual</h4>
              <p className="text-xs text-ink-muted leading-relaxed font-light">
                A verified one-click purge dissolves the temporary files, leaving only the collective memory intact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-24 bg-paper-light px-6 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <h2 className="font-editorial text-4xl md:text-5xl font-normal text-ink mb-4">
            Host your own memory wall.
          </h2>
          <p className="text-ink-muted font-light text-base mb-8">
            Create an event in 30 seconds. Get an instant, printable QR code to place on tables tonight.
          </p>
          <Link
            href="/create"
            className="btn-editorial btn-editorial-primary text-base px-8 py-4 shadow-md"
          >
            <span>Create your event</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}