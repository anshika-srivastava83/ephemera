'use client';

import { useState, useEffect } from 'react';

export default function OwnerDashboard() {
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(null);
  const [events, setEvents] = useState([]);
  const [name, setName] = useState('');
  const [maxSubmissions, setMaxSubmissions] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [status, setStatus] = useState('');
  const [passwordRevealed, setPasswordRevealed] = useState(false);

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

  async function logout() {
    setPassword('');
    setRole(null);
    setStatus('');
    const res = await fetch('/api/events');
    const data = await res.json();
    if (res.ok) setEvents(data.events || []);
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
    setName('');
    setLocation('');
    setScheduledAt('');
    loadEvents();
    setStatus('');
  }

  return (
    <main className="owner-page">
      <div className="owner-card">
        <h1 className="owner-heading">Ephemera — owner dashboard</h1>

        {!role && (
          <div className="owner-login-row">
            <div className="owner-password-wrap" style={{ position: 'relative', flex: 1 }}>
              <input
                type={password.length > 0 && passwordRevealed ? 'text' : 'password'}
                className="owner-input owner-input-block"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordRevealed(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && password && loadEvents()}
                style={{ paddingRight: 40 }}
              />
              <span
                className="owner-password-eye"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: password.length > 0 ? 'flex' : 'none',
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                }}
                onClick={() => password.length > 0 && setPasswordRevealed((r) => !r)}
              >
                {passwordRevealed ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a7fa8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a7fa8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                )}
              </span>
            </div>
            <button className="owner-button" onClick={loadEvents} disabled={!password} style={{ marginTop: 0 }}>
              Log in
            </button>
          </div>
        )}
        {role && (
          <div className="owner-login-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="owner-empty-text">Logged in as {role}</span>
            <button className="owner-button-secondary" onClick={logout}>
              Log out
            </button>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <p className="owner-subheading">{role ? 'Your events' : 'Events'}</p>
          {events.length === 0 && <p className="owner-empty-text">No events yet.</p>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {events.map((ev) =>
              role ? (
                <li key={ev.id} style={{ marginBottom: 8 }}>
                  <a
                    className="event-row event-row-clickable"
                    href={`/owner/event/${ev.id}/moderate?password=${encodeURIComponent(password)}&role=${role}&name=${encodeURIComponent(ev.name)}`}
                  >
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

        {status && <p className="owner-empty-text" style={{ marginTop: 12 }}>{status}</p>}
      </div>
    </main>
  );
}