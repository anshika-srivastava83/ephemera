'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode.react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Layers,
  Camera,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Sliders,
  Printer,
  Trash2,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Image as ImageIcon,
  Copy,
  Check,
} from 'lucide-react';
import { PolaroidCard } from '../../../components/polaroid/PolaroidCard';
import { AccessDenied } from '../../../components/brand/AccessDenied';
import { SubmissionsToggle } from '../../../components/host/SubmissionsToggle';

export default function HostEventWorkspace({ params }) {
  const { eventId } = params;
  const [event, setEvent] = useState(null);
  const [role, setRole] = useState(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionStatus, setActionStatus] = useState('');

  useEffect(() => {
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadWorkspace() {
    setLoading(true);
    try {
      // 1. Load event meta
      const res = await fetch(`/api/events`);
      const data = await res.json();
      const current = data.events?.find((e) => e.id === eventId);
      if (current) {
        setEvent(current);
      }
      setRole(data.role || null);
      setRoleLoaded(true);
      if (!data.role) return;

      // 2. Load pending submissions
      const pendRes = await fetch(`/api/events/${eventId}/pending-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const pendData = await pendRes.json();
      setPending(pendData.submissions || []);

      // 3. Load approved submissions
      const appRes = await fetch(`/api/events/${eventId}/approved-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const appData = await appRes.json();
      setApproved(appData.submissions || []);
    } catch (e) {
      console.error('Failed to load workspace:', e);
    } finally {
      setLoading(false);
    }
  }

  const guestSubmitUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/event/${eventId}/submit` : '';

  if (roleLoaded && !role) return <AccessDenied />;

  return (
    <div className="min-h-screen flex flex-col selection:bg-sepia selection:text-white">

      <main className="flex-1 py-10 px-6 max-w-6xl mx-auto w-full">
        {/* Workspace Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-8 border-b border-ink/10 gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-widest font-semibold text-sepia whitespace-nowrap">
                Host Workspace
              </span>
            </div>

            <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-ink">
              {event?.name || 'Event Workspace'}
            </h1>
            {event?.location && (
              <p className="text-sm text-ink-muted mt-1 font-light">
                {event.location} {event.scheduled_at ? `— ${new Date(event.scheduled_at).toLocaleDateString()}` : ''}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {event && (
              <SubmissionsToggle
                eventId={eventId}
                status={event.status}
                disabled={role !== 'owner'}
                onChange={(status) => setEvent((ev) => ({ ...ev, status }))}
              />
            )}
            <button
              onClick={() => setShowQrModal(true)}
              className="btn-editorial btn-editorial-secondary text-sm px-4 py-2.5"
            >
              <Printer className="w-4 h-4 text-sepia" />
              <span>Table QR Card</span>
            </button>

            <Link
              href={`/wall/${eventId}`}
              target="_blank"
              className="btn-editorial btn-editorial-secondary text-sm px-4 py-2.5"
            >
              <Maximize2 className="w-4 h-4 text-sepia" />
              <span>Projector Wall</span>
              <ExternalLink className="w-3 h-3 text-ink-faint" />
            </Link>

            <Link
              href={`/events/${eventId}/moderate`}
              className="btn-editorial btn-editorial-primary text-sm px-5 py-2.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Swipe Deck</span>
              {pending.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose text-darkroom text-xs font-semibold">
                  {pending.length}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Operational Overview Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-8">
          <Link
            href={`/events/${eventId}/moderate`}
            className="p-6 rounded-2xl bg-ivory border border-ink/10 shadow-sm hover:border-sepia/40 transition-all group flex items-center justify-between"
          >
            <div>
              <span className="text-xs uppercase font-medium tracking-wider text-ink-faint block mb-1">
                Awaiting Curation
              </span>
              <span className="font-editorial text-4xl text-ink font-normal block">
                {pending.length}
              </span>
              <span className="text-xs text-sepia mt-1 inline-flex items-center gap-1 group-hover:underline">
                Swipe pending cards <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </Link>

          <Link
            href={`/owner/event/${eventId}/gallery`}
            className="p-6 rounded-2xl bg-ivory border border-ink/10 shadow-sm hover:border-sepia/40 transition-all group flex items-center justify-between"
          >
            <div>
              <span className="text-xs uppercase font-medium tracking-wider text-ink-faint block mb-1">
                Published to Wall
              </span>
              <span className="font-editorial text-4xl text-ink font-normal block">
                {approved.length}
              </span>
              <span className="text-xs text-sepia mt-1 inline-flex items-center gap-1 group-hover:underline">
                View gallery & captions <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </Link>

          <Link
            href={`/events/${eventId}/tapestry`}
            className="p-6 rounded-2xl bg-ivory border border-ink/10 shadow-sm hover:border-sepia/40 transition-all group flex items-center justify-between"
          >
            <div>
              <span className="text-xs uppercase font-medium tracking-wider text-ink-faint block mb-1">
                Master Tapestry
              </span>
              <span className="font-editorial text-xl text-ink font-normal block mt-1">
                {event?.final_wall_image_url ? 'Archived Artwork Ready' : 'Ready to Freeze'}
              </span>
              <span className="text-xs text-sepia mt-1 inline-flex items-center gap-1 group-hover:underline">
                Export & Finalize <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-rose/15 text-rose-dark flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </Link>
        </div>

        {/* Operational Modules & Quick Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
          {/* Moderation Queue Preview */}
          <div className="bg-ivory border border-ink/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-ink/5">
              <h3 className="font-editorial text-2xl text-ink font-normal">
                Incoming Submissions
              </h3>
              <Link
                href={`/events/${eventId}/moderate`}
                className="text-xs font-medium text-sepia hover:underline"
              >
                Open Full Deck →
              </Link>
            </div>

            {pending.length === 0 ? (
              <div className="py-12 text-center text-ink-faint font-light">
                <CheckCircle2 className="w-8 h-8 mx-auto text-sepia/60 mb-2" />
                <p>The queue is completely clear.</p>
                <p className="text-xs mt-1">New guest photos appear here instantly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.slice(0, 3).map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-paper-light border border-ink/5"
                  >
                    <img
                      src={sub.polaroid_url || sub.photo_url}
                      alt={sub.caption}
                      className="w-14 h-14 object-cover object-top rounded shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-caption text-xl text-ink truncate">
                        {sub.caption || 'No caption'}
                      </p>
                      <span className="text-[11px] text-ink-faint block">
                        Awaiting your decision
                      </span>
                    </div>
                    <Link
                      href={`/events/${eventId}/moderate`}
                      className="btn-editorial btn-editorial-primary text-xs px-3 py-1.5"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wall Style & Spatial Controls */}
          <div className="bg-ivory border border-ink/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-ink/5">
              <h3 className="font-editorial text-2xl text-ink font-normal">
                Projection Wall Controls
              </h3>
              <Link
                href={`/owner/event/${eventId}/select-style`}
                className="text-xs font-medium text-sepia hover:underline"
              >
                Choose a style →
              </Link>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-ink-muted font-light leading-relaxed">
                Choose how memories settle across the live projection wall. Pick from 12 compositions, from tidy
                gallery rows to spirals and confetti.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link
                  href={`/wall/${eventId}`}
                  target="_blank"
                  className="p-4 rounded-xl border border-ink/10 bg-paper-light hover:border-sepia/50 transition-all flex flex-col justify-between"
                >
                  <span className="font-editorial text-lg text-ink">Launch Wall</span>
                  <span className="text-xs text-ink-muted mt-2">Fullscreen projector mode</span>
                </Link>

                <Link
                  href={`/events/${eventId}/tapestry`}
                  className="p-4 rounded-xl border border-ink/10 bg-paper-light hover:border-sepia/50 transition-all flex flex-col justify-between"
                >
                  <span className="font-editorial text-lg text-ink">Final Tapestry</span>
                  <span className="text-xs text-ink-muted mt-2">High-res artwork export</span>
                </Link>
              </div>

              <div className="pt-4 border-t border-ink/5 flex items-center justify-between text-xs text-ink-muted">
                <span>When the night is over:</span>
                <Link
                  href={`/events/${eventId}/disposal`}
                  className="text-rose-dark hover:underline font-medium inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Dispose photographs or delete event</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* QR Code Printable Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-heading"
          onClick={() => setShowQrModal(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowQrModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-ivory border border-ink/10 rounded-2xl max-w-sm w-full p-8 text-center shadow-2xl relative"
          >
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink text-sm p-1 rounded-full"
              aria-label="Close dialog"
            >
              ✕
            </button>

            <span id="qr-modal-heading" className="font-editorial text-2xl text-ink block mb-1">
              {event?.name}
            </span>
            <span className="text-xs uppercase tracking-widest text-sepia block mb-6 font-semibold">
              Scan to Contribute
            </span>

            <div className="p-4 bg-white rounded-xl inline-block shadow-inner border border-ink/5 mb-4">
              <QRCode value={guestSubmitUrl} size={200} level="H" includeMargin />
            </div>

            <p className="font-caption text-xl text-ink-muted mb-6">
              Point your camera.<br />Leave your candid memory.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => window.print()}
                className="btn-editorial btn-editorial-primary w-full py-3 text-xs justify-center shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Table Card</span>
              </button>

              <button
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(guestSubmitUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }
                }}
                className="btn-editorial btn-editorial-secondary w-full py-2.5 text-xs justify-center"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Link Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-sepia" />
                    <span>Copy Direct Guest Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
