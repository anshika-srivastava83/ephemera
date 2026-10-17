'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Download,
  Eye,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  Heart,
} from 'lucide-react';
import { Wordmark } from '../../../../components/brand/EditorialNav';
import { PolaroidCard } from '../../../../components/polaroid/PolaroidCard';

import { XCircle } from 'lucide-react';

const STATUS_MAP = {
  pending: {
    label: 'Awaiting approval',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: Clock,
    desc: 'The host reviews each photograph before it joins the wall. This page updates when you refresh.',
  },
  approved: {
    label: "You're on the wall",
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    icon: CheckCircle2,
    desc: 'The host approved your photograph. Look up — it is part of tonight’s living wall.',
  },
  rejected: {
    label: 'Not selected for the wall',
    badge: 'bg-rose/20 text-rose-dark border-rose/40',
    icon: XCircle,
    desc: 'The host chose not to display this one. Your Polaroid is still yours to keep, and you can send a different photograph.',
  },
};

export default function MyPhotoKeepsakePage({ params }) {
  const { eventId } = params;
  const token = useSearchParams().get('token') || '';
  const [sub, setSub] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/submissions/by-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Could not locate your photograph link.');
        } else {
          setSub(data.submission);
        }
      } catch (err) {
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      load();
    } else {
      setError('Private token is missing from the link.');
      setLoading(false);
    }
  }, [token]);

  const statusInfo = sub ? STATUS_MAP[sub.status] || STATUS_MAP.pending : STATUS_MAP.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 selection:bg-sepia selection:text-white">
      {/* Header */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between pb-6 border-b border-ink/10">
        <Wordmark />
        {sub?.events?.name && (
          <span className="text-xs uppercase tracking-wider text-ink-muted truncate max-w-[180px] font-medium">
            {sub.events.name}
          </span>
        )}
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-sm mx-auto">
          {loading ? (
            <div className="text-center py-20 text-ink-muted">
              <Sparkles className="w-8 h-8 animate-spin mx-auto text-sepia mb-3" />
              <p className="font-editorial text-2xl">Retrieving your keepsake...</p>
            </div>
          ) : error ? (
            <div className="bg-ivory border border-ink/10 rounded-2xl p-8 text-center shadow-sm">
              <h2 className="font-editorial text-3xl font-normal text-ink mb-2">We can’t open this link</h2>
              <p className="text-xs text-ink-muted mb-6 leading-relaxed font-light">{error}</p>
              <Link
                href={`/event/${eventId}/submit`}
                className="btn-editorial btn-editorial-primary text-xs px-4 py-2 inline-flex"
              >
                Submit New Photo
              </Link>
            </div>
          ) : sub ? (
            <div className="bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-sm text-center">
              {/* Status Badge */}
              <div className="mb-4">
                <span
                  role="status"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.badge}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span>{statusInfo.label}</span>
                </span>
                <p className="text-xs text-ink-muted font-light mt-1.5">{statusInfo.desc}</p>
                {sub.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-2 text-xs text-sepia font-medium underline underline-offset-2"
                  >
                    Check again
                  </button>
                )}
              </div>

              {/* Physical Polaroid Render */}
              <div className="max-w-[240px] mx-auto my-6">
                <PolaroidCard
                  photoUrl={sub.photo_url}
                  polaroidUrl={sub.polaroid_url}
                  caption={sub.caption}
                  className="shadow-polaroid"
                />
              </div>

              {/* Download Buttons */}
              <div className="flex justify-center gap-3 mb-6">
                <a
                  href={sub.polaroid_url || sub.photo_url}
                  download="my-polaroid.jpg"
                  className="btn-editorial btn-editorial-primary text-xs px-4 py-2.5 flex-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Polaroid</span>
                </a>

                <a
                  href={sub.photo_url}
                  download="raw-photo.jpg"
                  className="btn-editorial btn-editorial-secondary text-xs px-3.5 py-2.5"
                  title="Download Raw Photograph"
                >
                  <span>Raw Photo</span>
                </a>
              </div>

              {/* Navigation Options */}
              <div className="space-y-2 pt-4 border-t border-ink/5">
                <Link
                  href={`/wall/${eventId}`}
                  target="_blank"
                  className="btn-editorial btn-editorial-secondary w-full py-2.5 text-xs justify-center"
                >
                  <Eye className="w-3.5 h-3.5 text-sepia" />
                  <span>View the Live Wall</span>
                </Link>

                {sub.events?.status === 'open' ? (
                  <Link
                    href={`/event/${eventId}/submit`}
                    className="btn-editorial btn-editorial-secondary w-full py-2.5 text-xs justify-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-sepia" />
                    <span>Replace my photograph</span>
                  </Link>
                ) : (
                  <p className="text-[11px] text-ink-faint font-light pt-1">
                    Submissions are closed, so photographs can no longer be replaced.
                  </p>
                )}
                {sub.events?.status === 'open' && sub.status !== 'rejected' && (
                  <p className="text-[11px] text-ink-faint font-light">
                    A new photograph goes back to the host for approval.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-ink-faint py-3 border-t border-ink/5">
        <span>Ephemera Guest Keepsake Suite</span>
      </footer>
    </div>
  );
}