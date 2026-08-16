'use client';

import { useEffect, useState } from 'react';
import { supabasePublic } from '../../../../lib/supabaseClient';
import { computeWallPositions } from '../../../../lib/wallLayout';

const WALL_WIDTH = 1400;
const WALL_HEIGHT = 900;

export default function WallPage({ params }) {
  const { eventId } = params;
  const [submissions, setSubmissions] = useState([]);

  async function loadApproved() {
    const { data } = await supabasePublic
      .from('submissions')
      .select('id, polaroid_url, caption')
      .eq('event_id', eventId)
      .eq('status', 'approved');
    setSubmissions(data || []);
  }

  useEffect(() => {
    loadApproved();

    const channel = supabasePublic
      .channel(`wall-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `event_id=eq.${eventId}` },
        () => loadApproved()
      )
      .subscribe();

    return () => supabasePublic.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const positions = computeWallPositions(
    submissions.map((s) => s.id),
    eventId,
    WALL_WIDTH,
    WALL_HEIGHT
  );

  return (
    <main
      id="wall-canvas"
      style={{
        position: 'relative',
        width: WALL_WIDTH,
        height: WALL_HEIGHT,
        margin: '0 auto',
        background: '#1a1a1a',
        overflow: 'hidden',
      }}
    >
      {submissions.map((s) => {
        const pos = positions[s.id];
        if (!pos) return null;
        return (
          <div
            key={s.id}
            className="polaroid"
            style={{
              left: pos.x,
              top: pos.y,
              transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
            }}
          >
            <img src={s.polaroid_url} alt={s.caption} />
            <div className="caption">{s.caption}</div>
          </div>
        );
      })}
    </main>
  );
}