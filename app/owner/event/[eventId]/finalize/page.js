'use client';

import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { supabasePublic } from '../../../../../lib/supabaseClient';
import { computeWallPositions } from '../../../../../lib/wallLayout';

const WALL_WIDTH = 1400;
const WALL_HEIGHT = 900;

export default function FinalizePage({ params }) {
  const { eventId } = params;
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [approved, setApproved] = useState([]);
  const [chosenId, setChosenId] = useState(null);
  const [finalWallUrl, setFinalWallUrl] = useState(null);
  const [status, setStatus] = useState('');
  const wallRef = useRef(null);

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
    <main style={{ maxWidth: WALL_WIDTH + 40, margin: '40px auto', padding: 16, textAlign: 'center' }}>
      <h1>Finalize the wall</h1>
      <p style={{ fontSize: 13, opacity: 0.8 }}>
        This exports the current wall (using your selected style, or the auto style if none chosen)
        as the official final image for this event.
      </p>

      {!unlocked && (
        <div>
          <input
            type="password"
            placeholder="Owner password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && password && load()}
          />
          <button onClick={load} disabled={!password}>
            Load
          </button>
        </div>
      )}

      {unlocked && (
        <>
          <p>Style in use: {chosenId || 'auto-selected'} — {approved.length} approved photo{approved.length === 1 ? '' : 's'}</p>

          <div
            ref={wallRef}
            style={{ position: 'relative', width: WALL_WIDTH, height: WALL_HEIGHT, background: '#1a1a1a', overflow: 'hidden', margin: '0 auto' }}
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

          <button onClick={exportAndFinalize} style={{ marginTop: 16 }}>
            Export & save as final wall
          </button>

          {finalWallUrl && (
            <div style={{ marginTop: 16 }}>
              <p>Current official final wall:</p>
              <a href={finalWallUrl} download style={{ fontSize: 14 }}>
                Download final wall image
              </a>
            </div>
          )}
        </>
      )}

      {status && <p>{status}</p>}
    </main>
  );
}