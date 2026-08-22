'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toPng } from 'html-to-image';
import { supabasePublic } from '../../../../../lib/supabaseClient';
import { computeWallPositions } from '../../../../../lib/wallLayout';

const WALL_WIDTH = 1400;
const WALL_HEIGHT = 900;

export default function FinalizePage({ params }) {
  const { eventId } = params;
  const searchParams = useSearchParams();
  const queryPassword = searchParams.get('password') || '';
  const queryRole = searchParams.get('role') || '';

  const [password, setPassword] = useState(queryPassword);
  const [unlocked, setUnlocked] = useState(false);
  const [approved, setApproved] = useState([]);
  const [chosenId, setChosenId] = useState(null);
  const [finalWallUrl, setFinalWallUrl] = useState(null);
  const [status, setStatus] = useState('');
  const wallRef = useRef(null);

  useEffect(() => {
    if (queryPassword) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
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
      .select('chosen_layout_id, final_wall_image_url')
      .eq('id', eventId)
      .single();
    setChosenId(eventData?.chosen_layout_id || null);
    setFinalWallUrl(eventData?.final_wall_image_url || null);

    setUnlocked(true);
    setStatus('');
  }

  async function exportAndFinalize() {
    if (!wallRef.current) return;
    setStatus('Rendering final wall image...');
    const dataUrl = await toPng(wallRef.current, { pixelRatio: 2 });

    setStatus('Uploading...');
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${eventId}/final-wall-${Date.now()}.png`;
    const { error: uploadError } = await supabasePublic.storage.from('photos').upload(path, blob);
    if (uploadError) {
      setStatus(`Upload failed: ${uploadError.message}`);
      return;
    }
    const { data: urlData } = supabasePublic.storage.from('photos').getPublicUrl(path);

    setStatus('Saving as the official final wall...');
    const res = await fetch(`/api/events/${eventId}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerPassword: password,
        finalWallImageUrl: urlData.publicUrl,
        chosenLayoutId: chosenId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setFinalWallUrl(urlData.publicUrl);
    setStatus('Done! This is now the official final wall for this event.');
  }

  const positions = computeWallPositions(
    approved.map((s) => s.id),
    eventId,
    WALL_WIDTH,
    WALL_HEIGHT,
    chosenId
  );

  return (
    <main className="owner-page">
      <div className="owner-card" style={{ maxWidth: WALL_WIDTH + 80, textAlign: 'center' }}>
        <div className="mod-topbar" style={{ justifyContent: 'flex-start' }}>
          <a href={`/owner/event/${eventId}/moderate?password=${encodeURIComponent(password)}&role=${queryRole}`} className="mod-icon-btn" title="Back to moderate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </a>
          <h1 className="owner-heading" style={{ fontSize: 20, margin: 0 }}>Finalize the wall</h1>
        </div>
        <p className="owner-empty-text">
          This exports the current wall (using your selected style, or the auto style if none chosen)
          as the official final image for this event.
        </p>

        {!unlocked && (
          <div>
            <input
              type="password"
              className="owner-input owner-input-block"
              placeholder="Owner password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && password && load()}
            />
            <button className="owner-button" onClick={load} disabled={!password}>
              Load
            </button>
          </div>
        )}

        {unlocked && (
          <>
            <p className="owner-empty-text">
              Style in use: {chosenId || 'auto-selected'} — {approved.length} approved photo{approved.length === 1 ? '' : 's'}
            </p>

            <div
              ref={wallRef}
              style={{ position: 'relative', width: WALL_WIDTH, height: WALL_HEIGHT, background: 'var(--owner-bg)', overflow: 'hidden', margin: '0 auto', maxWidth: '100%' }}
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
                    className="polaroid"
                    style={{
                      left: pos.x,
                      top: pos.y,
                      transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
                    }}
                  />
                );
              })}
            </div>

            <button className="owner-button" onClick={exportAndFinalize} style={{ marginTop: 16 }}>
              Export & save as final wall
            </button>

            {finalWallUrl && (
              <div style={{ marginTop: 16 }}>
                <p className="owner-empty-text">Current official final wall:</p>
                <a href={finalWallUrl} download style={{ fontSize: 14, color: 'var(--owner-accent-dark)' }}>
                  Download final wall image
                </a>
              </div>
            )}
          </>
        )}

        {status && <p className="owner-empty-text" style={{ marginTop: 12 }}>{status}</p>}
      </div>
    </main>
  );
}