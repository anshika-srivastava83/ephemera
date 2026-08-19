'use client';

import { useEffect, useState } from 'react';
import { supabasePublic } from '../lib/supabaseClient';
import { computeWallPositions } from '../lib/wallLayout';

const MINI_WALL_WIDTH = 340;
const MINI_WALL_HEIGHT = 260;

export default function Home() {
  const [liveEvent, setLiveEvent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Fixed decorative positions for the "no live event" empty-frame state.
  const emptyFrames = [
    { top: 10, left: 30, rotate: -8 },
    { top: 60, left: 190, rotate: 6 },
    { top: 130, left: 60, rotate: 4 },
    { top: 20, left: 250, rotate: -5 },
    { top: 150, left: 220, rotate: 9 },
  ];

  return (
    <main className="landing">
      <aside className="landing-sidebar">
        <h2 className="landing-logo">Ephemera</h2>
        <nav>
          <a href="/owner/dashboard" className="landing-nav-link">
            Owner dashboard
          </a>
          <a href="/owner/dashboard" className="landing-nav-link">
            Collaborator dashboard
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
      </section>
    </main>
  );
}