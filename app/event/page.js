'use client';

import { useEffect, useState } from 'react';
import { supabasePublic } from '../../lib/supabaseClient';

export default function EventsListPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    supabasePublic
      .from('events')
      .select('id, name, status, location, scheduled_at, created_at')
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .then(({ data }) => setEvents(data || []));
  }, []);

  const live = events.filter((e) => e.status === 'open' || e.status === 'closed');
  const past = events.filter((e) => e.status === 'finalized');

  function EventRow({ ev }) {
    const when = ev.scheduled_at
      ? new Date(ev.scheduled_at).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : new Date(ev.created_at).toLocaleDateString();
    return (
      <a href={`/owner/dashboard?event=${ev.id}`} className="event-row">
        <div className="event-row-name">{ev.name}</div>
        <div className="event-row-meta">
          {when}
          {ev.location && ` · ${ev.location}`}
        </div>
      </a>
    );
  }

  return (
    <main className="owner-page">
      <div className="owner-card">
        <h1>Events</h1>

        <h2 className="owner-subheading">Live</h2>
        {live.length === 0 && <p className="owner-empty-text">No live events right now.</p>}
        {live.map((ev) => (
          <EventRow key={ev.id} ev={ev} />
        ))}

        <h2 className="owner-subheading">Past</h2>
        {past.length === 0 && <p className="owner-empty-text">No past events yet.</p>}
        {past.map((ev) => (
          <EventRow key={ev.id} ev={ev} />
        ))}
      </div>
    </main>
  );
}