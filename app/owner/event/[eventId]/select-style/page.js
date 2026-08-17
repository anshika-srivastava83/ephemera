'use client';

import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
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
  const [chosenId, setChosenId] = useState(null);
  const [openStyle, setOpenStyle] = useState(null);
  const [status, setStatus] = useState('');
  const smallRefs = useRef({});
  const largeRef = useRef(null);

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
      .select('chosen_layout_id')
      .eq('id', eventId)
      .single();
    setChosenId(eventData?.chosen_layout_id || null);

    setUnlocked(true);
    setStatus('');
  }

  async function selectStyle(styleId) {
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
    setChosenId(styleId);
  }

  async function downloadStyle(styleId, node) {
    if (!node) return;
    setStatus('Preparing download...');
    const dataUrl = await toPng(node, { pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `ephemera-wall-${styleId}.png`;
    link.href = dataUrl;
    link.click();
    setStatus('');
  }

  function SelectButton({ styleId }) {
    const isChosen = chosenId === styleId;
    return (
      <button
        onClick={() => selectStyle(styleId)}
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

  function WallPreview({ styleId, width, height, forwardRef }) {
    const positions = computeWallPositions(
      approved.map((s) => s.id),
      eventId,
      width,
      height,
      styleId
    );
    return (
      <div
        ref={forwardRef}
        style={{ position: 'relative', width, height, background: '#1a1a1a', overflow: 'hidden', margin: '0 auto' }}
      >
        {approved.map((s) => {
          const pos = positions[s.id];
          if (!pos) return null;
          return (
            <img
              key={s.id}
              src={s.polaroid_url}
              alt=""
              crossOrigin="anonymous"
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
      <h1>Pick your wall style</h1>
      <p style={{ fontSize: 13, opacity: 0.8 }}>Only one style can be selected at a time — pick, change your mind anytime.</p>

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
            <div key={style.id} style={{ border: '1px solid #444', padding: 8, position: 'relative' }}>
              <button
                onClick={() => downloadStyle(style.id, smallRefs.current[style.id])}
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, fontSize: 16 }}
                title="Download this preview"
              >
                ⬇
              </button>
              <div style={{ cursor: 'pointer' }} onClick={() => setOpenStyle(style.id)}>
                <WallPreview
                  styleId={style.id}
                  width={SMALL_W}
                  height={SMALL_H}
                  forwardRef={(el) => (smallRefs.current[style.id] = el)}
                />
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
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
            <button
              onClick={() => downloadStyle(openStyle, largeRef.current)}
              style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, fontSize: 20 }}
              title="Download this preview"
            >
              ⬇
            </button>
            <WallPreview styleId={openStyle} width={LARGE_W} height={LARGE_H} forwardRef={largeRef} />
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