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
    <main className="owner-page">
      <div className="owner-card">
        <h1 className="owner-heading">Ephemera — owner dashboard</h1>

        {!event && (
          <div className="owner-login-row">
            <input
              type="password"
              className="owner-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && password && loadEvents()}
            />
            <button className="owner-button" onClick={loadEvents} disabled={!password}>
              Log in
            </button>
          </div>
        )}

        {!event && (
          <div style={{ marginTop: 24 }}>
            <p className="owner-subheading">{role ? 'Your events' : 'Events'}</p>
            {events.length === 0 && <p className="owner-empty-text">No events yet.</p>}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {events.map((ev) =>
                role ? (
                  <li key={ev.id} style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="event-row event-row-clickable" onClick={() => setEvent(ev)} style={{ flex: 1 }}>
                      <span className="event-row-name">{ev.name}</span>
                      <span className="event-row-meta">
                        {ev.status}
                        {ev.location ? ` — ${ev.location}` : ''}
                        {ev.scheduled_at ? ` — ${new Date(ev.scheduled_at).toLocaleDateString()}` : ''}
                        {' — '}
                        <span className={ev.pendingCount > 0 ? 'event-row-pending' : ''}>
                          {ev.pendingCount} pending
                        </span>
                        {', '}
                        {ev.approvedCount} approved
                      </span>
                    </button>
                    {role === 'owner' && (
                      <a className="landing-nav-link" style={{ padding: '8px 10px' }} href={`/owner/event/${ev.id}/gallery`}>
                        Gallery
                      </a>
                    )}
                    <a className="landing-nav-link" style={{ padding: '8px 10px' }} href={`/owner/event/${ev.id}/select-style`}>
                      Wall style
                    </a>
                  </li>
                ) : (
                  <li key={ev.id} className="event-row event-row-locked">
                    <span className="event-row-name">{ev.name}</span>
                    <span className="event-row-meta">
                      {ev.status}
                      {ev.location ? ` — ${ev.location}` : ''}
                      {ev.scheduled_at ? ` — ${new Date(ev.scheduled_at).toLocaleDateString()}` : ''}
                    </span>
                  </li>
                )
              )}
            </ul>

            {role === 'owner' && (
              <div style={{ marginTop: 24 }}>
                <p className="owner-subheading">Create new event</p>
                <label className="owner-label">Event name</label>
                <input
                  className="owner-input owner-input-block"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mehfil Sep 19"
                />
                <label className="owner-label">Location (optional)</label>
                <input
                  className="owner-input owner-input-block"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Terrace hall"
                />
                <label className="owner-label">Date (optional)</label>
                <input
                  type="date"
                  className="owner-input owner-input-block"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <label className="owner-label">Submission cap (optional, defaults to 500)</label>
                <input
                  type="number"
                  className="owner-input owner-input-block"
                  value={maxSubmissions}
                  onChange={(e) => setMaxSubmissions(e.target.value)}
                  placeholder="500"
                />
                <button className="owner-button" onClick={createEvent} disabled={!name}>
                  Create new event (new QR)
                </button>
              </div>
            )}
          </div>
        )}

        {event && (
          <div style={{ marginTop: 24 }}>
            <button className="owner-button-secondary" onClick={() => setEvent(null)}>
              ← Back to events
            </button>
            <p className="owner-subheading" style={{ marginTop: 20 }}>{event.name}</p>
            <div style={{ background: '#fff', display: 'inline-block', padding: 12, borderRadius: 12 }}>
              <QRCode value={submitUrl} size={220} />
            </div>
            <p className="owner-empty-text" style={{ wordBreak: 'break-all' }}>{submitUrl}</p>

            {role === 'owner' && (
              <button className="owner-button" onClick={closeQr}>
                Close QR (stop submissions)
              </button>
            )}

            <p style={{ marginTop: 16 }}>
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
              <div style={{ marginTop: 24, borderTop: '1px solid #e5ddf5', paddingTop: 16 }}>
                <p className="owner-subheading" style={{ margin: '0 0 8px' }}>Danger zone</p>
                <button className="owner-button-danger" onClick={disposePhotos} style={{ marginRight: 12 }}>
                  Dispose photos
                </button>
                <button className="owner-button-danger" onClick={deleteWall}>
                  Delete wall
                </button>
              </div>
            )}
          </div>
        )}

        {status && <p className="owner-empty-text" style={{ marginTop: 12 }}>{status}</p>}
      </div>
    </main>
  );
}