'use client';

import { useState } from 'react';
import QRCode from 'qrcode.react';

export default function OwnerDashboard() {
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('');

  async function createEvent() {
    setStatus('Creating event...');
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ownerPassword: password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setEvent(data.event);
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

  const submitUrl = event
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.id}/submit`
    : '';

  return (
    <main style={{ maxWidth: 480, margin: '40px auto', padding: 16 }}>
      <h1>Ephemera — owner dashboard</h1>

      <label>Owner password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      {!event && (
        <div>
          <label>Event name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mehfil Sep 19" />
          <button onClick={createEvent} disabled={!password || !name}>
            Create new event (new QR)
          </button>
        </div>
      )}

      {event && (
        <div>
          <p>Event: {event.name}</p>
          <QRCode value={submitUrl} size={220} />
          <p>{submitUrl}</p>
          <button onClick={closeQr}>Close QR (stop submissions)</button>
          <p>
            Next: go to <a href={`/owner/event/${event.id}/moderate`}>the moderation screen</a> to
            swipe through submissions.
          </p>
        </div>
      )}

      {status && <p>{status}</p>}
    </main>
  );
}