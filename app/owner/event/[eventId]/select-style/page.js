'use client';

import { useState } from 'react';
import { supabasePublic } from '../../../../../lib/supabaseClient';
import { LAYOUT_STYLES, computeWallPositions } from '../../../../../lib/wallLayout';

const SMALL_W = 240;
const SMALL_H = 160;
const LARGE_W = 700;
const LARGE_H = 460;

export default function SelectStylePage({ params }) {
  const { eventId } = params;
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [approved, setApproved] = useState([]);
  const [chosenIds, setChosenIds] = useState([]);
  const [openStyle, setOpenStyle] = useState(null); // style.id currently shown large, or null
  const [status, setStatus] = useState('');

  async function loadAll() {
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

    const { data: eventData } = await supabasePublic
      .from('events')
      .select('chosen_layout_ids')
      .eq('id', eventId)
      .single();
    setChosenIds(eventData?.chosen_layout_ids || []);

    setUnlocked(true);
    setStatus('');
  }

  async function toggleStyle(styleId) {
    const res = await fetch(`/api/events/${eventId}/toggle-style`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password, styleId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setChosenIds(data.chosenLayoutIds);
  }

  function SelectButton({ styleId }) {
    const isChosen = chosenIds.includes(styleId);
    return (
      <button
        onClick={() => toggleStyle(styleId)}
        style={{
          marginTop: 8,
          padding: '6px 20px',
          borderRadius: 4,
          border: '2px solid #4caf50',
          background: isChosen ? '#4caf50' : 'transparent',
          color: isChosen ? '#fff' : '#4caf50',
          cursor: 'pointer',
        }}
      >
        {isChosen ? 'Selected ✓' : 'Select'}
      </button>
    );
  }

  function WallPreview({ styleId, width, height }) {
    const positions = computeWallPositions(
      approved.map((s) => s.id),
      eventId,
      width,
      height,
      styleId
    );
    return (
      <div style={{ position: 'relative', width, height, background: '#1a1a1a', overflow: 'hidden', margin: '0 auto' }}>
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
                width: width === LARGE_W ? 70 : 30,
                transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
              }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 16, textAlign: 'center' }}>
      <h1>Pick your wall style(s)</h1>
      <p style={{ fontSize: 13, opacity: 0.8 }}>
        Select as many as you like — you'll be able to export every selected style later.
      </p>

      {!unlocked && (
        <div>
          <input
            type="password"
            placeholder="Owner password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={loadAll} disabled={!password}>
            Load previews
          </button>
        </div>
      )}

      {unlocked && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
          {LAYOUT_STYLES.map((style) => (
            <div key={style.id} style={{ border: '1px solid #444', padding: 8 }}>
              <div style={{ cursor: 'pointer' }} onClick={() => setOpenStyle(style.id)}>
                <WallPreview styleId={style.id} width={SMALL_W} height={SMALL_H} />
              </div>
              <p style={{ fontSize: 13, marginTop: 8 }}>{style.id}</p>
              <SelectButton styleId={style.id} />
            </div>
          ))}
        </div>
      )}

      {openStyle && (
        <div
          onClick={() => setOpenStyle(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <WallPreview styleId={openStyle} width={LARGE_W} height={LARGE_H} />
            <p style={{ marginTop: 8 }}>{openStyle}</p>
            <SelectButton styleId={openStyle} />
            <div>
              <button onClick={() => setOpenStyle(null)} style={{ marginTop: 12 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {status && <p>{status}</p>}
    </main>
  );
}