'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';

export default function OwnerDashboard() {
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(null);
  const [events, setEvents] = useState([]);
  const [name, setName] = useState('');
  const [maxSubmissions, setMaxSubmissions] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    async function loadPublicEvents() {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (res.ok) setEvents(data.events || []);
    }
    loadPublicEvents();
  }, []);

  async function loadEvents() {
    setStatus('Loading events...');
    const res = await fetch(`/api/events?password=${encodeURIComponent(password)}`);
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setEvents(data.events || []);
    setRole(data.role);
    setStatus('');
  }

  async function createEvent() {
    setStatus('Creating event...');
        const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        ownerPassword: password,
        maxSubmissions: maxSubmissions ? Number(maxSubmissions) : undefined,
        location: location || undefined,
        scheduledAt: scheduledAt || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setEvent(data.event);
    setName('');
    setLocation('');
    setScheduledAt('');
    loadEvents();
    setStatus('');
  }

  async function closeQr() {
    await fetch(`/api/events/${event.id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });
    setStatus('QR closed. No more submissions will be accepted.');
  }

  async function disposePhotos() {
    if (!confirm('This will permanently delete all photos for this event. Continue?')) return;
    setStatus('Disposing photos...');
    const res = await fetch(`/api/events/${event.id}/dispose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setStatus('Photos disposed.');
  }

  async function deleteWall() {
    if (!confirm('This will permanently delete this event and its wall. This cannot be undone. Continue?')) return;
    setStatus('Deleting wall...');
    const res = await fetch(`/api/events/${event.id}/delete-wall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setEvent(null);
    loadEvents();
    setStatus('Wall deleted.');
  }

  const submitUrl = event
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.id}/submit`
    : '';

  return (
    <main style={{ maxWidth: 480, margin: '40px auto', padding: 16 }}>
      <h1>Ephemera — owner dashboard</h1>

            <label>Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && password && loadEvents()}
      />
      <button onClick={loadEvents} disabled={!password}>
        Log in
      </button>

            {!event && (
        <div style={{ marginTop: 24 }}>
          <h2>{role ? 'Your events' : 'Events'}</h2>
          {events.length === 0 && <p>No events yet.</p>}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {events.map((ev) =>
              role ? (
                <li key={ev.id} style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => setEvent(ev)} style={{ flex: 1, textAlign: 'left' }}>
                    {ev.name} — {ev.status}
                    {ev.location ? ` — ${ev.location}` : ''}
                    {ev.scheduled_at ? ` — ${new Date(ev.scheduled_at).toLocaleDateString()}` : ''}
                    {' — '}
                    <span style={{ color: ev.pendingCount > 0 ? '#ffb300' : 'inherit' }}>
                      {ev.pendingCount} pending
                    </span>
                    {', '}
                    {ev.approvedCount} approved
                  </button>
                  {role === 'owner' && (
                    <a href={`/owner/event/${ev.id}/gallery`} style={{ alignSelf: 'center' }}>
                      Gallery
                    </a>
                  )}
                  <a href={`/owner/event/${ev.id}/select-style`} style={{ alignSelf: 'center' }}>
                    Wall style
                  </a>
                </li>
              ) : (
                <li key={ev.id} style={{ marginBottom: 8, padding: '8px 0', opacity: 0.85 }}>
                  {ev.name} — {ev.status}
                  {ev.location ? ` — ${ev.location}` : ''}
                  {ev.scheduled_at ? ` — ${new Date(ev.scheduled_at).toLocaleDateString()}` : ''}
                </li>
              )
            )}
          </ul>

          {role === 'owner' && (
            <div style={{ marginTop: 16 }}>
              <label>New event name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mehfil Sep 19" />
              <label>Location (optional)</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Terrace hall" />
              <label>Date (optional)</label>
              <input
                type="date"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <label>Submission cap (optional, defaults to 500)</label>
              <input
                type="number"
                value={maxSubmissions}
                onChange={(e) => setMaxSubmissions(e.target.value)}
                placeholder="500"
              />
              <button onClick={createEvent} disabled={!name}>
                Create new event (new QR)
              </button>
            </div>
          )}
        </div>
      )}

      {event && (
        <div style={{ marginTop: 24 }}>
          <button onClick={() => setEvent(null)} style={{ marginBottom: 12 }}>
            ← Back to events
          </button>
          <p>Event: {event.name}</p>
          <QRCode value={submitUrl} size={220} />
          <p>{submitUrl}</p>

          {role === 'owner' && <button onClick={closeQr}>Close QR (stop submissions)</button>}

          <p>
            Next: go to <a href={`/owner/event/${event.id}/moderate`}>the moderation screen</a> to
            swipe through submissions.
          </p>

          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <a href={`/owner/event/${event.id}/gallery`}>Gallery</a>
            <a href={`/owner/event/${event.id}/select-style`}>Wall style</a>
            <a href={`/owner/event/${event.id}/finalize`}>Finalize</a>
            <a href={`/event/${event.id}/wall`} target="_blank" rel="noopener noreferrer">
              View public wall
            </a>
          </div>

          {role === 'owner' && (
            <div style={{ marginTop: 24, borderTop: '1px solid #444', paddingTop: 16 }}>
              <p style={{ fontSize: 13, opacity: 0.8 }}>Danger zone</p>
              <button onClick={disposePhotos} style={{ marginRight: 12 }}>
                Dispose photos
              </button>
              <button onClick={deleteWall}>Delete wall</button>
            </div>
          )}
        </div>
      )}

      {status && <p>{status}</p>}
    </main>
  );
}