'use client';

import { useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode.react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Printer,
  Copy,
  Check,
  Calendar,
  MapPin,
  Camera,
  AlertCircle,
} from 'lucide-react';
import { InputField } from '../../components/ui/InputField';
import { createEventSchema, formatZodErrors } from '../../lib/validation';
import { useHostRole } from '../../lib/useHostRole';
import { AccessDenied } from '../../components/brand/AccessDenied';

export default function CreateEventPage() {
  const { role, loaded: roleLoaded } = useHostRole();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [maxSubmissions, setMaxSubmissions] = useState('500');

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const [copied, setCopied] = useState(false);

  // Real-time client-side field validation
  function clearFieldError(field) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    const payload = {
      name: name.trim(),
      location: location.trim(),
      scheduledAt: scheduledAt || undefined,
      maxSubmissions: Number(maxSubmissions) || 500,
    };

    // Client-side validation with Zod
    const validation = createEventSchema.safeParse(payload);
    if (!validation.success) {
      setFieldErrors(formatZodErrors(validation.error));
      setGeneralError('Please correct the highlighted fields before proceeding.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
        throw new Error(data.error || 'Failed to create celebration event.');
      }

      setCreatedEvent(data.event);
    } catch (err) {
      setGeneralError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const guestSubmitUrl =
    createdEvent && typeof window !== 'undefined'
      ? `${window.location.origin}/event/${createdEvent.id}/submit`
      : '';

  function copyGuestLink() {
    if (!guestSubmitUrl) return;
    navigator.clipboard.writeText(guestSubmitUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (roleLoaded && role !== 'owner') {
    return role ? (
      <AccessDenied
        title="Owners create events"
        message="You're signed in as a collaborator. Ask the event owner to create the event, then open it from your dashboard."
      />
    ) : (
      <AccessDenied />
    );
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-sepia selection:text-white">

      <main className="flex-1 py-10 md:py-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto w-full">
          {!createdEvent ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-10 shadow-sm"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sepia/30 bg-sepia/5 text-sepia text-xs uppercase tracking-wider font-medium mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Host Setup Wizard</span>
              </div>

              <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-ink mb-2">
                Create a Memory Wall
              </h1>
              <p className="text-ink-muted text-xs sm:text-sm font-light leading-relaxed mb-8">
                Configure your celebration. You'll receive a real, printable QR card for
                guest tables and full access to the curation workspace.
              </p>

              {generalError && (
                <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{generalError}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-6">
                <InputField
                  label="Event Name"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError('name');
                  }}
                  error={fieldErrors.name}
                  placeholder="e.g. Elena & Marcus — Villa Solaria"
                  maxLength={80}
                />

                <div className="grid grid-cols-1 gap-4">
                  <InputField
                    label="Date"
                    type="date"
                    icon={Calendar}
                    value={scheduledAt}
                    onChange={(e) => {
                      setScheduledAt(e.target.value);
                      clearFieldError('scheduledAt');
                    }}
                    error={fieldErrors.scheduledAt}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Venue / Location"
                    icon={MapPin}
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      clearFieldError('location');
                    }}
                    error={fieldErrors.location}
                    placeholder="e.g. Ravello, Amalfi Coast"
                    maxLength={120}
                  />

                  <InputField
                    label="Submission Cap"
                    type="number"
                    icon={Camera}
                    value={maxSubmissions}
                    onChange={(e) => {
                      setMaxSubmissions(e.target.value);
                      clearFieldError('maxSubmissions');
                    }}
                    error={fieldErrors.maxSubmissions}
                    placeholder="500"
                    helperText="Maximum allowed photos before intake closes."
                  />
                </div>

                <div className="p-4 rounded-xl border border-sepia/20 bg-sepia/5 text-xs text-sepia-dark leading-relaxed font-light">
                  <strong>The Ephemeral Promise:</strong> Individual guest uploads are temporarily held for live projection.
                  Upon event completion, you can freeze your archival master tapestry and permanently purge individual raw files.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-editorial btn-editorial-primary w-full py-4 text-base shadow-sm justify-center disabled:opacity-50"
                >
                  {loading ? 'Creating celebration...' : 'Generate Wall & Table QR Code'}
                  {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
                </button>
              </form>
            </motion.div>
          ) : (
            /* Created Event Card Preview */
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-10 shadow-sm text-center"
            >
              <div className="w-12 h-12 rounded-full bg-sepia/10 text-sepia flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6" />
              </div>

              <h2 className="font-editorial text-3xl sm:text-4xl font-normal text-ink mb-1">
                {createdEvent.name}
              </h2>
              <p className="text-ink-muted text-xs sm:text-sm font-light mb-8">
                Your living wall is active and ready to receive guest photographs.
              </p>

              {/* Printable Table Card Preview */}
              <div
                id="printable-card"
                className="max-w-xs mx-auto p-6 bg-paper-light border-2 border-sepia/30 rounded-2xl shadow-md mb-8 text-center"
              >
                <span className="font-editorial text-xl block text-ink mb-1 truncate">
                  {createdEvent.name}
                </span>
                <span className="text-[11px] uppercase tracking-widest text-sepia block mb-4">
                  Add Your Photo to the Wall
                </span>

                <div className="bg-white p-4 rounded-xl shadow-inner inline-block mx-auto mb-4 border border-ink/5">
                  <QRCode value={guestSubmitUrl} size={180} level="H" includeMargin />
                </div>

                <p className="font-caption text-xl text-ink-muted leading-tight">
                  Point your camera.<br />Leave a candid memory for the room.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                <button
                  onClick={() => window.print()}
                  className="btn-editorial btn-editorial-secondary w-full sm:w-auto text-xs px-5 py-2.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Table QR Cards</span>
                </button>

                <button
                  onClick={copyGuestLink}
                  className="btn-editorial btn-editorial-secondary w-full sm:w-auto text-xs px-5 py-2.5"
                >
                  {copied ? <Check className="w-4 h-4 text-sepia" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Guest Link'}</span>
                </button>
              </div>

              <div className="pt-6 border-t border-ink/10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href={`/events/${createdEvent.id}`}
                  className="btn-editorial btn-editorial-primary text-xs px-5 py-2.5"
                >
                  <span>Open Host Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href={`/wall/${createdEvent.id}`}
                  target="_blank"
                  className="btn-editorial btn-editorial-secondary text-xs px-5 py-2.5"
                >
                  <span>Open Live Wall</span>
                  <span className="text-xs">↗</span>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </main>

    </div>
  );
}
