'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toPng } from 'html-to-image';
import { supabasePublic } from '../../../../../lib/supabaseClient';
import { LAYOUT_STYLES, computeWallPositions } from '../../../../../lib/wallLayout';

const SMALL_W = 240;
const SMALL_H = 160;
const LARGE_W = 700;
const LARGE_H = 460;

export default function SelectStylePage({ params }) {
  const { eventId } = params;
  const searchParams = useSearchParams();
  const queryPassword = searchParams.get('password') || '';
  const queryRole = searchParams.get('role') || '';

  const [password, setPassword] = useState(queryPassword);
  const [unlocked, setUnlocked] = useState(false);
  const [approved, setApproved] = useState([]);
  const [chosenId, setChosenId] = useState(null);
  const [openStyle, setOpenStyle] = useState(null);
  const [status, setStatus] = useState('');
  const smallRefs = useRef({});
  const largeRef = useRef(null);

  useEffect(() => {
    if (queryPassword) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const newValue = chosenId === styleId ? null : styleId;
    const res = await fetch(`/api/events/${eventId}/set-style`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password, chosenLayoutId: newValue }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setChosenId(newValue);
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
        className={isChosen ? 'owner-button' : 'owner-button-secondary'}
        style={{ marginTop: 8, ...(isChosen ? {} : { marginTop: 8 }) }}
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
        style={{ position: 'relative', width, height, background: 'var(--owner-bg)', overflow: 'hidden', margin: '0 auto', borderRadius: 8 }}
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
    <main className="owner-page">
      <div className="owner-card" style={{ maxWidth: 960, textAlign: 'center' }}>
        <div className="mod-topbar" style={{ justifyContent: 'flex-start' }}>
          <a href={`/owner/event/${eventId}/moderate?password=${encodeURIComponent(password)}&role=${queryRole}`} className="mod-icon-btn" title="Back to moderate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </a>
          <h1 className="owner-heading" style={{ fontSize: 20, margin: 0 }}>Pick your wall style</h1>
        </div>
        <p className="owner-empty-text">Only one style can be selected at a time — pick, change your mind anytime.</p>

        {!unlocked && (
          <div>
            <input
              type="password"
              className="owner-input owner-input-block"
              placeholder="Owner password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && password && loadAll()}
            />
            <button className="owner-button" onClick={loadAll} disabled={!password}>
              Load previews
            </button>
          </div>
        )}

        {unlocked && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24, marginTop: 20 }}>
            {LAYOUT_STYLES.map((style) => (
              <div key={style.id} style={{ border: '1px solid #e5ddf5', borderRadius: 12, padding: 12, position: 'relative', background: '#f8f5fc' }}>
                <button
                  onClick={() => downloadStyle(style.id, smallRefs.current[style.id])}
                  className="mod-icon-btn"
                  style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, width: 32, height: 32 }}
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
                <p style={{ fontSize: 13, marginTop: 8, color: 'var(--owner-text)' }}>{style.id}</p>
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
              background: 'rgba(46, 36, 64, 0.85)',
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
                className="mod-icon-btn"
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}
                title="Download this preview"
              >
                ⬇
              </button>
              <WallPreview styleId={openStyle} width={LARGE_W} height={LARGE_H} forwardRef={largeRef} />
              <p style={{ marginTop: 8, color: '#fff' }}>{openStyle}</p>
              <SelectButton styleId={openStyle} />
              <div>
                <button className="owner-button-secondary" onClick={() => setOpenStyle(null)} style={{ marginTop: 12 }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {status && <p className="owner-empty-text" style={{ marginTop: 12 }}>{status}</p>}
      </div>
    </main>
  );
}