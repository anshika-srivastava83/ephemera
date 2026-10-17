'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Sparkles, ArrowRight, ExternalLink, Shield } from 'lucide-react';
import { EditorialNav } from '../../components/brand/EditorialNav';
import { Footer } from '../../components/brand/Footer';

export default function EventsListPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load events');
        } else {
          setEvents(data.events || []);
        }
      } catch (err) {
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const live = events.filter((e) => e.status === 'open' || e.status === 'closed');
  const past = events.filter((e) => e.status === 'finalized');

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-sepia selection:text-white">
      <EditorialNav />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-ink/10 gap-4">
          <div>
            <span className="text-xs uppercase font-medium tracking-widest text-sepia">
              Archive Directory
            </span>
            <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-ink mt-1">
              Events & Gatherings
            </h1>
          </div>
          <Link
            href="/create"
            className="btn-editorial btn-editorial-primary text-xs px-4 py-2.5 self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create New Event</span>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose/10 border border-rose/20 text-xs text-rose-dark font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-ink-muted">
            <Sparkles className="w-8 h-8 animate-spin mx-auto text-sepia mb-3" />
            <p className="font-editorial text-2xl">Retrieving event registries...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Active / Upcoming Events */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="font-editorial text-2xl text-ink font-normal">Active & Open</h2>
              </div>

              {live.length === 0 ? (
                <div className="p-8 rounded-2xl bg-ivory border border-ink/10 text-center text-ink-muted text-xs">
                  No active events right now. Create one to begin capturing memories!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {live.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-5 rounded-2xl bg-ivory border border-ink/10 shadow-sm hover:border-sepia/50 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                            ev.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'
                          }`}>
                            {ev.status === 'open' ? 'Accepting Photos' : 'Submissions Paused'}
                          </span>
                        </div>

                        <h3 className="font-editorial text-2xl text-ink font-normal group-hover:text-sepia transition-colors">
                          {ev.name}
                        </h3>

                        <div className="flex flex-col gap-1 text-xs text-ink-muted mt-2 font-light">
                          {ev.location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-sepia" />
                              <span>{ev.location}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-sepia" />
                            <span>
                              {ev.scheduled_at
                                ? new Date(ev.scheduled_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : new Date(ev.created_at).toLocaleDateString()}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-4 mt-4 border-t border-ink/5">
                        <Link
                          href={`/events/${ev.id}`}
                          className="btn-editorial btn-editorial-primary text-xs px-3 py-1.5 flex-1 justify-center"
                        >
                          <span>Workspace</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                        <Link
                          href={`/wall/${ev.id}`}
                          target="_blank"
                          className="btn-editorial btn-editorial-secondary text-xs p-1.5"
                          title="Open Live Wall"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Past Finalized Events */}
            {past.length > 0 && (
              <section>
                <h2 className="font-editorial text-2xl text-ink font-normal mb-4">
                  Finalized & Disposed
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {past.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-5 rounded-2xl bg-paper-light border border-ink/10 opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose/20 text-rose-dark mb-2 inline-block">
                        Ritual Completed
                      </span>
                      <h3 className="font-editorial text-xl text-ink">{ev.name}</h3>
                      <p className="text-xs text-ink-muted mt-1 font-light">
                        {ev.location ? `${ev.location} • ` : ''}
                        Preserved into Archival Tapestry
                      </p>
                      <Link
                        href={`/events/${ev.id}/tapestry`}
                        className="text-xs text-sepia hover:underline inline-flex items-center gap-1 mt-3"
                      >
                        <span>View Master Tapestry</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}