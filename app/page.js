'use client';

import { useEffect, useState } from 'react';
import { supabasePublic } from '../lib/supabaseClient';
import { computeWallPositions } from '../lib/wallLayout';

const MINI_WALL_WIDTH = 340;
const MINI_WALL_HEIGHT = 260;

function generateEmptyFrames(count = 6) {
  const frames = [];
  for (let i = 0; i < count; i++) {
    frames.push({
      top: Math.random() * (MINI_WALL_HEIGHT - 90),
      left: Math.random() * (MINI_WALL_WIDTH - 70),
      rotate: Math.random() * 20 - 10,
    });
  }
  return frames;
}

export default function Home() {
  const [liveEvent, setLiveEvent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
  const [showClosePrompt, setShowClosePrompt] = useState(false);
  const [closePassword, setClosePassword] = useState('');
  const [closeStatus, setCloseStatus] = useState('');
  const [closedEvent, setClosedEvent] = useState(null);
  const [closedEventPassword, setClosedEventPassword] = useState('');
  const [undoStatus, setUndoStatus] = useState('');

  async function closeLiveEvent() {
    setCloseStatus('Closing...');
    const res = await fetch(`/api/events/${liveEvent.id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: closePassword }),
    });
    if (!res.ok) {
      const data = await res.json();
      setCloseStatus(`Error: ${data.error || 'could not close event'}`);
      return;
    }
    setClosedEvent(liveEvent);
    setClosedEventPassword(closePassword);
    setShowClosePrompt(false);
    setClosePassword('');
    setCloseStatus('');
    setLiveEvent(null);
  }

  async function undoClose() {
    setUndoStatus('Reopening...');
    const res = await fetch(`/api/events/${closedEvent.id}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: closedEventPassword }),
    });
    if (!res.ok) {
      const data = await res.json();
      setUndoStatus(`Error: ${data.error || 'could not reopen event'}`);
      return;
    }
    setLiveEvent(closedEvent);
    setClosedEvent(null);
    setClosedEventPassword('');
    setUndoStatus('');
  }

  function dismissClosed() {
    setClosedEvent(null);
    setClosedEventPassword('');
    setUndoStatus('');
  }

  useEffect(() => {
    async function loadLiveEvent() {
      const { data: events } = await supabasePublic
        .from('events')
        .select('id, name')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1);

      const event = events?.[0] || null;
      setLiveEvent(event);

      if (event) {
        const { data: approved } = await supabasePublic
          .from('submissions')
          .select('id, polaroid_url, caption')
          .eq('event_id', event.id)
          .eq('status', 'approved');
        setSubmissions(approved || []);
      }
      setLoading(false);
    }
    loadLiveEvent();
  }, []);

  const positions = liveEvent
    ? computeWallPositions(submissions.map((s) => s.id), liveEvent.id, MINI_WALL_WIDTH, MINI_WALL_HEIGHT)
    : {};

    const [emptyFrames] = useState(() => generateEmptyFrames());

  return (
    <main className="landing">
      {!menuOpen && (
        <button
          className="landing-menu-toggle"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
      )}

      {menuOpen && <div className="landing-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`landing-sidebar ${menuOpen ? 'landing-sidebar-open' : ''}`}>
        <div className="landing-sidebar-header">
          <h2 className="landing-logo">Ephemera</h2>
          <button className="landing-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            ✕
          </button>
        </div>
        <nav>
          <a href="/owner/dashboard" className="landing-nav-link">
            Events
          </a>
        </nav>
      </aside>

      <section className="landing-content">
        <div className="landing-wall">
          {!loading && liveEvent && submissions.length === 0 && (
            <p className="landing-wall-empty-text">
              "{liveEvent.name}" is live — no approved photos yet.
            </p>
          )}

          {!loading && liveEvent && submissions.length > 0 &&
            submissions.map((s) => {
              const pos = positions[s.id];
              if (!pos) return null;
              return (
                <img
                  key={s.id}
                  src={s.polaroid_url}
                  alt={s.caption}
                  className="landing-mini-polaroid"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
                  }}
                />
              );
            })}

          {!loading && !liveEvent &&
            emptyFrames.map((f, i) => (
              <div
                key={i}
                className="landing-empty-polaroid"
                style={{ top: f.top, left: f.left, transform: `rotate(${f.rotate}deg)` }}
              />
            ))}
        </div>

                <h1>Ephemera</h1>
        <p>
          {liveEvent
            ? `A live polaroid wall, built by everyone at ${liveEvent.name}.`
            : 'A live polaroid wall, built by everyone at the event.'}
        </p>

                {!loading && liveEvent && (
          <div className="landing-close-section">
            {!showClosePrompt ? (
              <button
                className="landing-close-toggle"
                onClick={() => setShowClosePrompt(true)}
              >
                Close this event
              </button>
            ) : (
              <div className="landing-close-form">
                <input
                  type="password"
                  className="landing-close-input"
                  placeholder="Owner password"
                  value={closePassword}
                  onChange={(e) => setClosePassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && closePassword && closeLiveEvent()}
                />
                <button onClick={closeLiveEvent} disabled={!closePassword}>
                  Confirm close
                </button>
                <button
                  className="landing-close-cancel"
                  onClick={() => {
                    setShowClosePrompt(false);
                    setClosePassword('');
                    setCloseStatus('');
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            {closeStatus && <p className="landing-close-status">{closeStatus}</p>}
          </div>
        )}

        {closedEvent && !liveEvent && (
          <div className="landing-close-section">
            <p className="landing-close-status">"{closedEvent.name}" is now closed.</p>
            <div className="landing-close-form">
              <button onClick={undoClose}>Undo</button>
              <button className="landing-close-cancel" onClick={dismissClosed}>
                Done
              </button>
            </div>
            {undoStatus && <p className="landing-close-status">{undoStatus}</p>}
          </div>
        )}
      </section>
    </main>
  );
}