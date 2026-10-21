'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Shield, Sparkles, Loader2 } from 'lucide-react';
import { useHostRole } from '../../../../lib/useHostRole';
import { AccessDenied } from '../../../../components/brand/AccessDenied';
import { TeamManager } from '../../../../components/host/TeamManager';

export default function EventTeamPage({ params }) {
  const { eventId } = params;
  const { role, loaded: roleLoaded } = useHostRole(eventId);
  const [event, setEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events?eventId=${encodeURIComponent(eventId)}`);
        const data = await res.json();
        const current = data.events?.find((e) => e.id === eventId);
        setEvent(current || null);
      } catch (err) {
        console.error('Failed to load event details:', err);
      } finally {
        setLoadingEvent(false);
      }
    }
    fetchEvent();
  }, [eventId]);

  if (roleLoaded && !role) {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-sepia selection:text-white">
      <main className="flex-1 py-10 px-6 max-w-5xl mx-auto w-full">
        {/* Navigation & Header */}
        <div className="pb-8 border-b border-ink/10">
          <Link
            href={`/events/${eventId}`}
            className="text-xs uppercase tracking-wider text-ink-muted hover:text-ink font-semibold inline-flex items-center gap-1.5 mb-4 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Workspace</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sepia/30 bg-sepia/5 text-sepia text-xs uppercase tracking-wider font-medium mb-3">
                <Users className="w-3.5 h-3.5" />
                <span>Access Management</span>
              </div>
              <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-ink">
                Hosts & Collaborators
              </h1>
              <p className="text-sm text-ink-muted font-light mt-1 max-w-xl">
                {event?.name ? (
                  <>Managing the celebration team for <strong className="font-medium text-ink">{event.name}</strong>.</>
                ) : (
                  'Assign co-hosts for full administrative control and collaborators for live moderation.'
                )}
              </p>
            </div>

            {role && (
              <div className="self-start sm:self-center">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                    role === 'owner'
                      ? 'bg-sepia/10 text-sepia border-sepia/25'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  Your Role: {role === 'owner' ? 'Host' : 'Collaborator'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Team Manager Body */}
        <div className="py-8">
          <TeamManager eventId={eventId} eventName={event?.name} />
        </div>
      </main>
    </div>
  );
}
