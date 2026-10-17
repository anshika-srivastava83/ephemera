'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  Maximize2,
  Calendar,
  MapPin,
  Eye,
} from 'lucide-react';
import { InputField } from '../../../components/ui/InputField';
import { AccessDenied } from '../../../components/brand/AccessDenied';
import { SubmissionsToggle } from '../../../components/host/SubmissionsToggle';
import { createEventSchema, formatZodErrors } from '../../../lib/validation';

export default function OwnerDashboard() {
  const [role, setRole] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Creation form state
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [maxSubmissions, setMaxSubmissions] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    setStatus('');

    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${data.error || 'Could not load events'}`);
      } else {
        setEvents(data.events || []);
        setRole(data.role || null);
      }
    } catch (e) {
      setStatus('Could not connect to event registry');
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  async function handleCreateEvent(e) {
    e.preventDefault();
    setFieldErrors({});

    const payload = {
      name: name.trim(),
      maxSubmissions: maxSubmissions ? Number(maxSubmissions) : 500,
      location: location.trim() || undefined,
      scheduledAt: scheduledAt || undefined,
    };

    const clientValidation = createEventSchema.safeParse(payload);
    if (!clientValidation.success) {
      setFieldErrors(formatZodErrors(clientValidation.error));
      return;
    }

    setStatus('Creating celebration event...');
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
        setStatus(`Error: ${data.error}`);
        return;
      }

      setName('');
      setLocation('');
      setScheduledAt('');
      setMaxSubmissions('');
      setFieldErrors({});
      setStatus('Event successfully created!');
      loadEvents();
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  }

  if (loaded && !role) return <AccessDenied />;

  return (
    <div className="min-h-screen flex flex-col selection:bg-sepia selection:text-white">

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 border-b border-ink/10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sepia/30 bg-sepia/5 text-sepia text-xs uppercase tracking-wider font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Host Console</span>
            </div>
            <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-ink">
              Events Registry
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted font-light mt-1">
              Select an event to open its moderation deck, live wall, or master tapestry suite.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-muted">
              Signed in as <strong className="text-ink uppercase font-semibold">{role}</strong>
            </span>
          </div>
        </div>

        {status && (
          <div className="my-6 p-3 bg-sepia/10 border border-sepia/20 rounded-xl text-xs text-sepia-dark font-medium text-center">
            {status}
          </div>
        )}

        {/* Event Cards Grid */}
        <div className="my-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-editorial text-2xl text-ink font-normal">Active & Past Events</h2>
            <Link
              href="/create"
              className="text-xs text-sepia font-medium hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Event Wizard</span>
            </Link>
          </div>

          {!loaded ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-busy="true">
              {[0, 1].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-paper-dark/60 animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center text-center py-14 px-6 rounded-2xl border-2 border-dashed border-sepia/30 bg-ivory/60">
              <div className="relative w-28 h-32 mb-6" aria-hidden>
                <div className="absolute inset-0 -rotate-6 border-2 border-dashed border-sepia/35 rounded-sm bg-paper-light/70" />
                <div className="absolute inset-0 rotate-3 border-2 border-dashed border-sepia/50 rounded-sm bg-ivory">
                  <div className="m-2 h-[72%] border border-dashed border-sepia/30 rounded-[1px]" />
                </div>
              </div>
              <p className="font-editorial text-3xl text-ink mb-1">No events yet</p>
              <p className="text-sm text-ink-muted font-light max-w-sm">
                Create your first event to get a QR card for guests and a live wall for the room.
              </p>
              {role === 'owner' ? (
                <Link href="/create" className="btn-editorial btn-editorial-primary text-sm px-5 py-2.5 mt-5">
                  Create an event
                </Link>
              ) : (
                <p className="text-xs text-ink-faint mt-4">The event owner can create one.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-6 bg-ivory border border-ink/10 rounded-2xl shadow-sm hover:border-sepia/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <SubmissionsToggle
                        eventId={ev.id}
                        status={ev.status}
                        disabled={role !== 'owner'}
                        onChange={(status) =>
                          setEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, status } : e)))
                        }
                      />

                      {ev.pendingCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose/20 text-rose-dark text-[11px] font-semibold">
                          {ev.pendingCount} pending
                        </span>
                      )}
                    </div>

                    <h3 className="font-editorial text-2xl text-ink font-normal mb-1">
                      {ev.name}
                    </h3>

                    {ev.location && (
                      <p className="text-xs text-ink-muted flex items-center gap-1 font-light">
                        <MapPin className="w-3 h-3 text-ink-faint" />
                        <span>{ev.location}</span>
                      </p>
                    )}

                    {ev.scheduled_at && (
                      <p className="text-xs text-ink-muted flex items-center gap-1 font-light mt-0.5">
                        <Calendar className="w-3 h-3 text-ink-faint" />
                        <span>{new Date(ev.scheduled_at).toLocaleDateString()}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-ink-faint mt-4 pt-3 border-t border-ink/5">
                      <span><strong>{ev.approvedCount || 0}</strong> approved photos</span>
                      <span>•</span>
                      <span><strong>{ev.pendingCount || 0}</strong> awaiting curation</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-ink/5 mt-4">
                    <Link
                      href={`/wall/${ev.id}`}
                      target="_blank"
                      className="text-xs text-sepia hover:underline inline-flex items-center gap-1"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Live Wall</span>
                    </Link>

                    <div className="flex gap-2">
                      <Link
                        href={`/events/${ev.id}/moderate`}
                        className="btn-editorial btn-editorial-secondary text-xs px-3 py-1.5"
                      >
                        Moderate
                      </Link>
                      <Link
                        href={`/events/${ev.id}`}
                        className="btn-editorial btn-editorial-primary text-xs px-3.5 py-1.5"
                      >
                        Workspace →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Inline Event Creator */}
        {role === 'owner' && (
          <div className="mt-12 p-8 bg-ivory border border-ink/10 rounded-2xl shadow-sm">
            <h3 className="font-editorial text-2xl text-ink font-normal mb-1">Quick Event Setup</h3>
            <p className="text-xs text-ink-muted mb-6 font-light">
              Add another celebration directly to your registry.
            </p>

            <form onSubmit={handleCreateEvent} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start">
              <InputField
                label="Name"
                required
                value={name}
                error={fieldErrors.name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: null }));
                }}
                placeholder="e.g. Maya & Julian"
                maxLength={80}
              />

              <InputField
                label="Location"
                value={location}
                error={fieldErrors.location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  if (fieldErrors.location) setFieldErrors((prev) => ({ ...prev, location: null }));
                }}
                placeholder="e.g. Kyoto Courtyard"
                maxLength={120}
              />

              <InputField
                label="Date"
                type="date"
                value={scheduledAt}
                error={fieldErrors.scheduledAt}
                onChange={(e) => {
                  setScheduledAt(e.target.value);
                  if (fieldErrors.scheduledAt) setFieldErrors((prev) => ({ ...prev, scheduledAt: null }));
                }}
              />

              <div className="pt-6 sm:pt-6">
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="btn-editorial btn-editorial-primary text-xs w-full py-3 justify-center shadow-xs disabled:opacity-50"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

    </div>
  );
}