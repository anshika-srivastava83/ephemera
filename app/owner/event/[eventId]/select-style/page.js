'use client';

import { useEffect, useState } from 'react';
import { LAYOUT_STYLES, computeWallPositions } from '../../../../../lib/wallLayout';

const PREVIEW_WIDTH = 260;
const PREVIEW_HEIGHT = 170;

export default function SelectStylePage({ params }) {
  const { eventId } = params;
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [approved, setApproved] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [status, setStatus] = useState('');

  async function loadApproved() {
    setStatus('Loading...');
    const res = await fetch(`/api/events/${eventId}/approved-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setApproved(data.submissions || []);
    setUnlocked(true);
    setStatus('');
  }

  async function confirmStyle(styleId) {
    setStatus('Saving your choice...');
    const res = await fetch(`/api/events/${eventId}/set-style`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password, chosenLayoutId: styleId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setChosen(styleId);
    setStatus('Style saved! You can now export the final wall.');
  }

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 16, textAlign: 'center' }}>
      <h1>Pick your wall style</h1>

      {!unlocked && (
        <div>
          <input
            type="password"
            placeholder="Owner password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={loadApproved} disabled={!password}>
            Load previews
          </button>
        </div>
      )}

      {unlocked && (
        <>
          <p>{approved.length} approved photo{approved.length === 1 ? '' : 's'}. Click a style to select it.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {LAYOUT_STYLES.map((style) => {
              const positions = computeWallPositions(
                approved.map((s) => s.id),
                eventId,
                PREVIEW_WIDTH,
                PREVIEW_HEIGHT,
                style.id
              );
              const isChosen = chosen === style.id;
              return (
                <div key={style.id} style={{ border: isChosen ? '3px solid limegreen' : '1px solid #444', padding: 8 }}>
                  <div
                    style={{
                      position: 'relative',
                      width: PREVIEW_WIDTH,
                      height: PREVIEW_HEIGHT,
                      background: '#1a1a1a',
                      overflow: 'hidden',
                      margin: '0 auto',
                    }}
                  >
                    {approved.map((s) => {
                      const pos = positions[s.id];
                      if (!pos) return null;
                      return (
                        <img
                          key={s.id}
                          src={s.polaroid_url}
                          alt=""
                          style={{
                            position: 'absolute',
                            left: pos.x,
                            top: pos.y,
                            width: 30,
                            transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
                          }}
                        />
                      );
                    })}
                  </div>
                  <p style={{ fontSize: 13, marginTop: 8 }}>{style.id}</p>
                  <button onClick={() => confirmStyle(style.id)}>
                    {isChosen ? '✓ Selected' : 'Choose this style'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {status && <p>{status}</p>}
    </main>
  );
}